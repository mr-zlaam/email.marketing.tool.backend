import type { DatabaseClient } from "../../../db/db";
import type { _Request } from "../../../middlewares/auth.middleware";
import type { IEMAILBATCHBODY } from "../../../types/types";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import { EmailExtractor } from "../../utils/emailsExtractor.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import { userRepo } from "../../users/userRepos/user.repo";
import { emailBatchSchema } from "../../../db/schemas/emailBatchSchema";
import { emailQueue } from "../../../quenes/emailQuene.config";
import appConstant from "../../../constants/app.constant";
import { httpResponse } from "../../../utils/globalUtil/apiResponse.util";
import reshttp from "reshttp";
import fs from "node:fs";

class EmailBatchController {
  private readonly _db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this._db = db;
  }

  public createEmailBatch = asyncHandler(async (req: _Request, res) => {
    const user = await userRepo(this._db).getUserByuid(req.userFromToken?.uid || "");
    const { batchName, delayBetweenEmails, emailsPerBatch, scheduleTime, composedEmail, subject } = req.body as IEMAILBATCHBODY;

    const filePath = req.file?.path || "";
    if (!filePath) {
      return throwError(400, "No file path found");
    }

    const extractor = new EmailExtractor();
    const emails = await extractor.fromFile(filePath);

    if (emails.length === 0) {
      return throwError(400, "No valid emails found in the uploaded file");
    }

    const delayMs = parseInt(delayBetweenEmails, 10) * 1000;
    const batchCount = parseInt(emailsPerBatch, 10);

    const [insertBatch] = await this._db
      .insert(emailBatchSchema)
      .values({
        batchName,
        createdBy: user.username,
        totalEmails: emails.length,
        status: "processing",
        subject,
        composedEmail,
        delayBetweenEmails: delayMs,
        emailsPerBatch: batchCount
      })
      .returning();

    let startTime: number;
    if (scheduleTime === "NOW") {
      startTime = Date.now();
    } else {
      startTime = new Date(scheduleTime).getTime();
      if (isNaN(startTime) || startTime <= Date.now()) {
        return throwError(400, "scheduleTime is invalid or in the past");
      }
    }

    // Only enqueue emails (worker handles delay + batch control)
    emails.forEach((email) => {
      void emailQueue.add(
        appConstant.EMAIL_SEND_QUENE,
        {
          email,
          composedEmail,
          batchId: insertBatch.batchId,
          emailBatchDatabaseId: insertBatch.id,
          subject,
          batchName,
          scheduleTime
        },
        { removeOnComplete: true }
      );
    });

    fs.unlinkSync(filePath);

    httpResponse(req, res, reshttp.createdCode, "Email batch created and queued", {
      ...insertBatch,
      status: "processing",
      currentBatchSize: batchCount,
      totalEmailsInFile: emails.length
    });
  });
}

export const emailBatchController = (db: DatabaseClient) => new EmailBatchController(db);

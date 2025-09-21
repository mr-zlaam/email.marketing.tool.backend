import type { DatabaseClient } from "../../../db/db";
import type { _Request } from "../../../middlewares/auth.middleware";
import type { IEMAILBATCHBODY } from "../../../types/types";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import { EmailExtractor } from "../../utils/emailsExtractor.util";
import logger from "../../../utils/globalUtil/logger.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import path from "node:path";
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
    const { batchName, delayBetweenEmails, emailsPerBatch, scheduleTime, composedEmail } = req.body as IEMAILBATCHBODY;
    const filePath = path.resolve(req.file?.path || "");
    logger.info("current uploaded filePath ->", filePath || undefined);
    if (!filePath) {
      return throwError(400, "No file path found");
    }

    const extractor = new EmailExtractor();
    const emails = await extractor.fromFile(filePath);

    const [insertBatch] = await this._db
      .insert(emailBatchSchema)
      .values({
        batchName,
        createdBy: user.username,
        totalEmails: emails.length,
        status: "pending",
        composedEmail
      })
      .returning();

    // --- Schedule time handling ---
    let startTime: number;
    if (scheduleTime === "NOW") {
      startTime = Date.now();
    } else {
      startTime = new Date(scheduleTime).getTime();

      if (isNaN(startTime)) {
        logger.warn("scheduleTime is not valid");
        return throwError(400, "scheduleTime is not valid");
      }

      if (startTime <= Date.now()) {
        logger.warn("scheduleTime must be in the future");
        return throwError(400, "scheduleTime must be in the future");
      }
    }

    const delayMs = parseInt(delayBetweenEmails, 10) * 1000; // user sends seconds, convert to ms
    const batchCount = parseInt(emailsPerBatch, 10);
    const emailsToQueue = emails.slice(0, batchCount);

    emailsToQueue.forEach((email, index) => {
      const totalDelay = Math.max(startTime - Date.now(), 0) + index * delayMs;
      void emailQueue.add(appConstant.EMAIL_SEND_QUENE, { email, composedEmail }, { delay: totalDelay, removeOnComplete: true });
    });
    console.info("emails added to the queue: here is file path", { filePath });
    console.log("before deleting", fs.existsSync(filePath)); // before unlink
    fs.unlinkSync(filePath);
    console.log("after deleteing", fs.existsSync(filePath)); // after unlink

    httpResponse(req, res, reshttp.createdCode, "Email batch created successfully", insertBatch);
  });
}

export const emailBatchController = (db: DatabaseClient) => new EmailBatchController(db);

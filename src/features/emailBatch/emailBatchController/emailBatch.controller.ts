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
import { emailSchema } from "../../../db/schemas/emailSchema";
import { emailQueue } from "../../../quenes/emailQuene.config";
import appConstant from "../../../constants/app.constant";
import { httpResponse } from "../../../utils/globalUtil/apiResponse.util";
import reshttp from "reshttp";
import fs from "node:fs";
import { eq } from "drizzle-orm";
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

    if (emails.length === 0) {
      return throwError(400, "No valid emails found in the uploaded file");
    }

    // Create the batch record first - ONLY store emails, DO NOT queue anything yet
    const [insertBatch] = await this._db
      .insert(emailBatchSchema)
      .values({
        batchName,
        createdBy: user.username,
        totalEmails: emails.length,
        status: "pending", // Stays pending until user starts processing
        composedEmail,
        currentBatchSize: 0,
        emailsQueued: 0
      })
      .returning();

    // Store all emails in the database for future processing
    const emailRecords = emails.map((email) => ({
      batchId: insertBatch.id,
      email,
      status: "pending" as const
    }));

    await this._db.insert(emailSchema).values(emailRecords);

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

    const delayMs = parseInt(delayBetweenEmails, 10) * 1000;
    const batchCount = parseInt(emailsPerBatch, 10);

    // Queue only the first batch of emails for immediate processing
    const emailsToQueue = emails.slice(0, batchCount);

    emailsToQueue.forEach((email, index) => {
      const totalDelay = Math.max(startTime - Date.now(), 0) + index * delayMs;
      void emailQueue.add(
        appConstant.EMAIL_SEND_QUENE,
        {
          email,
          composedEmail,
          batchId: insertBatch.batchId,
          emailBatchDatabaseId: insertBatch.id
        },
        {
          delay: totalDelay,
          removeOnComplete: true
        }
      );
    });

    // Update batch to show it's now processing
    await this._db
      .update(emailBatchSchema)
      .set({
        status: "processing",
        currentBatchSize: batchCount,
        emailsQueued: emailsToQueue.length, // Only first batch is queued
        lastBatchStartedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(emailBatchSchema.id, insertBatch.id));

    logger.info(
      `Created batch ${insertBatch.batchName} with ${emails.length} total emails, queued first ${emailsToQueue.length} emails for processing`
    );

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    httpResponse(req, res, reshttp.createdCode, "Email batch created and processing started", {
      ...insertBatch,
      status: "processing",
      currentBatchSize: batchCount,
      emailsQueued: emailsToQueue.length,
      processingBatch: batchCount,
      totalEmailsInFile: emails.length
    });
  });
}

export const emailBatchController = (db: DatabaseClient) => new EmailBatchController(db);

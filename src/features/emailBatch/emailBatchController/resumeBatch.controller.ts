import type { DatabaseClient } from "../../../db/db";
import type { _Request } from "../../../middlewares/auth.middleware";
import type { IRESUMEBATCHBODY } from "../../../types/types";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import logger from "../../../utils/globalUtil/logger.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import { userRepo } from "../../users/userRepos/user.repo";
import { emailBatchSchema } from "../../../db/schemas/emailBatchSchema";
import { emailSchema } from "../../../db/schemas/emailSchema";
import { emailQueue } from "../../../quenes/emailQuene.config";
import appConstant from "../../../constants/app.constant";
import { httpResponse } from "../../../utils/globalUtil/apiResponse.util";
import reshttp from "reshttp";
import { eq, and } from "drizzle-orm";

class ResumeBatchController {
  private readonly _db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this._db = db;
  }

  public resumeBatch = asyncHandler(async (req: _Request, res) => {
    const user = await userRepo(this._db).getUserByuid(req.userFromToken?.uid || "");
    const { batchId, delayBetweenEmails, emailsPerBatch, scheduleTime } = req.body as IRESUMEBATCHBODY;

    // Find the existing batch
    const [existingBatch] = await this._db.select().from(emailBatchSchema).where(eq(emailBatchSchema.batchId, batchId));

    if (!existingBatch) {
      return throwError(404, "Email batch not found");
    }

    // Check if user owns this batch
    if (existingBatch.createdBy !== user.username) {
      return throwError(403, "You don't have permission to resume this batch");
    }

    // Check if batch is completed
    if (existingBatch.status === "completed") {
      return throwError(400, "Cannot resume a completed batch");
    }

    // Get pending emails from database for this batch
    const pendingEmails = await this._db
      .select()
      .from(emailSchema)
      .where(and(eq(emailSchema.batchId, existingBatch.id), eq(emailSchema.status, "pending")));

    if (pendingEmails.length === 0) {
      return throwError(400, "No remaining emails to process in this batch");
    }

    // Schedule time handling
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

    // Get emails to queue (limit to requested batch size)
    const emailsToQueue = pendingEmails.slice(0, Math.min(batchCount, pendingEmails.length));

    // Queue the emails with proper timing
    emailsToQueue.forEach((emailRecord, index) => {
      const totalDelay = Math.max(startTime - Date.now(), 0) + index * delayMs;
      void emailQueue.add(
        appConstant.EMAIL_SEND_QUENE,
        {
          email: emailRecord.email,
          composedEmail: existingBatch.composedEmail,
          batchId: existingBatch.batchId,
          emailBatchDatabaseId: existingBatch.id
        },
        {
          delay: totalDelay,
          removeOnComplete: true
        }
      );
    });

    // Update batch status to indicate it's being processed
    await this._db
      .update(emailBatchSchema)
      .set({
        status: "processing",
        currentBatchSize: emailsToQueue.length,
        emailsQueued: emailsToQueue.length,
        lastBatchStartedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(emailBatchSchema.batchId, batchId));

    logger.info(`Resumed batch ${batchId} with ${emailsToQueue.length} emails scheduled`);

    httpResponse(req, res, reshttp.okCode, "Email batch resumed successfully", {
      batchId,
      queuedEmailsCount: emailsToQueue.length,
      totalPendingEmails: pendingEmails.length,
      remainingAfterQueue: pendingEmails.length - emailsToQueue.length,
      newScheduleTime: new Date(startTime).toISOString()
    });
  });
}

export const resumeBatchController = (db: DatabaseClient) => new ResumeBatchController(db);

import type { DatabaseClient } from "../../../db/db";
import type { _Request } from "../../../middlewares/auth.middleware";
import type { IPAGINATION } from "../../../types/types";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import { userRepo } from "../../users/userRepos/user.repo";
import { emailBatchSchema } from "../../../db/schemas/emailBatchSchema";
import { emailSchema } from "../../../db/schemas/emailSchema";
import { emailQueue } from "../../../quenes/emailQuene.config";
import { httpResponse } from "../../../utils/globalUtil/apiResponse.util";
import reshttp from "reshttp";
import { eq, desc, count, and } from "drizzle-orm";

class GetAllEmailBatchController {
  private readonly _db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this._db = db;
  }

  public getAllEmailBatch = asyncHandler(async (req: _Request, res) => {
    const user = await userRepo(this._db).getUserByuid(req.userFromToken?.uid || "");

    // Extract pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1) {
      return throwError(400, "Page number must be greater than 0");
    }

    if (limit < 1 || limit > 100) {
      return throwError(400, "Limit must be between 1 and 100");
    }

    const offset = (page - 1) * limit;

    // Get total count for pagination
    const [{ totalCount }] = await this._db
      .select({ totalCount: count() })
      .from(emailBatchSchema)
      .where(eq(emailBatchSchema.createdBy, user.username));

    // Get paginated batches for the user
    const userBatches = await this._db
      .select()
      .from(emailBatchSchema)
      .where(eq(emailBatchSchema.createdBy, user.username))
      .orderBy(desc(emailBatchSchema.createdAt))
      .limit(limit)
      .offset(offset);

    // Get queue statistics for additional information
    const waiting = await emailQueue.getWaiting();
    const active = await emailQueue.getActive();
    const completed = await emailQueue.getCompleted();
    const failed = await emailQueue.getFailed();

    // Enhanced batch information with current queue status and accurate statistics
    const batchesWithStatus = await Promise.all(
      userBatches.map(async (batch) => {
        const totalEmails = batch.totalEmails ?? 0;

        // Get accurate counts from email records
        const [sentCount] = await this._db
          .select({ count: count() })
          .from(emailSchema)
          .where(and(eq(emailSchema.batchId, batch.id), eq(emailSchema.status, "completed")));

        const [failedCount] = await this._db
          .select({ count: count() })
          .from(emailSchema)
          .where(and(eq(emailSchema.batchId, batch.id), eq(emailSchema.status, "failed")));

        const [pendingCount] = await this._db
          .select({ count: count() })
          .from(emailSchema)
          .where(and(eq(emailSchema.batchId, batch.id), eq(emailSchema.status, "pending")));

        const emailsSent = sentCount.count;
        const emailsFailed = failedCount.count;
        const pendingEmails = pendingCount.count;

        const successRate = totalEmails > 0 ? ((emailsSent / totalEmails) * 100).toFixed(2) : "0.00";
        const failureRate = totalEmails > 0 ? ((emailsFailed / totalEmails) * 100).toFixed(2) : "0.00";
        const completionPercentage = totalEmails > 0 ? (((emailsSent + emailsFailed) / totalEmails) * 100).toFixed(2) : "0.00";

        // Determine if batch can be resumed
        const canResume = batch.status !== "completed" && pendingEmails > 0;
        const isCurrentlyProcessing = batch.status === "processing" && (waiting.length > 0 || active.length > 0);

        return {
          ...batch,
          currentQueueStatus: {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            totalInQueue: waiting.length + active.length + completed.length + failed.length
          },
          statistics: {
            successRate: `${successRate}%`,
            failureRate: `${failureRate}%`,
            pendingEmails,
            completionPercentage: `${completionPercentage}%`,
            actualEmailsSent: emailsSent,
            actualEmailsFailed: emailsFailed
          },
          batchProgress: {
            currentBatchSize: batch.currentBatchSize ?? 0,
            emailsQueued: batch.emailsQueued ?? 0,
            isProcessing: isCurrentlyProcessing,
            canResume,
            lastBatchStartedAt: batch.lastBatchStartedAt
          }
        };
      })
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const pagination: IPAGINATION = {
      currentPage: page,
      pageSize: limit,
      totalRecord: totalCount,
      hasNextPage,
      hasPreviousPage,
      totalPage: totalPages
    };

    httpResponse(req, res, reshttp.okCode, "Email batches retrieved successfully", {
      batches: batchesWithStatus,
      pagination,
      globalQueueStatus: {
        totalWaiting: waiting.length,
        totalActive: active.length,
        totalCompleted: completed.length,
        totalFailed: failed.length
      }
    });
  });

  public getEmailBatchById = asyncHandler(async (req: _Request, res) => {
    const user = await userRepo(this._db).getUserByuid(req.userFromToken?.uid || "");
    const { batchId } = req.params;

    if (!batchId) {
      return throwError(400, "Batch ID is required");
    }

    // Find the specific batch
    const [batch] = await this._db.select().from(emailBatchSchema).where(eq(emailBatchSchema.batchId, batchId));

    if (!batch) {
      return throwError(404, "Email batch not found");
    }

    // Check if user owns this batch
    if (batch.createdBy !== user.username) {
      return throwError(403, "You don't have permission to view this batch");
    }

    // Get detailed queue information for this specific batch
    const waiting = await emailQueue.getWaiting();
    const active = await emailQueue.getActive();
    const completed = await emailQueue.getCompleted();
    const failed = await emailQueue.getFailed();

    const totalEmails = batch.totalEmails ?? 0;

    // Get accurate counts from email records
    const [sentCount] = await this._db
      .select({ count: count() })
      .from(emailSchema)
      .where(and(eq(emailSchema.batchId, batch.id), eq(emailSchema.status, "completed")));

    const [failedCount] = await this._db
      .select({ count: count() })
      .from(emailSchema)
      .where(and(eq(emailSchema.batchId, batch.id), eq(emailSchema.status, "failed")));

    const [pendingCount] = await this._db
      .select({ count: count() })
      .from(emailSchema)
      .where(and(eq(emailSchema.batchId, batch.id), eq(emailSchema.status, "pending")));

    const emailsSent = sentCount.count;
    const emailsFailed = failedCount.count;
    const pendingEmails = pendingCount.count;

    const successRate = totalEmails > 0 ? ((emailsSent / totalEmails) * 100).toFixed(2) : "0.00";
    const failureRate = totalEmails > 0 ? ((emailsFailed / totalEmails) * 100).toFixed(2) : "0.00";
    const completionPercentage = totalEmails > 0 ? (((emailsSent + emailsFailed) / totalEmails) * 100).toFixed(2) : "0.00";

    const canResume = batch.status !== "completed" && pendingEmails > 0;
    const isCurrentlyProcessing = batch.status === "processing" && (waiting.length > 0 || active.length > 0);

    const detailedBatchInfo = {
      ...batch,
      queueDetails: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        totalInQueue: waiting.length + active.length + completed.length + failed.length
      },
      statistics: {
        totalEmails,
        emailsSent,
        emailsFailed,
        pendingEmails,
        successRate: `${successRate}%`,
        failureRate: `${failureRate}%`,
        completionPercentage: `${completionPercentage}%`,
        actualEmailsSent: emailsSent,
        actualEmailsFailed: emailsFailed
      },
      batchProgress: {
        currentBatchSize: batch.currentBatchSize ?? 0,
        emailsQueued: batch.emailsQueued ?? 0,
        isProcessing: isCurrentlyProcessing,
        canResume,
        lastBatchStartedAt: batch.lastBatchStartedAt
      }
    };

    httpResponse(req, res, reshttp.okCode, "Email batch details retrieved successfully", detailedBatchInfo);
  });
}

export const getAllEmailBatchController = (db: DatabaseClient) => new GetAllEmailBatchController(db);

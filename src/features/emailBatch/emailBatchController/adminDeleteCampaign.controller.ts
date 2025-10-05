import IORedis from "ioredis";
import type { DatabaseClient } from "../../../db/db";
import type { _Request } from "../../../middlewares/auth.middleware";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import { emailBatchSchema } from "../../../db/schemas/emailBatchSchema";
import { uploadBulkEmailMetaDataSchema } from "../../../db/schemas/uploadBulkEmailMetaData";
import { individualEmailSchema } from "../../../db/schemas/individualEmailSchema";
import { emailQueue } from "../../../quenes/emailQuene.config";
import { httpResponse } from "../../../utils/globalUtil/apiResponse.util";
import { redisConfig } from "../../../config/connections.config";
import reshttp from "reshttp";
import { eq } from "drizzle-orm";

class AdminDeleteCampaignController {
  private readonly _db: DatabaseClient;
  private readonly redis: IORedis;

  constructor(db: DatabaseClient) {
    this._db = db;
    this.redis = new IORedis(redisConfig);
  }

  public deleteCampaign = asyncHandler(async (req: _Request, res) => {
    const { uploadId } = req.params;

    if (!uploadId) {
      return throwError(400, "Upload ID is required");
    }

    const uploadIdNum = parseInt(uploadId, 10);
    if (isNaN(uploadIdNum)) {
      return throwError(400, "Invalid upload ID format");
    }

    // Find the upload record
    const [upload] = await this._db.select().from(uploadBulkEmailMetaDataSchema).where(eq(uploadBulkEmailMetaDataSchema.id, uploadIdNum));

    if (!upload) {
      return throwError(404, "Campaign (upload) not found");
    }

    // Find associated batch
    const [batch] = await this._db.select().from(emailBatchSchema).where(eq(emailBatchSchema.currentBatchBelongsTo, uploadIdNum));

    // Clean up Redis data if batch exists
    if (batch) {
      const batchRedisKey = `batch:${batch.batchId}`;

      console.log(`🧹 Cleaning up Redis for batch ${batch.batchId}`);

      // Delete batch-related Redis keys
      await this.redis.del(batchRedisKey);

      console.log(`✅ Redis cleanup completed for batch ${batch.batchId}`);

      // Remove all jobs from the queue for this batch
      const waiting = await emailQueue.getWaiting();
      const active = await emailQueue.getActive();
      const delayed = await emailQueue.getDelayed();

      let removedJobsCount = 0;

      // Remove waiting jobs
      for (const job of waiting) {
        if (job.data.batchId === batch.batchId) {
          await job.remove();
          removedJobsCount++;
        }
      }

      // Remove delayed jobs
      for (const job of delayed) {
        if (job.data.batchId === batch.batchId) {
          await job.remove();
          removedJobsCount++;
        }
      }

      // Log active jobs (cannot remove active jobs safely)
      const activeJobsForBatch = active.filter((job) => job.data.batchId === batch.batchId);
      if (activeJobsForBatch.length > 0) {
        console.log(`⚠️ Warning: ${activeJobsForBatch.length} active jobs for batch ${batch.batchId} - they will complete naturally`);
      }

      console.log(`🗑️ Removed ${removedJobsCount} queued jobs for batch ${batch.batchId}`);

      // Delete batch from database
      await this._db.delete(emailBatchSchema).where(eq(emailBatchSchema.id, batch.id));
      console.log(`✅ Batch ${batch.batchId} deleted from database`);
    }

    // Delete individual emails (cascade should handle this, but explicit for safety)
    const deletedEmailsResult = await this._db
      .delete(individualEmailSchema)
      .where(eq(individualEmailSchema.uploadId, uploadIdNum))
      .returning({ id: individualEmailSchema.id });

    console.log(`🗑️ Deleted ${deletedEmailsResult.length} individual email records`);

    // Delete upload metadata
    await this._db.delete(uploadBulkEmailMetaDataSchema).where(eq(uploadBulkEmailMetaDataSchema.id, uploadIdNum));

    console.log(`✅ Campaign (upload ${uploadIdNum}) completely deleted`);

    return httpResponse(req, res, reshttp.okCode, "Campaign deleted successfully", {
      deletedCampaign: {
        uploadId: uploadIdNum,
        uploadedFileName: upload.uploadedFileName,
        uploadedBy: upload.uploadedBy,
        batchId: batch?.batchId,
        batchName: batch?.batchName,
        deletedIndividualEmails: deletedEmailsResult.length,
        removedQueuedJobs: batch ? "Cleaned from queue" : "No batch found",
        redisCleanup: batch ? "Completed" : "No Redis data found"
      },
      deletedAt: new Date().toISOString()
    });
  });
}

export const adminDeleteCampaignController = (db: DatabaseClient) => new AdminDeleteCampaignController(db);

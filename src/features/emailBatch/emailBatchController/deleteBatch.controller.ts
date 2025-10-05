import type { DatabaseClient } from "../../../db/db";
import type { _Request } from "../../../middlewares/auth.middleware";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import { userRepo } from "../../users/userRepos/user.repo";
import { emailBatchSchema } from "../../../db/schemas/emailBatchSchema";
import { individualEmailSchema } from "../../../db/schemas/individualEmailSchema";
import { emailQueue } from "../../../quenes/emailQuene.config";
import { httpResponse } from "../../../utils/globalUtil/apiResponse.util";
import reshttp from "reshttp";
import { eq } from "drizzle-orm";
import IORedis from "ioredis";
import { redisConfig } from "../../../config/connections.config";

const redis = new IORedis(redisConfig);

class DeleteBatchController {
  private readonly _db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this._db = db;
  }

  public deleteBatch = asyncHandler(async (req: _Request, res) => {
    const user = await userRepo(this._db).getUserByuid(req.userFromToken?.uid || "");
    const { batchId } = req.params;

    if (!batchId) {
      return throwError(400, "Batch ID is required");
    }

    console.log(`🗑️ Attempting to delete batch: ${batchId}`);

    // Find the existing batch
    const [existingBatch] = await this._db.select().from(emailBatchSchema).where(eq(emailBatchSchema.batchId, batchId));

    if (!existingBatch) {
      return throwError(404, "Email batch not found");
    }

    // Check if user owns this batch (skip check for admins if needed)
    if (existingBatch.createdBy !== user.username && user.role !== "ADMIN") {
      return throwError(403, "You don't have permission to delete this batch");
    }

    console.log(`✅ Batch found: ${existingBatch.batchName}, Status: ${existingBatch.status}`);

    // 1️⃣ Remove all jobs from BullMQ queue for this batch
    const jobs = await emailQueue.getJobs(["waiting", "active", "delayed"]);
    const batchJobs = jobs.filter((job) => job.data.batchId === batchId);

    console.log(`📋 Found ${batchJobs.length} jobs in queue for batch ${batchId}`);

    for (const job of batchJobs) {
      await job.remove();
    }

    console.log(`✅ Removed ${batchJobs.length} jobs from BullMQ queue`);

    // 2️⃣ Clean up Redis batch configuration
    const redisKeys = [`batch:${batchId}`, `upload:${existingBatch.currentBatchBelongsTo}:activeBatch`];

    for (const key of redisKeys) {
      await redis.del(key);
    }

    console.log(`✅ Cleaned up Redis keys for batch ${batchId}`);

    // 3️⃣ Delete remaining emails from individual emails table for this upload
    const deletedEmails = await this._db
      .delete(individualEmailSchema)
      .where(eq(individualEmailSchema.uploadId, existingBatch.currentBatchBelongsTo))
      .returning();

    console.log(`✅ Deleted ${deletedEmails.length} remaining emails from database`);

    // 4️⃣ Delete the batch from database
    await this._db.delete(emailBatchSchema).where(eq(emailBatchSchema.batchId, batchId));

    console.log(`✅ Batch ${batchId} deleted successfully from database`);

    httpResponse(req, res, reshttp.okCode, "Email batch deleted successfully", {
      deletedBatchId: batchId,
      batchName: existingBatch.batchName,
      removedJobs: batchJobs.length,
      removedEmails: deletedEmails.length,
      deletedAt: new Date().toISOString()
    });
  });
}

export const deleteBatchController = (db: DatabaseClient) => new DeleteBatchController(db);

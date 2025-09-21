import type { DatabaseClient } from "../../../db/db";
import type { _Request } from "../../../middlewares/auth.middleware";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import { userRepo } from "../../users/userRepos/user.repo";
import { emailBatchSchema } from "../../../db/schemas/emailBatchSchema";
import { emailQueue } from "../../../quenes/emailQuene.config";
import { httpResponse } from "../../../utils/globalUtil/apiResponse.util";
import reshttp from "reshttp";
import { eq } from "drizzle-orm";

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

    // Find the existing batch
    const [existingBatch] = await this._db.select().from(emailBatchSchema).where(eq(emailBatchSchema.batchId, batchId));

    if (!existingBatch) {
      return throwError(404, "Email batch not found");
    }

    // Check if user owns this batch
    if (existingBatch.createdBy !== user.username) {
      return throwError(403, "You don't have permission to delete this batch");
    }

    // Check if batch has remaining jobs in queue
    const waiting = await emailQueue.getWaiting();
    const active = await emailQueue.getActive();
    const totalRemainingJobs = waiting.length + active.length;

    if (totalRemainingJobs > 0) {
      return throwError(
        400,
        `Cannot delete batch with ${totalRemainingJobs} remaining jobs in queue. Please wait for jobs to complete or manually remove them first.`
      );
    }

    // Check if batch is currently being processed
    if (existingBatch.status === "pending" && active.length > 0) {
      return throwError(400, "Cannot delete batch while jobs are actively being processed");
    }

    // Delete the batch from database
    await this._db.delete(emailBatchSchema).where(eq(emailBatchSchema.batchId, batchId));

    httpResponse(req, res, reshttp.okCode, "Email batch deleted successfully", {
      deletedBatchId: batchId,
      batchName: existingBatch.batchName,
      deletedAt: new Date().toISOString()
    });
  });
}

export const deleteBatchController = (db: DatabaseClient) => new DeleteBatchController(db);

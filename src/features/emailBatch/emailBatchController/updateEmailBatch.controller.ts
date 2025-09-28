import { setPaused } from "../../utils/batchConfigRedis.util";
import { emailBatchSchema } from "../../../db/schemas/emailBatchSchema";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import type { DatabaseClient } from "../../../db/db";
import type { _Request } from "../../../middlewares/auth.middleware";
import { httpResponse } from "../../../utils/globalUtil/apiResponse.util";
import reshttp from "reshttp";
import { eq } from "drizzle-orm";

class EmailBatchController {
  private _db: DatabaseClient;
  constructor(db: DatabaseClient) {
    this._db = db;
  }
  public pauseBatch = asyncHandler(async (req: _Request, res) => {
    const { batchId } = req.params as { batchId: string };

    await setPaused(batchId, true);
    await this._db.update(emailBatchSchema).set({ status: "paused" }).where(eq(emailBatchSchema.batchId, batchId));

    httpResponse(req, res, reshttp.okCode, `Batch ${batchId} paused`);
  });

  public resumeBatch = asyncHandler(async (req: _Request, res) => {
    const { batchId } = req.params;

    await setPaused(batchId, false);
    await this._db.update(emailBatchSchema).set({ status: "processing" }).where(eq(emailBatchSchema.batchId, batchId));

    httpResponse(req, res, reshttp.okCode, `Batch ${batchId} resumed`);
  });
}
export const emailBatchController = (db: DatabaseClient) => new EmailBatchController(db);

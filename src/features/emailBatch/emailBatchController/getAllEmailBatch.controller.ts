import type { DatabaseClient } from "../../../db/db";
import { emailBatchSchema } from "../../../db/schemas/emailBatchSchema";

class GetAllEmailBatchController {
  private readonly _db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this._db = db;
  }

  public getAllEmailBatch = async () => {
    return this._db.select().from(emailBatchSchema);
  };
}

export const getAllEmailBatchController = (db: DatabaseClient) => new GetAllEmailBatchController(db);

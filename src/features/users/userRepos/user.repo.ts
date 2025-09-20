import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../../../db/db";
import { type TUSER, userSchema } from "../../../db/schemas";
import logger from "../../../utils/globalUtil/logger.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import reshttp from "reshttp";

class UserRepository {
  private readonly _db: DatabaseClient;
  constructor(db: DatabaseClient) {
    this._db = db;
  }
  public async getUserByToken(OTP_TOKEN: string) {
    const [user] = await this._db.select().from(userSchema).where(eq(userSchema.OTP_TOKEN, OTP_TOKEN)).limit(1);
    if (!user) {
      logger.info(
        "User not found while checking user exist in db or not. because he/she sent invalid token which doesn't exist in database(getUserByToken)"
      );
      throwError(reshttp.notFoundCode, reshttp.notFoundMessage);
    }
    return user;
  }

  // ** Get user by email
  public async getUserByEmail(email: string, loggerErrorMessage?: string, orignalErrorMessage?: string): Promise<TUSER> {
    const [user] = await this._db.select().from(userSchema).where(eq(userSchema.email, email)).limit(1);
    if (!user) {
      logger.info(
        loggerErrorMessage ||
          "User not found while checking user exist in db or not. because he/she sent invalid email which doesn't exist in database(getUserByEmail)",
        { email }
      );
      throwError(reshttp.notFoundCode, orignalErrorMessage ?? reshttp.notFoundMessage);
    }
    return user;
  }
  // ** Get user by uid

  public async getUserByuid(uid: string): Promise<TUSER> {
    const [user] = await this._db.select().from(userSchema).where(eq(userSchema.uid, uid)).limit(1);
    if (!user) {
      logger.info("User not found in database  because he/she sent invalid uid which doesn't exist in database(getUserbyUid)", { uid });
      throwError(reshttp.notFoundCode, reshttp.notFoundMessage);
    }
    return user;
  }
}
export const userRepo = (db: DatabaseClient) => new UserRepository(db);

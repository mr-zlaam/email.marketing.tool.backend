import reshttp from "reshttp";
import type { DatabaseClient } from "../../../db/db";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import type { _Request } from "../../../middlewares/auth.middleware";
import { type TUSER, userSchema } from "../../../db/schemas";
import logger from "../../../utils/globalUtil/logger.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import { and, eq, not, or } from "drizzle-orm";
import { userRepo } from "../userRepos/user.repo";
import { verifyPassword } from "../../../utils/globalUtil/passwordHasher.util";
import { generateVerificationOtpToken } from "../../../utils/globalUtil/verificationTokenGenerator.util";

class UserUpdateMiddleware {
  private readonly _db: DatabaseClient;
  constructor(db: DatabaseClient) {
    this._db = db;
  }
  public checkIfUserCanUpdateBasicInfo = asyncHandler(async (req: _Request, _, next) => {
    const updateUserInformation = req.body as TUSER;
    const { uid: userIdFromBody } = req.body as { uid: string };
    const userIDFromToken = req.userFromToken?.uid as string;
    if (!userIdFromBody && !userIDFromToken) {
      logger.info("No uid have been provided by user or token");
      throwError(reshttp.badRequestCode, reshttp.badRequestMessage);
    }
    const uid = userIdFromBody || userIDFromToken || "no id";
    const { firstName, lastName } = updateUserInformation;
    const dataWhichIsGoingToBeUpdated = { firstName, lastName };
    logger.info("dataWhichIsGoingToBeUpdated", { dataWhichIsGoingToBeUpdated, uid });
    const checkIfUserExist = await this._db
      .select({ firstName: userSchema.firstName, lastName: userSchema.lastName })
      .from(userSchema)
      .where(
        and(
          not(eq(userSchema.uid, uid)),
          or(eq(userSchema.email, dataWhichIsGoingToBeUpdated.firstName), eq(userSchema.lastName, dataWhichIsGoingToBeUpdated.lastName))
        )
      )
      .limit(1);
    if (checkIfUserExist.length > 0) {
      // ** user not found with the username you've entered ** //
      logger.info("user with this user detail is already exist in database.please try other username");
      throwError(reshttp.conflictCode, reshttp.conflictMessage);
    }
    logger.info("run middleware");
    return next();
  });
  // ** Update userEmail ** //
  public checkIfUserCanUpdateEmail = asyncHandler(async (req: _Request, _, next) => {
    const { email } = req.body as { email: string; userIDFromBody: string };
    const checkIfUserCanUpdateToThisEmail = await this._db.select().from(userSchema).where(eq(userSchema.email, email)).limit(1);
    if (checkIfUserCanUpdateToThisEmail.length > 0) {
      // ** user not found with the username you've entered ** //
      logger.info("user with this email is already exist in database.please try other email", { checkIfUserCanUpdateToThisEmail, email });
      throwError(reshttp.conflictCode, reshttp.conflictMessage);
    }

    return next();
  });
  // ** check if user can update password or check if old password is correct ** //
  public checkIfUserCanUpdatePassword = asyncHandler(async (req: _Request, res, next) => {
    const { oldPassword } = req.body as { oldPassword: string };
    const uid = req.userFromToken?.uid as string;
    if (!uid) {
      logger.info("No uid have been provided by user or token");
      throwError(reshttp.badRequestCode, reshttp.badRequestMessage);
    }
    const user = await userRepo(this._db).getUserByuid(uid);
    const isPasswordValid = await verifyPassword(oldPassword, user.password, res);
    if (!isPasswordValid) {
      logger.info("old password is not correct", { oldPassword, uid });
      throwError(reshttp.badRequestCode, reshttp.badRequestMessage);
    }

    return next();
  });
  // ** check if user can update password or check if old password is correct ** //
  public checkIfUserCanForgetPassword = asyncHandler(async (req, _, next) => {
    const { email } = req.body as { email: string };
    // ** error is already handled in repo
    const { OTP_TOKEN } = generateVerificationOtpToken(6, 30, "m");
    await userRepo(this._db).getUserByEmail(email, "On password forget request user not found in database", "Invalid email");
    await this._db.update(userSchema).set({ OTP_TOKEN: OTP_TOKEN }).where(eq(userSchema.email, email));
    return next();
  });
}
export const userUpdateMiddleware = (db: DatabaseClient) => new UserUpdateMiddleware(db);

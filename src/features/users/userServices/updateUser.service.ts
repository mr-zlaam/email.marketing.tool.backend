import { eq, sql } from "drizzle-orm";
import type { Response } from "express";
import reshttp from "reshttp";
import type { DatabaseClient } from "../../../db/db";
import { userSchema, type TUSER } from "../../../db/schemas";
import logger from "../../../utils/globalUtil/logger.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import { passwordHasher } from "../../../utils/globalUtil/passwordHasher.util";
import envConfig from "../../../config/env.config";
import emailResponsesConstant from "../../../constants/emailResponses.constant";
import { gloabalMailMessage } from "../../../services/globalEmail.service";
import { userRepo } from "../userRepos/user.repo";

export const userUpdateService = (db: DatabaseClient) => {
  // ** Update user details (username,fullName,phone,companyName(optional), companyURI(optional)) using drizzle orm ** //
  const updateBasicUserInformationService = async (userInformation: TUSER) => {
    const { username, fullName, uid } = userInformation;
    const dataWhichIsGoingToBeUpdated = { username, fullName };
    const [updatedUser] = await db
      .update(userSchema)
      .set({ ...dataWhichIsGoingToBeUpdated, updatedAt: new Date() })
      .where(eq(userSchema.uid, uid))
      .returning();
    return updatedUser;
  };
  // ** update user email **//
  const updateUserEmailService = async (email: string, uid: string) => {
    const [updatedUser] = await db
      .update(userSchema)
      .set({ email, updatedAt: new Date(), isVerified: false, OTP_TOKEN_VERSION: sql`${userSchema.OTP_TOKEN_VERSION} + 1` })
      .where(eq(userSchema.uid, uid))
      .returning();
    return updatedUser;
  };
  // ** Update user password ** //
  const updateUserPasswordService = async (token: string, newPassword: string, res: Response) => {
    const user = await userRepo(db).getUserByToken(token);
    if (token !== user.OTP_TOKEN) {
      logger.info("Token is not valid or expired in reset and update password controller", { token, user });
      throwError(reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    const hashedNewPassword = (await passwordHasher(newPassword, res)) as string;
    await db.update(userSchema).set({ password: hashedNewPassword, OTP_TOKEN: null }).where(eq(userSchema.uid, user.uid)).returning();
  };
  const forgotPasswordRequestFromUserService = async (email: string) => {
    const user = await userRepo(db).getUserByEmail(email);
    const verificationUrl = `${envConfig.FRONTEND_APP_URI}/resetAndUpdateNewPassword?token=${user.OTP_TOKEN}`;
    await gloabalMailMessage(email, emailResponsesConstant.SEND_OTP_FOR_RESET_PASSWORD_REQUEST(verificationUrl, "1h"), "Password Reset Request");
  };
  const logoutUserService = (res: Response) => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
  };
  const deleteUserService = async (uid: string) => {
    if (!uid) {
      logger.info("No uid have been provided by user or token");
      throwError(reshttp.badRequestCode, reshttp.badRequestMessage);
    }
    const user = await userRepo(db).getUserByuid(uid);
    if (user.role === "ADMIN") {
      logger.info("Admin cannot be deleted");
      throwError(reshttp.badRequestCode, reshttp.badRequestMessage);
    }
    await db.delete(userSchema).where(eq(userSchema.uid, uid)).returning();
  };

  // ** utility functions returns here

  return {
    updateBasicUserInformationService,
    updateUserEmailService,
    updateUserPasswordService,
    forgotPasswordRequestFromUserService,
    logoutUserService,
    deleteUserService
  };
};

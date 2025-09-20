import { eq } from "drizzle-orm";
import type { Response } from "express";
import type { DatabaseClient } from "../../../db/db";
import type { TUSER } from "../../../db/schemas";
import { userSchema } from "../../../db/schemas";
import reshttp from "reshttp";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import logger from "../../../utils/globalUtil/logger.util";
import { generateVerificationOtpToken } from "../../../utils/globalUtil/verificationTokenGenerator.util";
import { passwordHasher, verifyPassword } from "../../../utils/globalUtil/passwordHasher.util";
import { sendVerificationEmail } from "../../../utils/quickUtil/sendVerificationEmail.util";
import { setTokensAndCookies } from "../../../utils/globalUtil/setCookies.util";
import { isAdmin } from "../userUtils/checkIfUserIsAdmin.util";
import { userRepo } from "../userRepos/user.repo";
export const usrAuthService = (db: DatabaseClient) => {
  const checkExistingUser = async ({ email }: TUSER) => {
    const existingUser = await db
      .select({ uid: userSchema.uid, isVerified: userSchema.isVerified, email: userSchema.email })
      .from(userSchema)
      .where(eq(userSchema.email, email))
      .limit(1);
    return existingUser.length > 0 ? existingUser : null;
  };

  const handleUnverifiedUser = () => {
    throwError(reshttp.conflictCode, "An unverified Account already exists with these details");
  };
  const handleVerifiedUser = () => {
    logger.info("User already exists and is verified");
    throwError(reshttp.conflictCode, "Account already exists with these details");
  };

  const handleNewUser = async (user: TUSER, res: Response) => {
    const { OTP_TOKEN } = generateVerificationOtpToken();
    const hashedPassword = (await passwordHasher(user.password, res)) as string;
    await db
      .insert(userSchema)
      .values({
        ...user,
        OTP_TOKEN: OTP_TOKEN,
        password: hashedPassword,
        role: isAdmin(user.email) ? "ADMIN" : user.role,
        isVerified: isAdmin(user.email) ? true : false
      })
      .then(async () => (isAdmin(user.email) ? null : await sendVerificationEmail(user.email, OTP_TOKEN)))
      .catch((err: unknown) => {
        logger.error("Something went wrong while creating new user", { err });
        throwError(reshttp.internalServerErrorCode, reshttp.internalServerErrorMessage);
      });
  };

  const verifyUser = async (OTP_TOKEN: string, res: Response) => {
    const user = await userRepo(db).getUserByToken(OTP_TOKEN);
    if (user.isVerified) {
      throwError(reshttp.conflictCode, "Account already verified");
    }
    const verifyOTP = user.OTP_TOKEN === OTP_TOKEN && user.OTP_TOKEN_VERSION === user.OTP_TOKEN_VERSION;
    if (!verifyOTP) {
      logger.info("Invalid OTP");
      throwError(reshttp.unauthorizedCode, `Invalid OTP`);
    }
    const [updatedUser] = await db
      .update(userSchema)
      .set({ isVerified: true, OTP_TOKEN: null, OTP_TOKEN_VERSION: user.OTP_TOKEN_VERSION + 1 })
      .where(eq(userSchema.OTP_TOKEN, OTP_TOKEN))
      .returning();

    const { accessToken, refreshToken } = setTokensAndCookies(updatedUser, res, true);

    return { accessToken, refreshToken };
  };
  const resendOTPToken = async (email: string) => {
    const { OTP_TOKEN } = generateVerificationOtpToken();
    const user = await userRepo(db).getUserByEmail(email);
    if (user.isVerified) {
      logger.error("Account already verified. This route is at risk ");
      throwError(reshttp.conflictCode, "Account already verified");
    }
    await db
      .update(userSchema)
      .set({ OTP_TOKEN: OTP_TOKEN })
      .where(eq(userSchema.email, email))
      .then(async () => await sendVerificationEmail(email, OTP_TOKEN))
      .catch((err: unknown) => {
        logger.error("Something went wrong while creating new user", { err });
        throwError(reshttp.internalServerErrorCode, reshttp.internalServerErrorMessage);
      });
  };
  // ** login user

  const loginUser = async (email: string, password: string, res: Response) => {
    const user = await userRepo(db).getUserByEmail(email);
    const isPasswordMatch = await verifyPassword(password, user.password, res);
    if (!isPasswordMatch) {
      logger.info("Incorrect password");
      throwError(reshttp.notFoundCode, "Invalid Credentials");
    }
    if (!user.isVerified) {
      logger.info("User is not verified so he/she can't login");
      throwError(reshttp.forbiddenCode, reshttp.forbiddenMessage);
    }

    const { accessToken, refreshToken } = setTokensAndCookies(user, res, true, true);
    return { accessToken, refreshToken };
  };

  return {
    checkExistingUser,
    handleNewUser,
    handleUnverifiedUser,
    handleVerifiedUser,
    verifyUser,
    resendOTPToken,
    loginUser
  };
};

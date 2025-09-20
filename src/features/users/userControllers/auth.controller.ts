import reshttp from "reshttp";
import type { DatabaseClient } from "../../../db/db";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import { usrAuthService } from "../userServices/userAuth.service";
import { userSchema, type TUSER } from "../../../db/schemas";
import { httpResponse } from "../../../utils/globalUtil/apiResponse.util";
import { isAdmin } from "../userUtils/checkIfUserIsAdmin.util";
import logger from "../../../utils/globalUtil/logger.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import { type IPAYLOAD, verifyToken } from "../../../utils/globalUtil/tokenGenerator.util";
import { eq } from "drizzle-orm";
import { setTokensAndCookies } from "../../../utils/globalUtil/setCookies.util";

class AuthController {
  private readonly _db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this._db = db;
  }

  public registerUser = asyncHandler(async (req, res) => {
    const { handleVerifiedUser, handleUnverifiedUser, handleNewUser, checkExistingUser } = usrAuthService(this._db);

    const userBody = req.body as TUSER;

    const existingUser = await checkExistingUser(userBody);

    if (existingUser && existingUser.length > 0) {
      const user = existingUser[0];

      if (user.isVerified) {
        handleVerifiedUser();
      } else {
        handleUnverifiedUser();
      }
    }

    /* if user doesn't exist at all*/

    await handleNewUser(userBody, res);

    httpResponse(
      req,
      res,
      isAdmin(userBody.email) ? reshttp.iamATeapotCode : reshttp.okCode,
      isAdmin(userBody.email) ? reshttp.iamATeapotMessage : reshttp.okMessage,
      {
        message: isAdmin(userBody.email) ? "Admin has been created successfully" : "Please check your email account for verification"
      }
    );
  });
  public registerAsModerator = asyncHandler(async (req, res) => {
    const { handleVerifiedUser, handleUnverifiedUser, checkExistingUser } = usrAuthService(this._db);
    const userBody = req.body as TUSER;

    const existingUser = await checkExistingUser(userBody);

    if (existingUser && existingUser.length > 0) {
      const user = existingUser[0];

      if (user.isVerified) {
        handleVerifiedUser();
      } else {
        handleUnverifiedUser();
      }
    }

    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, {
      message: "Your request has been forwarded to admin. Please wait until you get verified"
    });
  });
  // ** Verify User after Registeration
  public verifyUser = asyncHandler(async (req, res) => {
    const { token } = req.query as { token: string };
    if (token === null || token === undefined) return throwError(reshttp.badRequestCode, "Token is required");

    const { verifyUser } = usrAuthService(this._db);

    const { accessToken, refreshToken } = await verifyUser(token, res);

    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { message: "User has been verified", accessToken, refreshToken });
  });

  // ** Resent OTP Token incase user wasn't able to verify himself

  public resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body as { email: string };

    if (email === null || email === undefined) return throwError(reshttp.badRequestCode, "email is required");

    const { resendOTPToken } = usrAuthService(this._db);

    await resendOTPToken(email);

    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { message: "OTP has been resent successfully" });
  });

  // ** Login User

  public loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };

    if (email === null || email === undefined) return throwError(reshttp.badRequestCode, "email is required");

    if (password === null || password === undefined) return throwError(reshttp.badRequestCode, "password is required");

    const { loginUser } = usrAuthService(this._db);
    const { accessToken, refreshToken } = await loginUser(email, password, res);

    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { message: "User has been logged in", accessToken, refreshToken });
  });

  // ** Generate refresh AccessToken

  public refreshAccessToken = asyncHandler(async (req, res) => {
    const refreshToken = req.header("Authorization")?.split("Bearer ")[1];

    if (!refreshToken) return throwError(reshttp.badRequestCode, "Please provide refresh token");

    const [error, decoded] = verifyToken<IPAYLOAD>(refreshToken);

    if (error) {
      logger.error("Error while verifying token");

      return throwError(reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!decoded?.uid) {
      logger.warn("Invalid token. Not uid found in token");

      return throwError(reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const [user] = await this._db.select().from(userSchema).where(eq(userSchema.uid, decoded.uid)).limit(1);

    if (!user) {
      logger.warn("Invalid token. User not found");

      return throwError(reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (user.OTP_TOKEN_VERSION !== decoded.OTP_TOKEN_VERSION) {
      logger.error("Invalid token. tokenVersion doesn't match maybe session is expired");

      throwError(reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const { refreshToken: newRefreshToken, accessToken: newAccessToken } = setTokensAndCookies(user, res, true);

    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, {
      message: "Token has been refreshed",

      accessToken: newAccessToken,

      refreshToken: newRefreshToken
    });
  });
}
export const authController = (db: DatabaseClient) => new AuthController(db);

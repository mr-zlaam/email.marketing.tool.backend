import reshttp from "reshttp";
import type { Response } from "express";
import type { TUSER } from "../../../db/schemas";
import type { DatabaseClient } from "../../../db/db";
import { userUpdateService } from "../userServices/updateUser.service";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import type { _Request } from "../../../middlewares/auth.middleware";
import { httpResponse } from "../../../utils/globalUtil/apiResponse.util";
import logger from "../../../utils/globalUtil/logger.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import { setTokensAndCookies } from "../../../utils/globalUtil/setCookies.util";
/* 
@types of iupdae user
  */
interface IUpdateUserController {
  // eslint-disable-next-line no-unused-vars
  updateBasicUserInformationService: (_: TUSER) => Promise<TUSER>;
  // eslint-disable-next-line no-unused-vars
  updateUserEmailService: (email: string, uid: string) => Promise<TUSER>;
  // eslint-disable-next-line no-unused-vars
  updateUserPasswordService: (token: string, newPassword: string, res: Response) => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  forgotPasswordRequestFromUserService: (email: string) => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  logoutUserService: (res: Response) => void;
  // eslint-disable-next-line no-unused-vars
  deleteUserService: (uid: string) => Promise<void>;
}
class UpdateUserController {
  private readonly _db: DatabaseClient;
  private readonly _userUpdateService: IUpdateUserController;

  constructor(db: DatabaseClient) {
    this._db = db;
    this._userUpdateService = userUpdateService(this._db);
  }

  // ** Update user details ** //
  public updateBasicInfo = asyncHandler(async (req: _Request, res) => {
    // ** Update user details (username,fullName,phone,companyName(optional), companyURI(optional)) ** //
    const updateUserInformation = req.body as TUSER;
    const { uid: userIdFromBody } = req.body as { uid: string };
    const userIDFromToken = req.userFromToken?.uid as string;
    if (!userIdFromBody && !userIDFromToken) {
      logger.info("No uid have been provided by user or token");
      throwError(reshttp.badRequestCode, reshttp.badRequestMessage);
    }
    // ** validation is already handled by middleware ** //
    await this._userUpdateService.updateBasicUserInformationService(updateUserInformation);
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { message: "User information has been updated successfully!!" });
  });
  // ** Update user email **//
  public updateUserEmail = asyncHandler(async (req: _Request, res) => {
    // ** Update user email ** //
    const { email } = req.body as { email: string };
    const { uid: userIDFromBody } = req.body as { uid: string };
    const userIDFromToken = req.userFromToken?.uid as string;
    if (!userIDFromBody && !userIDFromToken) {
      logger.info("No uid have been provided by user or token");
      throwError(reshttp.badRequestCode, reshttp.badRequestMessage);
    }
    const uid = userIDFromBody || userIDFromToken || "no id";
    const updatedUser = await this._userUpdateService.updateUserEmailService(email, uid);
    const { accessToken, refreshToken } = setTokensAndCookies(updatedUser, res, true);
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { message: "User email has been updated successfully!!", accessToken, refreshToken });
  });
  // ** Update user password
  public updateUserPassword = asyncHandler(async (req: _Request, res) => {
    const uid = req.userFromToken?.uid as string;
    const { newPassword } = req.body as { newPassword: string };
    await this._userUpdateService.updateUserPasswordService(uid, newPassword, res);
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { message: "User password has been updated successfully!!" });
  });
  // ** forgot password request **//
  public forgotPasswordRequestFromUser = asyncHandler(async (req: _Request, res) => {
    const { email } = req.body as { email: string };
    await this._userUpdateService.forgotPasswordRequestFromUserService(email);
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { message: "Please check your email to reset your password!!" });
  });
  // ** Reset  and update new password **//
  public resetAndUpdateNewPassword = asyncHandler(async (req, res) => {
    const { newPassword } = req.body as { newPassword: string };
    const { token } = req.query as { token: string };
    await this._userUpdateService.updateUserPasswordService(token, newPassword, res);
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { message: "User password has been updated successfully!!" });
  });
  // ** Logout User **//
  public logoutUser = (req: _Request, res: Response) => {
    this._userUpdateService.logoutUserService(res);
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { message: "User has been logged out successfully!!" });
  };
  // // ** Delete User **//
  public deleteUser = asyncHandler(async (req: _Request, res) => {
    const { uid } = req.params;
    await this._userUpdateService.deleteUserService(uid);
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { message: "User has been deleted successfully!!" });
  });
}
export const updateUserController = (db: DatabaseClient) => new UpdateUserController(db);

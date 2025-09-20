import { Router } from "express";
import {
  forgetPasswordSchemaZ,
  resetPasswordSchemaZ,
  updateUserEmailSchemaZ,
  updateUserPasswordSchemaZ,
  updateUserSchemaZ
} from "../userValidation/updateUser.validation";
import { validator } from "../../../middlewares/validation.middleware";
import { database } from "../../../db/db";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { userUpdateMiddleware } from "../userMiddlewares/user.middleware";
import rateLimiterMiddleware from "../../../middlewares/ratelimiter.middleware";
import { updateUserController } from "../userControllers/updateUser.controller";

// ** classess
export const updateUserRouter: Router = Router();
// ** Update user details (username,fullName,phone,companyName(optional), companyURI(optional)) ** //
updateUserRouter.route("/updateBasicInfo").patch(
  validator(updateUserSchemaZ),
  // Rate limiter will double the time every time user  will hit the limit
  authMiddleware(database.db).checkToken,
  userUpdateMiddleware(database.db).checkIfUserCanUpdateBasicInfo,
  async (req, res, next) => {
    await rateLimiterMiddleware.handle(req, res, next, 1, undefined, 1, 86400);
  },
  updateUserController(database.db).updateBasicInfo
);
// ** Update user email ** //
updateUserRouter.route("/updateUserEmail").patch(
  validator(updateUserEmailSchemaZ),
  // Rate limiter will double the time every time user  will hit the limit
  authMiddleware(database.db).checkToken,
  userUpdateMiddleware(database.db).checkIfUserCanUpdateEmail,
  async (req, res, next) => {
    await rateLimiterMiddleware.handle(req, res, next, 1, undefined, 1, 86400);
  },
  updateUserController(database.db).updateUserEmail
);
// ** Update user email ** //
updateUserRouter.route("/updateUserPassword").patch(
  // Rate limiter will double the time every time user  will hit the limit
  validator(updateUserPasswordSchemaZ),
  authMiddleware(database.db).checkToken,
  userUpdateMiddleware(database.db).checkIfUserCanUpdatePassword,
  async (req, res, next) => {
    await rateLimiterMiddleware.handle(req, res, next, 1, undefined, 1, 86400);
  },
  updateUserController(database.db).updateUserPassword
);
updateUserRouter.route("/forgetUserPasswordRequest").patch(
  validator(forgetPasswordSchemaZ),
  // Rate limiter will double the time every time user  will hit the limit
  userUpdateMiddleware(database.db).checkIfUserCanForgetPassword,
  async (req, res, next) => {
    await rateLimiterMiddleware.handle(req, res, next, 1, undefined, 1, 86400);
  },
  updateUserController(database.db).forgotPasswordRequestFromUser
);
// ** Reset  and update password ** //
updateUserRouter
  .route("/resetAndUpdateNewPassword")
  .patch(validator(resetPasswordSchemaZ), updateUserController(database.db).resetAndUpdateNewPassword);
// ** Delete User **//
updateUserRouter
  .route("/deleteUser/:uid")
  .delete(authMiddleware(database.db).checkToken, authMiddleware(database.db).checkIfUserIsAdmin, updateUserController(database.db).deleteUser);
// ** Logout User **//
updateUserRouter.route("/logoutUser").post(authMiddleware(database.db).checkToken, updateUserController(database.db).logoutUser);

import { Router } from "express";
import { validator } from "../../../middlewares/validation.middleware";
import { loginUserSchema, registerUserSchemaZ, resendOTPSchemaZ } from "../userValidation/auth.validation";
import { authController } from "../userControllers/auth.controller";
import { database } from "../../../db/db";
import rateLimiterMiddleware from "../../../middlewares/ratelimiter.middleware";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import getUserController from "../userControllers/getUser.controller";
export const userRouter: Router = Router();
// ** Register User
userRouter.route("/registerUser").post(validator(registerUserSchemaZ), authController(database.db).registerUser);
userRouter
  .route("/adminCreatesTheUser")
  .post(
    validator(registerUserSchemaZ),
    authMiddleware(database.db).checkToken,
    authMiddleware(database.db).checkIfUserIsAdmin,
    authController(database.db).adminCreatesTheUser
  );
// ** Verify User
userRouter.route("/verifyUser").patch(authController(database.db).verifyUser);
// ** Resend OTP
userRouter.route("/resendOTP").post(
  validator(resendOTPSchemaZ),
  // Rate limiter that user can get only 1 otp per 2 minutes
  async (req, res, next) => {
    await rateLimiterMiddleware.handle(req, res, next, 1, undefined, 1, 120);
  },
  authController(database.db).resendOTP
);

userRouter.route("/loginUser").post(
  validator(loginUserSchema),
  // Rate limiter that user can get only 1 otp per 2 minutes
  async (req, res, next) => {
    await rateLimiterMiddleware.handle(req, res, next, 1, undefined, 5, 120);
  },
  authController(database.db).loginUser
);
// ** Refresh access Toke
userRouter.route("/refreshAccessToken").post(authController(database.db).refreshAccessToken);

// ** Register Moderator
userRouter.route("/registerAsModerator").post(validator(registerUserSchemaZ), authController(database.db).registerAsModerator);

// ** Verify Moderator
userRouter
  .route("/verifyModerator/:username")
  .patch(/*Verification is done in controller*/ authMiddleware(database.db).checkToken, authMiddleware(database.db).checkIfUserIsAdmin);
// ** Get All User
userRouter
  .route("/getAllUser")
  .get(authMiddleware(database.db).checkToken, authMiddleware(database.db).checkIfUserIsAdmin, getUserController(database.db).getAllUser);
// ** Get Current User: user specific only logged in user can access this
userRouter.route("/getCurrentUser").get(authMiddleware(database.db).checkToken, getUserController(database.db).getCurrentUser);
// ** Get Single User admin specific
userRouter
  .route("/getSingleUser/:username")
  .get(authMiddleware(database.db).checkToken, authMiddleware(database.db).checkIfUserIsAdmin, getUserController(database.db).getSingleUser);

import { Router } from "express";
import { userRouter } from "../features/users/userRoutes/user.routes";
import { updateUserRouter } from "../features/users/userRoutes/updateUser.router";
import { emailBatchRouter } from "../features/emailBatch/emailBatchRoutes/emailBatch.router";

export const defaultRouter: Router = Router();

// *** User
defaultRouter.use("/user", userRouter);
defaultRouter.use("/user", updateUserRouter);
defaultRouter.use("/emailBatch", emailBatchRouter);

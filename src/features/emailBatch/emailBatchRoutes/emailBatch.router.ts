import { Router } from "express";
import { validator } from "../../../middlewares/validation.middleware";
import { database } from "../../../db/db";
import { emailBatchValidationZ } from "../emailBatchValidation/emailBatch.validation";
import { emailBatchController } from "../emailBatchController/emailBatch.controller";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { uploadSingleFile } from "../../../middlewares/multer.middleware";
export const emailBatchRouter: Router = Router();
// ** Register User
emailBatchRouter
  .route("/createEmailBatch")
  .post(
    authMiddleware(database.db).checkToken,
    uploadSingleFile,
    validator(emailBatchValidationZ),
    emailBatchController(database.db).createEmailBatch
  );

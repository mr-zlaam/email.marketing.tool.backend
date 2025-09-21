import { Router } from "express";
import { validator } from "../../../middlewares/validation.middleware";
import { database } from "../../../db/db";
import { emailBatchValidationZ, resumeBatchValidationZ } from "../emailBatchValidation/emailBatch.validation";
import { emailBatchController } from "../emailBatchController/emailBatch.controller";
import { resumeBatchController } from "../emailBatchController/resumeBatch.controller";
import { getAllEmailBatchController } from "../emailBatchController/getAllEmailBatch.controller";
import { deleteBatchController } from "../emailBatchController/deleteBatch.controller";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { uploadSingleFile } from "../../../middlewares/multer.middleware";
export const emailBatchRouter: Router = Router();

// ** Create Email Batch
emailBatchRouter
  .route("/createEmailBatch")
  .post(
    authMiddleware(database.db).checkToken,
    uploadSingleFile,
    validator(emailBatchValidationZ),
    emailBatchController(database.db).createEmailBatch
  );

// ** Resume Email Batch
emailBatchRouter
  .route("/resumeBatch")
  .post(authMiddleware(database.db).checkToken, validator(resumeBatchValidationZ), resumeBatchController(database.db).resumeBatch);

// ** Get All Email Batches
emailBatchRouter.route("/getAllBatches").get(authMiddleware(database.db).checkToken, getAllEmailBatchController(database.db).getAllEmailBatch);

// ** Get Email Batch By ID
emailBatchRouter.route("/getBatch/:batchId").get(authMiddleware(database.db).checkToken, getAllEmailBatchController(database.db).getEmailBatchById);

// ** Delete Email Batch
emailBatchRouter.route("/deleteBatch/:batchId").delete(authMiddleware(database.db).checkToken, deleteBatchController(database.db).deleteBatch);

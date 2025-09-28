import { Router } from "express";
import { validator } from "../../../middlewares/validation.middleware";
import { database } from "../../../db/db";
import { emailBatchValidationZ } from "../emailBatchValidation/emailBatch.validation";
import { emailBatchController } from "../emailBatchController/createEmailBatch.controller";
import { getAllEmailBatchController } from "../emailBatchController/getAllEmailBatch.controller";
import { deleteBatchController } from "../emailBatchController/deleteBatch.controller";
import { getUploadsWithBatchesController } from "../emailBatchController/getUploadsWithBatches.controller";
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

// ** Get All Email Batches
emailBatchRouter.route("/getAllBatches").get(authMiddleware(database.db).checkToken, getAllEmailBatchController(database.db).getAllEmailBatch);

// ** Get Uploads with Batches (Paginated)
emailBatchRouter
  .route("/getUploadsWithBatches")
  .get(authMiddleware(database.db).checkToken, getUploadsWithBatchesController(database.db).getUploadsWithBatches);

// ** Get Email Batch By ID

// ** Delete Email Batch
emailBatchRouter.route("/deleteBatch/:batchId").delete(authMiddleware(database.db).checkToken, deleteBatchController(database.db).deleteBatch);

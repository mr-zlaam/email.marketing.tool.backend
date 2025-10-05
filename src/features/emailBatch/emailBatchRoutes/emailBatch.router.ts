import { Router } from "express";
import { validator } from "../../../middlewares/validation.middleware";
import { database } from "../../../db/db";
import { emailBatchValidationZ } from "../emailBatchValidation/emailBatch.validation";
import { emailBatchController } from "../emailBatchController/createEmailBatch.controller";
import { deleteBatchController } from "../emailBatchController/deleteBatch.controller";
import { adminDeleteCampaignController } from "../emailBatchController/adminDeleteCampaign.controller";
import { getUploadsWithBatchesController } from "../emailBatchController/getUploadsWithBatches.controller";
import { emailBatchController as updateEmailBatchController } from "../emailBatchController/updateEmailBatch.controller";
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

// ** Get Uploads with Batches (Paginated)
emailBatchRouter
  .route("/getUploadsWithBatches")
  .get(authMiddleware(database.db).checkToken, getUploadsWithBatchesController(database.db).getUploadsWithBatches);

// ** Get Email Batch By ID

// ** Delete Email Batch
emailBatchRouter.route("/deleteBatch/:batchId").delete(authMiddleware(database.db).checkToken, deleteBatchController(database.db).deleteBatch);

// ** Pause Email Batch
emailBatchRouter.route("/pauseBatch/:batchId").patch(authMiddleware(database.db).checkToken, updateEmailBatchController(database.db).pauseBatch);

// ** Resume Email Batch
emailBatchRouter.route("/resumeBatch/:batchId").patch(authMiddleware(database.db).checkToken, updateEmailBatchController(database.db).resumeBatch);

// ** Admin Delete Campaign (Upload + Batch + Individual Emails + Redis)
emailBatchRouter
  .route("/admin/deleteCampaign/:uploadId")
  .delete(
    authMiddleware(database.db).checkToken,
    authMiddleware(database.db).checkIfUserIsAdmin,
    adminDeleteCampaignController(database.db).deleteCampaign
  );

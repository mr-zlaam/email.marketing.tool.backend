import type { DatabaseClient } from "../../../db/db";
import type { _Request } from "../../../middlewares/auth.middleware";
import type { IEMAILBATCHBODY } from "../../../types/types";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import { EmailExtractor } from "../../utils/emailsExtractor.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import { userRepo } from "../../users/userRepos/user.repo";
import { emailBatchSchema } from "../../../db/schemas/emailBatchSchema";
import { emailQueue } from "../../../quenes/emailQuene.config";
import appConstant from "../../../constants/app.constant";
import { httpResponse } from "../../../utils/globalUtil/apiResponse.util";
import reshttp from "reshttp";
import fs from "node:fs";
import { initBatchConfig } from "../../utils/batchConfigRedis.util";
import { uploadBulkEmailMetaDataSchema } from "../../../db/schemas/uploadBulkEmailMetaData";
import { eq, and } from "drizzle-orm";
import Redis from "ioredis";
import { redisConfig } from "../../../config/connections.config";

const redis = new Redis(redisConfig);

class EmailBatchController {
  private readonly _db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this._db = db;
  }

  public createEmailBatch = asyncHandler(async (req: _Request, res) => {
    const user = await userRepo(this._db).getUserByuid(req.userFromToken?.uid || "");
    const { batchName, delayBetweenEmails, emailsPerBatch, scheduleTime, composedEmail, subject, uploadId } = req.body as IEMAILBATCHBODY;

    let uploadRecordId: number;
    let totalEmailsInUpload: number;

    // ---------- 1️⃣ Handle file upload ----------
    const filePath = req.file?.path || "";
    if (filePath) {
      const extractor = new EmailExtractor();
      const emails = await extractor.fromFile(filePath);

      if (emails.length === 0) {
        return throwError(400, "No valid emails found in the uploaded file");
      }

      const fileName = filePath.split("/").pop() || "";

      const [insertMetaData] = await this._db
        .insert(uploadBulkEmailMetaDataSchema)
        .values({
          uploadedBy: user.username,
          uploadedFileName: fileName,
          totalEmails: emails.length,
          status: "processing"
        })
        .returning({ id: uploadBulkEmailMetaDataSchema.id });

      uploadRecordId = insertMetaData.id;
      totalEmailsInUpload = emails.length;

      const delayMs = parseInt(delayBetweenEmails, 10) * 1000;
      const batchCount = parseInt(emailsPerBatch, 10);

      const [insertBatch] = await this._db
        .insert(emailBatchSchema)
        .values({
          currentBatchBelongsTo: uploadRecordId,
          batchName,
          createdBy: user.username,
          totalEmails: emails.length,
          status: "processing",
          subject,
          composedEmail,
          delayBetweenEmails: delayMs,
          emailsPerBatch: batchCount
        })
        .returning();

      await initBatchConfig(insertBatch.batchId, {
        delay: delayMs,
        batchSize: batchCount,
        processedCount: 0,
        totalEmails: emails.length
      });

      // Mark this batch as active in Redis
      await redis.set(`upload:${uploadRecordId}:activeBatch`, insertBatch.batchId.toString());

      emails.forEach((email) => {
        void emailQueue.add(
          appConstant.EMAIL_SEND_QUENE,
          {
            email,
            composedEmail,
            batchId: insertBatch.batchId,
            emailBatchDatabaseId: insertBatch.id,
            uploadId: uploadRecordId,
            subject,
            batchName,
            scheduleTime
          },
          { removeOnComplete: true }
        );
      });
      await this._db
        .update(uploadBulkEmailMetaDataSchema)
        .set({ totalEmailSentToQueue: emails.length })
        .where(eq(uploadBulkEmailMetaDataSchema.id, uploadRecordId));
      fs.unlinkSync(filePath);

      return httpResponse(req, res, reshttp.createdCode, "New email batch created for uploaded file", {
        batch: insertBatch,
        uploadId: uploadRecordId,
        totalEmails: emails.length,
        status: "processing"
      });
    }

    // ---------- 2️⃣ Handle existing uploadId ----------
    if (uploadId) {
      const [existingUpload] = await this._db
        .select()
        .from(uploadBulkEmailMetaDataSchema)
        .where(eq(uploadBulkEmailMetaDataSchema.id, Number(uploadId)));

      if (!existingUpload) {
        return throwError(404, "Upload ID not found");
      }

      // Check if there is already an active batch
      const [activeBatch] = await this._db
        .select()
        .from(emailBatchSchema)
        .where(and(eq(emailBatchSchema.currentBatchBelongsTo, existingUpload.id), eq(emailBatchSchema.status, "processing")));

      if (activeBatch) {
        return throwError(400, "An active batch already exists for this upload. Please wait for it to finish.");
      }

      // Remaining emails
      const remainingEmails = Number(existingUpload.totalEmails) - Number(existingUpload.totalEmailSentToQueue || 0);
      if (remainingEmails <= 0) {
        return throwError(400, "All emails under this upload are already processed.");
      }

      uploadRecordId = existingUpload.id;
      totalEmailsInUpload = remainingEmails;

      const delayMs = parseInt(delayBetweenEmails, 10) * 1000;
      const batchCount = parseInt(emailsPerBatch, 10);

      const [insertBatch] = await this._db
        .insert(emailBatchSchema)
        .values({
          currentBatchBelongsTo: uploadRecordId,
          batchName,
          createdBy: user.username,
          totalEmails: remainingEmails,
          status: "processing",
          subject,
          composedEmail,
          delayBetweenEmails: delayMs,
          emailsPerBatch: batchCount
        })
        .returning();

      await initBatchConfig(insertBatch.batchId, {
        delay: delayMs,
        batchSize: batchCount,
        processedCount: 0,
        totalEmails: remainingEmails
      });

      // Mark this batch as active in Redis
      await redis.set(`upload:${uploadRecordId}:activeBatch`, insertBatch.batchId.toString());

      return httpResponse(req, res, reshttp.createdCode, "New batch created under existing upload", {
        batch: insertBatch,
        uploadId: uploadRecordId,
        totalEmails: totalEmailsInUpload,
        status: "processing"
      });
    }

    return throwError(400, "Must provide either file upload or uploadId");
  });
}

export const emailBatchController = (db: DatabaseClient) => new EmailBatchController(db);

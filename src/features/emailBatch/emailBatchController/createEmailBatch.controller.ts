import type { DatabaseClient } from "../../../db/db";
import type { _Request } from "../../../middlewares/auth.middleware";
import type { IEMAILBATCHBODY } from "../../../types/types";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import { EmailExtractor } from "../../utils/emailsExtractor.util";
import { fileFormatValidator } from "../../utils/fileFormatValidator.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import { userRepo } from "../../users/userRepos/user.repo";
import { emailBatchSchema } from "../../../db/schemas/emailBatchSchema";
import { httpResponse } from "../../../utils/globalUtil/apiResponse.util";
import { emailQueue } from "../../../quenes/emailQuene.config";
import appConstant from "../../../constants/app.constant";
import reshttp from "reshttp";
import fs from "node:fs";
import path from "node:path";
import { uploadBulkEmailMetaDataSchema } from "../../../db/schemas/uploadBulkEmailMetaData";
import { individualEmailSchema } from "../../../db/schemas/individualEmailSchema";
import { eq, sql } from "drizzle-orm";

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
      const fileName = filePath.split("/").pop() || "";
      const fileExtension = path.extname(fileName).toLowerCase();

      console.log(`Processing uploaded file: ${fileName}`);

      // Validate file format
      const validationResult = await fileFormatValidator.validateFileFormat(filePath, fileExtension);

      if (!validationResult.isValid) {
        fs.unlinkSync(filePath); // Clean up uploaded file
        return throwError(400, validationResult.error || "Invalid file format");
      }

      console.log(`File validation passed. Found columns: ${JSON.stringify(validationResult.foundColumns)}`);

      const extractor = new EmailExtractor();
      const emailData = await extractor.fromFile(filePath);

      if (emailData.length === 0) {
        fs.unlinkSync(filePath); // Clean up uploaded file
        return throwError(400, "No valid emails found in the uploaded file");
      }

      const delayMs = parseInt(delayBetweenEmails, 10) * 1000;
      const batchCount = parseInt(emailsPerBatch, 10);

      // Create upload record
      const [insertMetaData] = await this._db
        .insert(uploadBulkEmailMetaDataSchema)
        .values({
          uploadedBy: user.username,
          uploadedFileName: fileName,
          totalEmails: emailData.length,
          status: "processing",
          metaData: {}
        })
        .returning({ id: uploadBulkEmailMetaDataSchema.id });

      uploadRecordId = insertMetaData.id;

      // Insert individual emails into database with ON CONFLICT DO NOTHING for duplicates
      const emailRecords = emailData.map((data) => ({
        email: data.email,
        name: data.name || null,
        uploadId: uploadRecordId
      }));

      await this._db.insert(individualEmailSchema).values(emailRecords).onConflictDoNothing();

      // Count actual inserted emails (after deduplication)
      const [{ count: actualEmailCount }] = await this._db
        .select({ count: sql<number>`count(*)` })
        .from(individualEmailSchema)
        .where(eq(individualEmailSchema.uploadId, uploadRecordId));

      // Update upload with actual email count
      await this._db
        .update(uploadBulkEmailMetaDataSchema)
        .set({ totalEmails: actualEmailCount })
        .where(eq(uploadBulkEmailMetaDataSchema.id, uploadRecordId));

      totalEmailsInUpload = actualEmailCount;

      // Create batch
      const [insertBatch] = await this._db
        .insert(emailBatchSchema)
        .values({
          currentBatchBelongsTo: uploadRecordId,
          batchName,
          createdBy: user.username,
          totalEmails: Math.min(batchCount, actualEmailCount),
          status: "processing",
          subject,
          composedEmail,
          delayBetweenEmails: delayMs,
          emailsPerBatch: batchCount
        })
        .returning();

      // Queue first batch of emails
      await this.queueNextBatch(uploadRecordId, insertBatch.batchId, insertBatch.id, batchCount, {
        subject,
        composedEmail,
        batchName,
        scheduleTime: scheduleTime?.toString() || "NOW"
      });

      fs.unlinkSync(filePath);

      return httpResponse(req, res, reshttp.createdCode, "New email batch created for uploaded file", {
        batch: insertBatch,
        uploadId: uploadRecordId,
        totalEmails: actualEmailCount,
        status: "processing",
        operation: "created"
      });
    }

    // ---------- 2️⃣ Handle existing uploadId ----------
    if (uploadId) {
      console.log(`📁 Creating/resuming batch for existing uploadId: ${uploadId}`);

      const [existingUpload] = await this._db
        .select()
        .from(uploadBulkEmailMetaDataSchema)
        .where(eq(uploadBulkEmailMetaDataSchema.id, Number(uploadId)));

      if (!existingUpload) {
        console.log(`❌ Upload ID ${uploadId} not found`);
        return throwError(404, "Upload ID not found");
      }

      if (existingUpload.status === "completed") {
        console.log(`🚫 Upload ${uploadId} is completed - cannot create new batches`);
        return throwError(400, "This upload has been completed and cannot be used to create new batches");
      }

      // Check remaining emails in individual emails table
      const [{ count: remainingEmails }] = await this._db
        .select({ count: sql<number>`count(*)` })
        .from(individualEmailSchema)
        .where(eq(individualEmailSchema.uploadId, Number(uploadId)));

      console.log(`📧 Remaining pending emails in upload ${uploadId}: ${remainingEmails}`);

      if (remainingEmails <= 0) {
        console.log(`✅ All emails in upload ${uploadId} have been processed`);
        return throwError(400, "All emails under this upload are already processed.");
      }

      uploadRecordId = existingUpload.id;
      totalEmailsInUpload = remainingEmails;

      const delayMs = parseInt(delayBetweenEmails, 10) * 1000;
      const batchCount = parseInt(emailsPerBatch, 10);

      // Check if there's an existing batch
      const [existingBatch] = await this._db.select().from(emailBatchSchema).where(eq(emailBatchSchema.currentBatchBelongsTo, existingUpload.id));

      let batchResult;
      let operationType: "created" | "resumed";

      if (existingBatch) {
        // RESUME EXISTING BATCH
        console.log(`🔄 Resuming existing batch ${existingBatch.batchId} with new settings`);

        if (existingBatch.status === "processing") {
          console.log(`⚠️ Batch ${existingBatch.batchId} is currently active - cannot update while processing`);
          return throwError(400, "Batch is currently processing. Please wait for it to pause before updating settings.");
        }

        // Update existing batch with new settings
        const [updatedBatch] = await this._db
          .update(emailBatchSchema)
          .set({
            batchName,
            subject,
            composedEmail,
            delayBetweenEmails: delayMs,
            emailsPerBatch: batchCount,
            totalEmails: Math.min(batchCount, remainingEmails),
            status: "processing",
            updatedAt: new Date()
          })
          .where(eq(emailBatchSchema.id, existingBatch.id))
          .returning();

        console.log(`Batch ${existingBatch.batchId} updated successfully`);

        // Queue next batch of emails
        await this.queueNextBatch(uploadRecordId, existingBatch.batchId, existingBatch.id, batchCount, {
          subject,
          composedEmail,
          batchName,
          scheduleTime: scheduleTime?.toString() || "NOW"
        });

        batchResult = updatedBatch;
        operationType = "resumed";
      } else {
        // CREATE NEW BATCH
        console.log(`⚙️ Creating new batch with config: delay=${delayMs}ms, batchSize=${batchCount}, remainingEmails=${remainingEmails}`);

        const [insertBatch] = await this._db
          .insert(emailBatchSchema)
          .values({
            currentBatchBelongsTo: uploadRecordId,
            batchName,
            createdBy: user.username,
            totalEmails: Math.min(batchCount, remainingEmails),
            status: "processing",
            subject,
            composedEmail,
            delayBetweenEmails: delayMs,
            emailsPerBatch: batchCount
          })
          .returning();

        console.log(`New batch created with ID: ${insertBatch.id}, batchId: ${insertBatch.batchId}`);

        // Queue first batch of emails
        await this.queueNextBatch(uploadRecordId, insertBatch.batchId, insertBatch.id, batchCount, {
          subject,
          composedEmail,
          batchName,
          scheduleTime: scheduleTime?.toString() || "NOW"
        });

        batchResult = insertBatch;
        operationType = "created";
      }

      console.log(`Batch ${operationType} completed successfully for upload ${uploadId}`);

      return httpResponse(req, res, reshttp.createdCode, `Batch ${operationType} under existing upload`, {
        batch: batchResult,
        uploadId: uploadRecordId,
        totalEmails: totalEmailsInUpload,
        status: "processing",
        operation: operationType
      });
    }

    return throwError(400, "Must provide either file upload or uploadId");
  });

  private queueNextBatch = async (
    uploadId: number,
    batchId: string,
    batchDbId: number,
    batchSize: number,
    emailData: {
      subject: string;
      composedEmail: string;
      batchName: string;
      scheduleTime: string;
    }
  ) => {
    // Get next batch of emails to process
    const emailsToQueue = await this._db.select().from(individualEmailSchema).where(eq(individualEmailSchema.uploadId, uploadId)).limit(batchSize);

    console.log(`📤 Queuing ${emailsToQueue.length} emails for batch ${batchId}`);

    // Queue emails for processing
    if (emailsToQueue.length > 0) {
      for (const emailRecord of emailsToQueue) {
        void emailQueue.add(
          appConstant.EMAIL_SEND_QUENE,
          {
            email: emailRecord.email,
            emailRecordId: emailRecord.id,
            composedEmail: emailData.composedEmail,
            batchId,
            emailBatchDatabaseId: batchDbId,
            uploadId,
            subject: emailData.subject,
            batchName: emailData.batchName,
            scheduleTime: emailData.scheduleTime
          },
          { removeOnComplete: true }
        );
      }
    }
  };
}

export const emailBatchController = (db: DatabaseClient) => new EmailBatchController(db);

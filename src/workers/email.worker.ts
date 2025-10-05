import { type Job, Worker, delay } from "bullmq";
import IORedis from "ioredis";
import { eq, sql } from "drizzle-orm";
import type { TEMAILJOB } from "../types/types";
import appConstant from "../constants/app.constant";
import { redisConfig } from "../config/connections.config";
import { emailBatchSchema } from "../db/schemas/emailBatchSchema";
import { uploadBulkEmailMetaDataSchema } from "../db/schemas/uploadBulkEmailMetaData";
import { individualEmailSchema } from "../db/schemas/individualEmailSchema";
import { database } from "../db/db";
import { gloabalMailMessage } from "../services/globalEmail.service";

const db = database.db;
const connection = new IORedis(redisConfig);
const redis = new IORedis(redisConfig);

export const emailWorker = new Worker<TEMAILJOB>(
  appConstant.EMAIL_SEND_QUENE,
  async (job: Job<TEMAILJOB>) => {
    const { email, emailRecordId, composedEmail, subject, batchId, emailBatchDatabaseId, uploadId } = job.data;

    console.log(`🔧 Processing email ${email} for batch ${batchId}`);

    // Get current batch info
    const [currentBatch] = await db
      .select()
      .from(emailBatchSchema)
      .where(eq(emailBatchSchema.id, Number(emailBatchDatabaseId)));

    if (!currentBatch) {
      console.log(`❌ Batch ${batchId} not found in database`);
      return;
    }

    // Check if batch is still processing
    if (currentBatch.status !== "processing") {
      console.log(`⏸️ Batch ${batchId} is not in processing state (${currentBatch.status}), skipping`);
      return;
    }

    // Send mail
    await gloabalMailMessage({ composedEmail, subject, to: email });
    console.log(`✅ Email sent to ${email}`);

    // Apply delay if configured
    if (currentBatch.delayBetweenEmails > 0) {
      await delay(currentBatch.delayBetweenEmails);
    }

    // Delete the email record from database (it's been processed successfully)
    await db.delete(individualEmailSchema).where(eq(individualEmailSchema.id, emailRecordId));

    console.log(`🗑️ Deleted email record ${emailRecordId} from database`);

    // Get the number of emails processed for this batch
    const processedCount = await redis.hincrby(`batch:${batchId}`, "processedCount", 1);

    console.log(`📊 Batch ${batchId} has processed ${processedCount}/${currentBatch.emailsPerBatch} emails`);

    // Check if we've reached the batch limit (auto-pause)
    if (processedCount >= currentBatch.emailsPerBatch) {
      console.log(`⏸️ Batch ${batchId} reached limit of ${currentBatch.emailsPerBatch} emails - pausing`);

      // Reset counter for next batch
      await redis.hset(`batch:${batchId}`, "processedCount", "0");

      // Update batch status to paused
      await db
        .update(emailBatchSchema)
        .set({ status: "paused" })
        .where(eq(emailBatchSchema.id, Number(emailBatchDatabaseId)));

      console.log(`✅ Batch ${batchId} has been paused`);
    }

    // Check if all emails for this upload are completed
    const [{ count: remainingEmails }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(individualEmailSchema)
      .where(eq(individualEmailSchema.uploadId, Number(uploadId)));

    console.log(`📧 Remaining emails in upload ${uploadId}: ${remainingEmails}`);

    // If no more emails remain, mark upload as completed
    if (remainingEmails === 0) {
      await db
        .update(uploadBulkEmailMetaDataSchema)
        .set({
          status: "completed",
          totalEmails: 0
        })
        .where(eq(uploadBulkEmailMetaDataSchema.id, Number(uploadId)));

      await db
        .update(emailBatchSchema)
        .set({ status: "completed" })
        .where(eq(emailBatchSchema.id, Number(emailBatchDatabaseId)));

      console.log(`🎉 Upload ${uploadId} completed - all emails processed`);
    }
  },
  { connection, concurrency: 1 }
);

console.log("✅ BullMQ Email Worker started and ready to process jobs");

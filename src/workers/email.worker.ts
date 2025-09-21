import { type Job, Worker } from "bullmq";
import IORedis from "ioredis";
import { redisConfig } from "../config/connections.config";
import appConstant from "../constants/app.constant";
import type { TEMAILJOB } from "../types/types";
import logger from "../utils/globalUtil/logger.util";
import { database } from "../db/db";
import { emailSchema } from "../db/schemas/emailSchema";
import { emailBatchSchema } from "../db/schemas/emailBatchSchema";
import { eq, and, count } from "drizzle-orm";

const redisConnection = new IORedis(redisConfig);

export const emailWorker = new Worker<TEMAILJOB>(
  appConstant.EMAIL_SEND_QUENE,
  async (job: Job<TEMAILJOB>) => {
    const { email, composedEmail, batchId, emailBatchDatabaseId } = job.data;

    logger.info(`Processing email: ${email} for batch: ${batchId}`);

    try {
      // Simulate email sending (replace with actual email sending logic later)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Log the email (as requested)
      logger.info(`📧 Sending email to: ${email}`);
      logger.info(`📧 Email content: ${composedEmail.substring(0, 100)}...`);

      // Update email status to completed
      if (emailBatchDatabaseId) {
        await database.db
          .update(emailSchema)
          .set({
            status: "completed",
            lastAttemptAt: new Date()
          })
          .where(and(eq(emailSchema.email, email), eq(emailSchema.batchId, emailBatchDatabaseId)));

        // Update batch sent counter
        const [sentCount] = await database.db
          .select({ count: count() })
          .from(emailSchema)
          .where(and(eq(emailSchema.batchId, emailBatchDatabaseId), eq(emailSchema.status, "completed")));

        await database.db
          .update(emailBatchSchema)
          .set({
            emailsSent: sentCount.count,
            updatedAt: new Date()
          })
          .where(eq(emailBatchSchema.id, emailBatchDatabaseId));
      }

      logger.info(`✅ Successfully processed email: ${email}`);
    } catch (error) {
      logger.error(`❌ Failed to process email: ${email}`, error);

      // Update email status to failed
      if (emailBatchDatabaseId) {
        await database.db
          .update(emailSchema)
          .set({
            status: "failed",
            failedReason: error instanceof Error ? error.message : "Unknown error",
            lastAttemptAt: new Date()
          })
          .where(and(eq(emailSchema.email, email), eq(emailSchema.batchId, emailBatchDatabaseId)));

        // Update batch failed counter
        const [failedCount] = await database.db
          .select({ count: count() })
          .from(emailSchema)
          .where(and(eq(emailSchema.batchId, emailBatchDatabaseId), eq(emailSchema.status, "failed")));

        await database.db
          .update(emailBatchSchema)
          .set({
            emailsFailed: failedCount.count,
            updatedAt: new Date()
          })
          .where(eq(emailBatchSchema.id, emailBatchDatabaseId));
      }

      throw error; // Re-throw to mark job as failed
    }
  },
  {
    connection: redisConnection,
    concurrency: 1 // Process one email at a time to respect delays
  }
);

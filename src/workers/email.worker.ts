import { type Job, Worker } from "bullmq";
import IORedis from "ioredis";
import { eq } from "drizzle-orm";
import type { TEMAILJOB } from "../types/types";
import appConstant from "../constants/app.constant";
//import { gloabalMailMessage } from "../services/globalEmail.service";
import { redisConfig } from "../config/connections.config";
import { emailBatchSchema } from "../db/schemas/emailBatchSchema";
import { database } from "../db/db";
import { emailQueue } from "../quenes/emailQuene.config";
import { mockMailSend } from "../utils/globalUtil/mockMailSend.util";

const connection = new IORedis(redisConfig);
const db = database.db;

type BatchConfig = {
  delay: number; // ms
  batchSize: number;
  processedCount: number;
  totalEmails: number;
};

const batchConfigCache = new Map<string, BatchConfig>();

export const emailWorker = new Worker<TEMAILJOB>(
  appConstant.EMAIL_SEND_QUENE,
  async (job: Job<TEMAILJOB>) => {
    const { email, composedEmail, subject, batchId, emailBatchDatabaseId } = job.data;

    // Get batch config (cache → DB)
    let config = batchConfigCache.get(batchId?.toString() || "");
    if (!config) {
      const batch = await db.query.emailBatchSchema.findFirst({
        where: eq(emailBatchSchema.id, Number(emailBatchDatabaseId))
      });

      if (!batch) throw new Error("Batch not found");

      config = {
        delay: batch.delayBetweenEmails,
        batchSize: batch.emailsPerBatch,
        processedCount: 0,
        totalEmails: batch.totalEmails
      };

      batchConfigCache.set(batchId?.toString() || "", config);
    }

    // Process email
    //    await gloabalMailMessage(email, composedEmail, subject, batchId);
    await mockMailSend({ composedEmail, subject, to: email });

    // Delay between emails
    if (config.delay > 0) {
      await new Promise((r) => setTimeout(r, config.delay));
    }

    // Update counters
    config.processedCount++;

    // If one batch completed → pause
    if (config.processedCount >= config.batchSize) {
      console.log(`Batch ${batchId} processed ${config.batchSize} emails, pausing worker...`);
      await emailWorker.pause();
      config.processedCount = 0; // reset for next batch
    }

    // If all emails completed → mark DB completed
    const processedInDb = await db.query.emailBatchSchema.findFirst({
      where: eq(emailBatchSchema.id, Number(emailBatchDatabaseId)),
      columns: { totalEmails: true }
    });

    if (processedInDb && job.id) {
      // Rough check → completed if queue empty and all emails sent
      // const queueCount = await job.queue.getJobCountByTypes("waiting", "delayed", "active");
      const queueCount = await emailQueue.getJobCountByTypes("waiting", "delayed", "active");
      if (queueCount === 0) {
        await db
          .update(emailBatchSchema)
          .set({ status: "completed" })
          .where(eq(emailBatchSchema.id, Number(emailBatchDatabaseId)));
        console.log(`Batch ${batchId} completed`);
      }
    }
  },
  { connection, concurrency: 1 }
);

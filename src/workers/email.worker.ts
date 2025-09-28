import { type Job, Worker, delay } from "bullmq";
import IORedis from "ioredis";
import { eq } from "drizzle-orm";
import type { TEMAILJOB } from "../types/types";
import appConstant from "../constants/app.constant";
import { redisConfig } from "../config/connections.config";
import { emailBatchSchema } from "../db/schemas/emailBatchSchema";
import { database } from "../db/db";
import { emailQueue } from "../quenes/emailQuene.config";
import { mockMailSend } from "../utils/globalUtil/mockMailSend.util";
import { getBatchConfig, incrementProcessed, resetProcessed } from "../features/utils/batchConfigRedis.util";

const connection = new IORedis(redisConfig);
const db = database.db;

export const emailWorker = new Worker<TEMAILJOB>(
  appConstant.EMAIL_SEND_QUENE,
  async (job: Job<TEMAILJOB>) => {
    const { email, composedEmail, subject, batchId, emailBatchDatabaseId } = job.data;

    // Load batch config
    const config = await getBatchConfig(batchId?.toString() || "");
    if (!config) throw new Error(`Batch config not found in Redis for ${batchId}`);

    // Send email
    await mockMailSend({ composedEmail, subject, to: email });

    // Delay between emails
    if (config.delay > 0) {
      await delay(config.delay);
    }

    // Update processed counter
    const processedCount = await incrementProcessed(batchId?.toString() || "");

    // If batch is full → pause
    if (processedCount >= config.batchSize) {
      console.log(`Batch ${batchId} processed ${config.batchSize} emails, pausing queue...`);
      await emailQueue.pause(); // persists in Redis
      await resetProcessed(batchId?.toString() || "");
    }

    // Completion check
    const queueCount = await emailQueue.getJobCountByTypes("waiting", "delayed", "active");
    if (queueCount === 0) {
      await db
        .update(emailBatchSchema)
        .set({ status: "completed" })
        .where(eq(emailBatchSchema.id, Number(emailBatchDatabaseId)));
      console.log(`Batch ${batchId} completed`);
    }
  },
  { connection, concurrency: 1 }
);

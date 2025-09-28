import { type Job, Worker, delay } from "bullmq";
import IORedis from "ioredis";
import { eq } from "drizzle-orm";
import type { TEMAILJOB } from "../types/types";
import appConstant from "../constants/app.constant";
import { redisConfig } from "../config/connections.config";
import { emailBatchSchema } from "../db/schemas/emailBatchSchema";
import { database } from "../db/db";
import { mockMailSend } from "../utils/globalUtil/mockMailSend.util";
import { getBatchConfig, incrementProcessed, resetProcessed, setPaused } from "../features/utils/batchConfigRedis.util";

const db = database.db;
const connection = new IORedis(redisConfig);
const redis = new IORedis(redisConfig);

export const emailWorker = new Worker<TEMAILJOB>(
  appConstant.EMAIL_SEND_QUENE,
  async (job: Job<TEMAILJOB>) => {
    const { email, composedEmail, subject, batchId, emailBatchDatabaseId, uploadId } = job.data;

    // ✅ Only process if batch is active
    const activeBatchId = await redis.get(`upload:${uploadId}:activeBatch`);
    if (activeBatchId !== batchId.toString()) {
      console.log(`Job ${job.id} skipped because batch ${batchId} is not active for upload ${uploadId}`);
      return; // just skip safely, don’t delay → prevents Missing lock
    }

    const config = await getBatchConfig(batchId.toString());
    if (!config) throw new Error(`Batch config not found in Redis for ${batchId}`);

    if (config.paused) {
      console.log(`Batch ${batchId} is paused, skipping job ${job.id}`);
      return;
    }

    // Send mail
    await mockMailSend({ composedEmail, subject, to: email });

    if (config.delay > 0) {
      await delay(config.delay);
    }

    const processedCount = await incrementProcessed(batchId.toString());

    if (processedCount >= config.batchSize) {
      console.log(`Batch ${batchId} processed ${config.batchSize} emails → pausing`);
      await resetProcessed(batchId.toString());
      await setPaused(batchId.toString(), true);

      console.log("orignal db got updated");
      await db
        .update(emailBatchSchema)
        .set({ status: "paused" })
        .where(eq(emailBatchSchema.id, Number(emailBatchDatabaseId)));
      // ** how many time orignal db got updated
    }

    // Check if this specific batch is completed by tracking total processed for batch
    const totalProcessedGlobal = await redis.hincrby(`batch:${batchId}`, "totalProcessedEmails", 1);
    const [currentBatch] = await db
      .select()
      .from(emailBatchSchema)
      .where(eq(emailBatchSchema.id, Number(emailBatchDatabaseId)));

    if (currentBatch && totalProcessedGlobal >= currentBatch.totalEmails) {
      await db
        .update(emailBatchSchema)
        .set({ status: "completed" })
        .where(eq(emailBatchSchema.id, Number(emailBatchDatabaseId)));

      // Clear active batch in Redis
      await redis.del(`upload:${uploadId}:activeBatch`);

      console.log(`Batch ${batchId} completed - processed all ${currentBatch.totalEmails} emails`);
    }
  },
  { connection, concurrency: 1 }
);

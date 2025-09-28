import IORedis from "ioredis";
import { redisConfig } from "../../config/connections.config";
const redis = new IORedis(redisConfig);

export type BatchConfig = {
  delay: number;
  batchSize: number;
  processedCount: number;
  totalEmails: number;
};

export async function initBatchConfig(batchId: string, config: BatchConfig) {
  await redis.hmset(`batch:${batchId}`, {
    delay: config.delay.toString(),
    batchSize: config.batchSize.toString(),
    processedCount: config.processedCount.toString(),
    totalEmails: config.totalEmails.toString()
  });
}

export async function getBatchConfig(batchId: string): Promise<BatchConfig | null> {
  const res = await redis.hgetall(`batch:${batchId}`);
  if (!res || Object.keys(res).length === 0) return null;
  return {
    delay: Number(res.delay),
    batchSize: Number(res.batchSize),
    processedCount: Number(res.processedCount),
    totalEmails: Number(res.totalEmails)
  };
}

export async function incrementProcessed(batchId: string): Promise<number> {
  return redis.hincrby(`batch:${batchId}`, "processedCount", 1);
}

export async function resetProcessed(batchId: string) {
  await redis.hset(`batch:${batchId}`, "processedCount", "0");
}

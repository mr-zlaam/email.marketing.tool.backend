import { type Job, Worker } from "bullmq";
import IORedis from "ioredis";
import { redisConfig } from "../config/connections.config";
import appConstant from "../constants/app.constant";
import type { TEMAILJOB } from "../types/types";
import logger from "../utils/globalUtil/logger.util";
const redisConnection = new IORedis(redisConfig);
export const emailWorker = new Worker<TEMAILJOB>(
  appConstant.EMAIL_SEND_QUENE,
  async (job: Job<TEMAILJOB>) => {
    logger.info("emailWorker", job.data);
    await new Promise((resolve) => setTimeout(resolve));
  },
  { connection: redisConnection }
);

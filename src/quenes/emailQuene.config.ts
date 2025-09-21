// queue/email.queue.ts
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { redisConfig } from "../config/connections.config";
import appConstant from "../constants/app.constant";
import type { TEMAILJOB } from "../types/types";

const redisConnection = new IORedis(redisConfig);

export const emailQueue = new Queue<TEMAILJOB>(appConstant.EMAIL_SEND_QUENE, { connection: redisConnection });

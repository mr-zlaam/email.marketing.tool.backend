// queue/email.queue.ts
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { redisConfig } from "../config/connections.config";

const redisConnection = new IORedis(redisConfig);

export const emailQueue = new Queue("emailQueue", { connection: redisConnection });

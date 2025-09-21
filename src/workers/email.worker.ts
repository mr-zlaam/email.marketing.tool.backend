import { Worker } from "bullmq";
import IORedis from "ioredis";
import { redisConfig } from "../config/connections.config";
const redisConnection = new IORedis(redisConfig);

export const emailWorker = new Worker("emailQuene", async () => {}, { connection: redisConnection });

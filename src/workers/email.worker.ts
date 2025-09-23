import { database } from "../db/db";
import { emailSchema } from "../db/schemas/emailSchema";
import { emailBatchSchema } from "../db/schemas/emailBatchSchema";
import { eq, and, sql } from "drizzle-orm";
import { gloabalMailMessage } from "../services/globalEmail.service";
import logger from "../utils/globalUtil/logger.util";

type EmailJob = {
  email: string;
  composedEmail: string;
  subject: string;
  batchId: string;
  emailBatchDatabaseId: string;
};

export async function processEmailJobs(jobs: EmailJob[]) {
  for (const job of jobs) {
    try {
      console.info(`Processing email: ${job.email} for batch: ${job.batchId}`);

      await gloabalMailMessage(job.email, job.composedEmail, job.subject);

      console.info(`📧 Sent: ${job.email}`);

      if (job.emailBatchDatabaseId) {
        await Promise.all([
          database.db
            .update(emailSchema)
            .set({
              status: "completed",
              lastAttemptAt: new Date()
            })
            .where(and(eq(emailSchema.email, job.email), eq(emailSchema.batchId, Number(job.emailBatchDatabaseId)))),

          database.db
            .update(emailBatchSchema)
            .set({
              emailsSent: sql`${emailBatchSchema.emailsSent} + 1`,
              updatedAt: new Date()
            })
            .where(eq(emailBatchSchema.id, Number(job.emailBatchDatabaseId)))
        ]);
      }

      logger.info(`✅ Done: ${job.email}`);
    } catch (error) {
      logger.error(`❌ Failed: ${job.email}`, error);

      if (job.emailBatchDatabaseId) {
        await Promise.all([
          database.db
            .update(emailSchema)
            .set({
              status: "failed",
              failedReason: error instanceof Error ? error.message : "Unknown error",
              lastAttemptAt: new Date()
            })
            .where(and(eq(emailSchema.email, job.email), eq(emailSchema.batchId, Number(job.emailBatchDatabaseId)))),

          database.db
            .update(emailBatchSchema)
            .set({
              emailsFailed: sql`${emailBatchSchema.emailsFailed} + 1`,
              updatedAt: new Date()
            })
            .where(eq(emailBatchSchema.id, Number(job.emailBatchDatabaseId)))
        ]);
      }
    }
  }
}

ALTER TABLE "emailBatch" ADD COLUMN "currentBatchSize" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "emailBatch" ADD COLUMN "emailsQueued" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "emailBatch" ADD COLUMN "lastBatchStartedAt" timestamp (3);
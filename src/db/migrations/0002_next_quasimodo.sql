ALTER TABLE "emailBatch" ALTER COLUMN "totalEmails" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "emailBatch" ADD COLUMN "delayBetweenEmails" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "emailBatch" ADD COLUMN "emailsPerBatch" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "emailBatch" DROP COLUMN "emailsSent";--> statement-breakpoint
ALTER TABLE "emailBatch" DROP COLUMN "emailsFailed";--> statement-breakpoint
ALTER TABLE "emailBatch" DROP COLUMN "currentBatchSize";--> statement-breakpoint
ALTER TABLE "emailBatch" DROP COLUMN "emailsQueued";--> statement-breakpoint
ALTER TABLE "emailBatch" DROP COLUMN "lastBatchStartedAt";
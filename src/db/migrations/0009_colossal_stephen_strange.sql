ALTER TABLE "emailBatch" ADD COLUMN "composedEmail" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "emailBatch" DROP COLUMN "emailContent";
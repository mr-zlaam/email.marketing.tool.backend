CREATE TYPE "public"."batchStatus" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "emailBatch" (
	"id" serial PRIMARY KEY NOT NULL,
	"batchId" uuid NOT NULL,
	"createdBy" varchar(100) NOT NULL,
	"batchName" varchar(100) NOT NULL,
	"totalEmails" integer DEFAULT 0,
	"emailsSent" integer DEFAULT 0,
	"emailsFailed" integer DEFAULT 0,
	"status" "batchStatus" DEFAULT 'pending',
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "emailBatch_batchId_unique" UNIQUE("batchId")
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"batchId" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"status" "batchStatus" DEFAULT 'pending',
	"failedReason" varchar(500) DEFAULT '',
	"attemptCount" integer DEFAULT 0,
	"lastAttemptAt" timestamp (3) DEFAULT now(),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emailBatch" ADD CONSTRAINT "emailBatch_createdBy_users_username_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("username") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_batchId_emailBatch_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."emailBatch"("id") ON DELETE no action ON UPDATE no action;
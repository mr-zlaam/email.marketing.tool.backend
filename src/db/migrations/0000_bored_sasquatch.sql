CREATE TYPE "public"."batchStatus" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."currentEmailStatus" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'USER');--> statement-breakpoint
CREATE TABLE "emailBatch" (
	"id" serial PRIMARY KEY NOT NULL,
	"batchId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"createdBy" varchar(100) NOT NULL,
	"batchName" varchar(100) NOT NULL,
	"composedEmail" text DEFAULT '' NOT NULL,
	"totalEmails" integer DEFAULT 0,
	"emailsSent" integer DEFAULT 0,
	"emailsFailed" integer DEFAULT 0,
	"status" "batchStatus" DEFAULT 'pending',
	"currentBatchSize" integer DEFAULT 0,
	"emailsQueued" integer DEFAULT 0,
	"lastBatchStartedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "emailBatch_batchId_unique" UNIQUE("batchId")
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"batchId" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"status" "currentEmailStatus" DEFAULT 'pending',
	"failedReason" varchar(500) DEFAULT '',
	"attemptCount" integer DEFAULT 0,
	"lastAttemptAt" timestamp (3) DEFAULT now(),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"uid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"fullName" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"password" varchar(5000) NOT NULL,
	"role" "role" DEFAULT 'USER' NOT NULL,
	"isVerified" boolean DEFAULT false NOT NULL,
	"OTP_TOKEN" text,
	"OTP_TOKEN_VERSION" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_OTP_TOKEN_unique" UNIQUE("OTP_TOKEN")
);
--> statement-breakpoint
CREATE TABLE "rate_limiter_flexible" (
	"key" text PRIMARY KEY NOT NULL,
	"points" integer NOT NULL,
	"expire" timestamp,
	"previousDelay" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emailBatch" ADD CONSTRAINT "emailBatch_createdBy_users_username_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("username") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_batchId_emailBatch_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."emailBatch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_createdAt_idx" ON "users" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "user_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "user_isVerified_idx" ON "users" USING btree ("isVerified");--> statement-breakpoint
CREATE INDEX "key_idx" ON "rate_limiter_flexible" USING btree ("key");
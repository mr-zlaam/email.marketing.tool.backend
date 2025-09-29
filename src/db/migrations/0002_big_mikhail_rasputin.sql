CREATE TABLE "individualEmails" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"uploadId" integer NOT NULL,
	"status" "currentEmailStatus" DEFAULT 'pending' NOT NULL,
	"firstName" varchar(100),
	"lastName" varchar(100),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "individualEmails_email_uploadId_unique" UNIQUE("email","uploadId")
);
--> statement-breakpoint
DROP TABLE "emails" CASCADE;--> statement-breakpoint
ALTER TABLE "individualEmails" ADD CONSTRAINT "individualEmails_uploadId_uploadBulkEmailMetaData_id_fk" FOREIGN KEY ("uploadId") REFERENCES "public"."uploadBulkEmailMetaData"("id") ON DELETE cascade ON UPDATE no action;
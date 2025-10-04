ALTER TABLE "individualEmails" DROP CONSTRAINT "individualEmails_email_uploadId_unique";--> statement-breakpoint
ALTER TABLE "individualEmails" ADD COLUMN "name" varchar(255);--> statement-breakpoint
CREATE INDEX "individual_email_upload_id_index" ON "individualEmails" USING btree ("uploadId");--> statement-breakpoint
CREATE INDEX "individual_email_email_index" ON "individualEmails" USING btree ("email");--> statement-breakpoint
CREATE INDEX "individual_email_email_upload_id_index" ON "individualEmails" USING btree ("email","uploadId");--> statement-breakpoint
CREATE UNIQUE INDEX "uniqueEmailPerUpload" ON "individualEmails" USING btree ("email","uploadId");--> statement-breakpoint
ALTER TABLE "individualEmails" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "individualEmails" DROP COLUMN "firstName";--> statement-breakpoint
ALTER TABLE "individualEmails" DROP COLUMN "lastName";--> statement-breakpoint
ALTER TABLE "individualEmails" DROP COLUMN "updatedAt";
// batchName,delayBetweenEmails,emailsPerBatch,scheduleTime
import { z } from "zod";
export const emailBatchValidationZ = z.object({
  batchName: z
    .string({ message: "Batch name is required" })
    .min(3, "Batch name must be at least 3 characters")
    .max(50, "Batch name must be less than 50 characters"),
  delayBetweenEmails: z.string({ message: "Delay between emails is required" }),
  emailsPerBatch: z
    .string({ message: "Emails per batch is required" })
    .min(1, "Emails per batch must be at least 1")
    .max(100, "Emails per batch must be less than 100"),
  scheduleTime: z
    .string({ message: "Schedule time is required" })
    .min(3, "Schedule time must be at least 3 characters")
    .max(50, "Schedule time must be less than 50 characters"),
  composedEmail: z
    .string({ message: "Composed email is required" })
    .min(10, "Composed email cannot be empty")
    .max(10000, "Composed email must be less than 10000 characters"),
  subject: z
    .string({ message: "Subject is required" })
    .min(3, "Subject must be at least 3 characters")
    .max(50, "Subject must be less than 50 characters")
});

export const resumeBatchValidationZ = z.object({
  batchId: z.string({ message: "Batch ID is required" }).uuid("Invalid batch ID format"),
  delayBetweenEmails: z.string({ message: "Delay between emails is required" }),
  emailsPerBatch: z.string({ message: "Emails per batch is required" }).min(1, "Emails per batch must be at least 1"),
  scheduleTime: z
    .string({ message: "Schedule time is required" })
    .min(3, "Schedule time must be at least 3 characters")
    .max(50, "Schedule time must be less than 50 characters")
});

export const getBatchByIdValidationZ = z.object({
  batchId: z.string({ message: "Batch ID is required" }).uuid("Invalid batch ID format")
});

export const deleteBatchValidationZ = z.object({
  batchId: z.string({ message: "Batch ID is required" }).uuid("Invalid batch ID format")
});

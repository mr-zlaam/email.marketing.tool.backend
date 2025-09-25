import { serial, pgTable, timestamp, uuid, varchar, integer, text } from "drizzle-orm/pg-core";
import { userSchema } from "../userSchema";
import { currentEmailBatchStatusEnum } from "../shared/enums";

export const emailBatchSchema = pgTable("emailBatch", {
  id: serial("id").notNull().primaryKey(),
  batchId: uuid("batchId").notNull().unique().defaultRandom(),

  createdBy: varchar("createdBy", { length: 100 })
    .notNull()
    .references(() => userSchema.username),

  batchName: varchar("batchName", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  composedEmail: text("composedEmail").notNull().default(""),

  totalEmails: integer("totalEmails").notNull().default(0),
  status: currentEmailBatchStatusEnum().default("pending"), // pending | processing | completed | failed
  delayBetweenEmails: integer("delayBetweenEmails").notNull().default(0),
  emailsPerBatch: integer("emailsPerBatch").notNull().default(0),

  createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull().defaultNow()
});

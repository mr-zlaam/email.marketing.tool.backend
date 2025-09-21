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
  composedEmail: text("composedEmail").notNull().default(""),
  totalEmails: integer("totalEmails").default(0),
  emailsSent: integer("emailsSent").default(0),
  emailsFailed: integer("emailsFailed").default(0),
  status: currentEmailBatchStatusEnum().default("pending"), // pending | sending | completed

  createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull().defaultNow()
});

import { serial, pgTable, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { emailBatchSchema } from "../emailBatchSchema";
import { currentEmailEnum } from "../shared/enums";

export const emailSchema = pgTable("emails", {
  id: serial("id").notNull().primaryKey(),
  batchId: integer("batchId")
    .notNull()
    .references(() => emailBatchSchema.id),
  email: varchar("email", { length: 255 }).notNull(),
  status: currentEmailEnum().default("pending"),
  failedReason: varchar("failedReason", { length: 500 }).default(""),
  attemptCount: integer("attemptCount").default(0),
  lastAttemptAt: timestamp("lastAttemptAt", { mode: "date", precision: 3 }).defaultNow(),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow()
});

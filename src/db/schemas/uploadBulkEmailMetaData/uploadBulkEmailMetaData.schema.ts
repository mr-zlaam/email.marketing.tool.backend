import { serial, pgTable, timestamp, varchar, integer, jsonb } from "drizzle-orm/pg-core";
import { userSchema } from "../userSchema";
import { bulkDataStatusEnum } from "../shared/enums";
export const uploadBulkEmailMetaDataSchema = pgTable("uploadBulkEmailMetaData", {
  id: serial("id").notNull().primaryKey(),
  uploadedFileName: varchar("uploadedFileName", { length: 100 }).notNull(),
  totalEmails: integer("totalEmails").notNull().default(0),
  totalEmailSentToQueue: integer("totalEmailSentToQueue").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow(),
  uploadedBy: varchar("uploadedBy", { length: 50 })
    .notNull()
    .references(() => userSchema.username),
  status: bulkDataStatusEnum().notNull().default("paused"),
  metaData: jsonb("metaData").default({})
});

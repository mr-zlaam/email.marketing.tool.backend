import { serial, pgTable, varchar, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { uploadBulkEmailMetaDataSchema } from "../uploadBulkEmailMetaData";

export const individualEmailSchema = pgTable(
  "individualEmails",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    uploadId: integer("uploadId")
      .notNull()
      .references(() => uploadBulkEmailMetaDataSchema.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow()
  },
  (table) => ({
    uniqueEmailPerUpload: unique().on(table.email, table.uploadId)
  })
);

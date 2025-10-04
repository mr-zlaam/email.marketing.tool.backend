import { serial, pgTable, varchar, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { uploadBulkEmailMetaDataSchema } from "../uploadBulkEmailMetaData";

export const individualEmailSchema = pgTable(
  "individualEmails",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),
    uploadId: integer("uploadId")
      .notNull()
      .references(() => uploadBulkEmailMetaDataSchema.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow()
  },
  (table) => [
    index("individual_email_upload_id_index").on(table.uploadId),
    index("individual_email_email_index").on(table.email),
    index("individual_email_email_upload_id_index").on(table.email, table.uploadId),
    uniqueIndex("uniqueEmailPerUpload").on(table.email, table.uploadId)
  ]
);

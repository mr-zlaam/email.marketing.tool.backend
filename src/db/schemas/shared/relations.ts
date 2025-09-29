import { relations } from "drizzle-orm";
import { userSchema } from "../userSchema";
import { uploadBulkEmailMetaDataSchema } from "../uploadBulkEmailMetaData";
import { emailBatchSchema } from "../emailBatchSchema";
import { individualEmailSchema } from "../individualEmailSchema";

export const userRelations = relations(userSchema, ({ many }) => ({
  uploadBulkEmailMetaData: many(uploadBulkEmailMetaDataSchema)
}));

export const uploadBulkEmailMetaDataRelations = relations(uploadBulkEmailMetaDataSchema, ({ one, many }) => ({
  emailBatches: many(emailBatchSchema),
  individualEmails: many(individualEmailSchema),
  users: one(userSchema, {
    references: [userSchema.username],
    fields: [uploadBulkEmailMetaDataSchema.uploadedBy]
  })
}));

export const emailBatchRelations = relations(emailBatchSchema, ({ one, many }) => ({
  emailBatches: many(emailBatchSchema),
  users: one(uploadBulkEmailMetaDataSchema, {
    references: [uploadBulkEmailMetaDataSchema.id],
    fields: [emailBatchSchema.currentBatchBelongsTo]
  })
}));

export const individualEmailRelations = relations(individualEmailSchema, ({ one }) => ({
  upload: one(uploadBulkEmailMetaDataSchema, {
    references: [uploadBulkEmailMetaDataSchema.id],
    fields: [individualEmailSchema.uploadId]
  })
}));

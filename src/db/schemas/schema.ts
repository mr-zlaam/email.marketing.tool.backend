import { emailBatchSchema } from "./emailBatchSchema";
import { individualEmailSchema } from "./individualEmailSchema";
import { uploadBulkEmailMetaDataRelations, userRelations, emailBatchRelations, individualEmailRelations } from "./shared/relations";
import { uploadBulkEmailMetaDataSchema } from "./uploadBulkEmailMetaData";
import { userSchema } from "./userSchema";

export const schema = {
  users: userSchema,
  userRelations,
  emailBatchSchema,
  emailBatchRelations,
  uploadBulkEmailMetaDataSchema,
  uploadBulkEmailMetaDataRelations,
  individualEmailSchema,
  individualEmailRelations
};
export type TSCHEMA = typeof schema;

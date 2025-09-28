import { emailBatchSchema } from "./emailBatchSchema";
import { uploadBulkEmailMetaDataRelations, userRelations } from "./shared/relations";
import { uploadBulkEmailMetaDataSchema } from "./uploadBulkEmailMetaData";
import { userSchema } from "./userSchema";

export const schema = {
  users: userSchema,
  userRelations,
  emailBatchSchema,
  uploadBulkEmailMetaDataSchema,
  uploadBulkEmailMetaDataRelations
};
export type TSCHEMA = typeof schema;

import { emailBatchSchema } from "./emailBatchSchema";
import { userSchema } from "./userSchema";

export const schema = {
  users: userSchema,
  emailBatchSchema
};
export type TSCHEMA = typeof schema;

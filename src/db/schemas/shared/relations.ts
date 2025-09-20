import { relations } from "drizzle-orm";
import { userSchema } from "../userSchema";

export const userRelations = relations(userSchema, () => ({}));

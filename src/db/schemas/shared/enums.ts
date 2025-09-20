import { pgEnum } from "drizzle-orm/pg-core";

//** Auth enum */
export const userRoleEnum = pgEnum("role", ["ADMIN", "USER"]);

export type TCURRENTROLE = (typeof userRoleEnum.enumValues)[number];

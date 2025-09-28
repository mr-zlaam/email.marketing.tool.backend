import { pgEnum } from "drizzle-orm/pg-core";

//** Auth enum */
export const userRoleEnum = pgEnum("role", ["ADMIN", "USER"]);

export type TCURRENTROLE = (typeof userRoleEnum.enumValues)[number];
export const currentEmailBatchStatusEnum = pgEnum("batchStatus", ["pending", "processing", "completed", "failed"]);
export type TCURRENTEMAILBATCHSTATUS = (typeof userRoleEnum.enumValues)[number];
export const currentEmailEnum = pgEnum("currentEmailStatus", ["pending", "completed", "failed"]);
export type TCURRENTEMAIL = (typeof userRoleEnum.enumValues)[number];
export const bulkDataStatusEnum = pgEnum("bulkDataStatus", ["paused", "processing", "completed", "failed"]);
export type TBULKDATASTATUS = (typeof bulkDataStatusEnum.enumValues)[number];

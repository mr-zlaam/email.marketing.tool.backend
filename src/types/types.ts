import type { DatabaseClient } from "../db/db";

export interface IPAGINATION {
  currentPage: number;
  pageSize: number;
  totalRecord: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalPage: number;
}

export interface IEMAILBATCHBODY {
  scheduleTime: "NOW" | Date;
  subject: string;
  delayBetweenEmails: string;
  emailsPerBatch: string;
  batchName: string;
  composedEmail: string;
  uploadId: number;
}

export interface TEMAILJOB {
  email: string;
  emailRecordId: number;
  composedEmail: string;
  batchId: string;
  emailBatchDatabaseId?: number;
  subject: string;
  db?: DatabaseClient;
  batchName: string;
  delayBetweenEmails?: string;
  emailsPerBatch?: string;
  scheduleTime?: string;
  uploadId?: number;
}

export interface IRESUMEBATCHBODY {
  batchId: string;
  scheduleTime: "NOW" | Date;
  delayBetweenEmails: string;
  emailsPerBatch: string;
}
export interface TMAILDATATOSEND {
  to: string;
  subject: string;
  composedEmail: string;
}

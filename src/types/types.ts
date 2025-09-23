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
}

export interface TEMAILJOB {
  email: string;
  composedEmail: string;
  batchId?: string;
  emailBatchDatabaseId?: number;
  subject: string;
}

export interface IRESUMEBATCHBODY {
  batchId: string;
  scheduleTime: "NOW" | Date;
  delayBetweenEmails: string;
  emailsPerBatch: string;
}

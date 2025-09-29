import type { DatabaseClient } from "../../../db/db";
import type { _Request } from "../../../middlewares/auth.middleware";
import type { IPAGINATION } from "../../../types/types";
import { asyncHandler } from "../../../utils/globalUtil/asyncHandler.util";
import { httpResponse } from "../../../utils/globalUtil/apiResponse.util";
import { throwError } from "../../../utils/globalUtil/throwError.util";
import { uploadBulkEmailMetaDataSchema } from "../../../db/schemas/uploadBulkEmailMetaData";
import { emailBatchSchema } from "../../../db/schemas/emailBatchSchema";
import { individualEmailSchema } from "../../../db/schemas/individualEmailSchema";
import { eq, desc, count, sql } from "drizzle-orm";
import reshttp from "reshttp";

interface IUploadsWithBatchesQuery {
  page?: string;
  pageSize?: string;
  uploadId?: string;
}

interface IUploadWithBatches {
  id: number;
  uploadedFileName: string;
  totalEmails: number; // Original total emails uploaded
  remainingEmails: number; // Current remaining emails to process
  totalEmailSentToQueue: number;
  status: string;
  uploadedBy: string;
  createdAt: Date;
  metaData: unknown;
  batches: Array<{
    id: number;
    batchId: string;
    batchName: string;
    totalEmails: number;
    status: string | null; // "processing", "paused", "completed"
    emailsPerBatch: number; // Auto-pause threshold
    delayBetweenEmails: number; // Delay in milliseconds
    subject: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

class GetUploadsWithBatchesController {
  private readonly _db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this._db = db;
  }

  public getUploadsWithBatches = asyncHandler(async (req: _Request, res) => {
    const { page = "1", pageSize = "10", uploadId } = req.query as IUploadsWithBatchesQuery;

    const currentPage = parseInt(page, 10);
    const limit = parseInt(pageSize, 10);
    const offset = (currentPage - 1) * limit;

    if (currentPage < 1 || limit < 1 || limit > 100) {
      return throwError(400, "Invalid pagination parameters. Page must be >= 1, pageSize between 1-100");
    }

    // If specific uploadId requested, get single upload with batches
    if (uploadId) {
      const uploadIdNum = parseInt(uploadId, 10);
      if (isNaN(uploadIdNum)) {
        return throwError(400, "Invalid uploadId parameter");
      }

      const [upload] = await this._db.select().from(uploadBulkEmailMetaDataSchema).where(eq(uploadBulkEmailMetaDataSchema.id, uploadIdNum));

      if (!upload) {
        return throwError(404, "Upload not found");
      }

      // Get the single batch for this specific upload (single batch per upload system)
      const batches = await this._db
        .select({
          id: emailBatchSchema.id,
          batchId: emailBatchSchema.batchId,
          batchName: emailBatchSchema.batchName,
          totalEmails: emailBatchSchema.totalEmails,
          status: emailBatchSchema.status,
          emailsPerBatch: emailBatchSchema.emailsPerBatch,
          delayBetweenEmails: emailBatchSchema.delayBetweenEmails,
          subject: emailBatchSchema.subject,
          createdAt: emailBatchSchema.createdAt,
          updatedAt: emailBatchSchema.updatedAt
        })
        .from(emailBatchSchema)
        .where(eq(emailBatchSchema.currentBatchBelongsTo, uploadIdNum))
        .orderBy(desc(emailBatchSchema.createdAt));

      // Get remaining emails count from individual emails table
      const [{ count: remainingEmails }] = await this._db
        .select({ count: sql<number>`count(*)` })
        .from(individualEmailSchema)
        .where(eq(individualEmailSchema.uploadId, uploadIdNum));

      const uploadWithBatches: IUploadWithBatches = {
        ...upload,
        remainingEmails,
        batches
      };

      return httpResponse(req, res, reshttp.okCode, "Upload with batches retrieved", {
        upload: uploadWithBatches,
        totalBatches: batches.length
      });
    }

    // Get paginated uploads with their batches
    const [totalUploadsResult] = await this._db.select({ count: count() }).from(uploadBulkEmailMetaDataSchema);

    const totalRecord = totalUploadsResult.count;
    const totalPage = Math.ceil(totalRecord / limit);
    const hasNextPage = currentPage < totalPage;
    const hasPreviousPage = currentPage > 1;

    const uploads = await this._db
      .select()
      .from(uploadBulkEmailMetaDataSchema)
      .orderBy(desc(uploadBulkEmailMetaDataSchema.createdAt))
      .limit(limit)
      .offset(offset);

    const uploadsWithBatches: IUploadWithBatches[] = [];

    for (const upload of uploads) {
      // Get the single batch for this upload (single batch per upload system)
      const batches = await this._db
        .select({
          id: emailBatchSchema.id,
          batchId: emailBatchSchema.batchId,
          batchName: emailBatchSchema.batchName,
          totalEmails: emailBatchSchema.totalEmails,
          status: emailBatchSchema.status,
          emailsPerBatch: emailBatchSchema.emailsPerBatch,
          delayBetweenEmails: emailBatchSchema.delayBetweenEmails,
          subject: emailBatchSchema.subject,
          createdAt: emailBatchSchema.createdAt,
          updatedAt: emailBatchSchema.updatedAt
        })
        .from(emailBatchSchema)
        .where(eq(emailBatchSchema.currentBatchBelongsTo, upload.id))
        .orderBy(desc(emailBatchSchema.createdAt));

      // Get remaining emails count from individual emails table
      const [{ count: remainingEmails }] = await this._db
        .select({ count: sql<number>`count(*)` })
        .from(individualEmailSchema)
        .where(eq(individualEmailSchema.uploadId, upload.id));

      uploadsWithBatches.push({
        ...upload,
        remainingEmails,
        batches
      });
    }

    const pagination: IPAGINATION = {
      currentPage,
      pageSize: limit,
      totalRecord,
      totalPage,
      hasNextPage,
      hasPreviousPage
    };

    return httpResponse(req, res, reshttp.okCode, "Uploads with batches retrieved", {
      uploads: uploadsWithBatches,
      pagination
    });
  });
}

export const getUploadsWithBatchesController = (db: DatabaseClient) => new GetUploadsWithBatchesController(db);

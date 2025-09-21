# Email Marketing Server API Documentation

## Overview

This API provides endpoints for managing email batches, resuming email jobs, and retrieving batch statistics. All endpoints require authentication via Bearer token.

---

## Authentication

All endpoints require authentication. Include the following header in your requests:

```
Authorization: Bearer <your-jwt-token>
```

---

## Email Batch Management

### 1. Resume Email Batch

**Endpoint:** `POST /resumeBatch`

**Description:** Resume processing of a paused email batch with new scheduling parameters. Queues additional emails from the stored email list.

**Authentication:** Required

#### Request Body:

```json
{
  "batchId": "string (UUID format)",
  "scheduleTime": "string ('NOW' or ISO date string)",
  "delayBetweenEmails": "string (seconds as string)",
  "emailsPerBatch": "string (number as string)"
}
```

#### Response (200 OK):

```json
{
  "status": 200,
  "message": "Email batch resumed successfully",
  "data": {
    "batchId": "string",
    "queuedEmailsCount": "number",
    "totalPendingEmails": "number",
    "remainingAfterQueue": "number",
    "newScheduleTime": "string (ISO date)"
  }
}
```

#### Error Responses:

- **400 Bad Request:** Invalid batchId format, invalid schedule time, or no remaining emails
- **403 Forbidden:** User doesn't own this batch
- **404 Not Found:** Batch not found

---

### 2. Get All Email Batches (Paginated)

**Endpoint:** `GET /getAllBatches`

**Description:** Retrieve all email batches for the authenticated user with pagination and statistics.

**Authentication:** Required

#### Query Parameters:

- `page`: number (optional, default: 1, minimum: 1)
- `limit`: number (optional, default: 10, minimum: 1, maximum: 100)

**Example:** `/getAllBatches?page=1&limit=10`

#### Response (200 OK):

```json
{
  "status": 200,
  "message": "Email batches retrieved successfully",
  "data": {
    "batches": [
      {
        "id": "number",
        "batchId": "string (UUID)",
        "createdBy": "string",
        "batchName": "string",
        "composedEmail": "string",
        "totalEmails": "number",
        "emailsSent": "number",
        "emailsFailed": "number",
        "status": "string ('pending' | 'completed' | 'failed')",
        "createdAt": "string (ISO date)",
        "updatedAt": "string (ISO date)",
        "currentQueueStatus": {
          "waiting": "number",
          "active": "number",
          "completed": "number",
          "failed": "number",
          "totalInQueue": "number"
        },
        "statistics": {
          "successRate": "string (percentage with %)",
          "failureRate": "string (percentage with %)",
          "pendingEmails": "number",
          "completionPercentage": "string (percentage with %)",
          "actualEmailsSent": "number",
          "actualEmailsFailed": "number"
        },
        "batchProgress": {
          "currentBatchSize": "number",
          "emailsQueued": "number",
          "isProcessing": "boolean",
          "canResume": "boolean",
          "lastBatchStartedAt": "string (ISO date) | null"
        }
      }
    ],
    "pagination": {
      "currentPage": "number",
      "pageSize": "number",
      "totalRecord": "number",
      "hasNextPage": "boolean",
      "hasPreviousPage": "boolean",
      "totalPage": "number"
    },
    "globalQueueStatus": {
      "totalWaiting": "number",
      "totalActive": "number",
      "totalCompleted": "number",
      "totalFailed": "number"
    }
  }
}
```

#### Error Responses:

- **400 Bad Request:** Invalid page or limit parameters

---

### 3. Get Email Batch By ID

**Endpoint:** `GET /getBatch/:batchId`

**Description:** Retrieve detailed information for a specific email batch.

**Authentication:** Required

#### URL Parameters:

- `batchId`: string (UUID) - The batch ID in the URL path

**Example:** `/getBatch/123e4567-e89b-12d3-a456-426614174000`

#### Response (200 OK):

```json
{
  "status": 200,
  "message": "Email batch details retrieved successfully",
  "data": {
    "id": "number",
    "batchId": "string (UUID)",
    "createdBy": "string",
    "batchName": "string",
    "composedEmail": "string",
    "totalEmails": "number",
    "emailsSent": "number",
    "emailsFailed": "number",
    "status": "string ('pending' | 'completed' | 'failed')",
    "createdAt": "string (ISO date)",
    "updatedAt": "string (ISO date)",
    "queueDetails": {
      "waiting": "number",
      "active": "number",
      "completed": "number",
      "failed": "number",
      "totalInQueue": "number"
    },
    "statistics": {
      "totalEmails": "number",
      "emailsSent": "number",
      "emailsFailed": "number",
      "pendingEmails": "number",
      "successRate": "string (percentage with %)",
      "failureRate": "string (percentage with %)",
      "completionPercentage": "string (percentage with %)",
      "actualEmailsSent": "number",
      "actualEmailsFailed": "number"
    },
    "batchProgress": {
      "currentBatchSize": "number",
      "emailsQueued": "number",
      "isProcessing": "boolean",
      "canResume": "boolean",
      "lastBatchStartedAt": "string (ISO date) | null"
    }
  }
}
```

#### Error Responses:

- **400 Bad Request:** Missing or invalid batchId
- **403 Forbidden:** User doesn't own this batch
- **404 Not Found:** Batch not found

---

### 4. Delete Email Batch

**Endpoint:** `DELETE /deleteBatch/:batchId`

**Description:** Delete an email batch. Only allows deletion if no jobs are remaining in the queue.

**Authentication:** Required

#### URL Parameters:

- `batchId`: string (UUID) - The batch ID in the URL path

**Example:** `/deleteBatch/123e4567-e89b-12d3-a456-426614174000`

#### Response (200 OK):

```json
{
  "status": 200,
  "message": "Email batch deleted successfully",
  "data": {
    "deletedBatchId": "string (UUID)",
    "batchName": "string",
    "deletedAt": "string (ISO date)"
  }
}
```

#### Error Responses:

- **400 Bad Request:**
  - Missing or invalid batchId
  - Batch has remaining jobs in queue (e.g., "Cannot delete batch with 50 remaining jobs in queue")
  - Batch is currently being processed
- **403 Forbidden:** User doesn't own this batch
- **404 Not Found:** Batch not found

---

## Data Types and Enums

### Batch Status

- `"pending"`: Batch created, emails stored, no processing started
- `"processing"`: Current batch is actively being processed by workers
- `"completed"`: All emails in the batch have been processed
- `"failed"`: Batch processing has failed

### Date Format

All dates are returned in ISO 8601 format: `"2024-01-15T10:30:00.000Z"`

### Schedule Time Options

- `"NOW"`: Start processing immediately
- ISO date string: Schedule for a specific future time

---

## Important Implementation Changes

### Email Batch Processing System

The system implements a proper email batch workflow:

1. **File Upload & Storage**: ALL emails from uploaded file are stored in database
2. **Batch Configuration**: User sets batch size, delay, and schedule time
3. **Initial Processing**: Only first batch (e.g., 100 emails) are queued immediately
4. **Worker Processing**: Workers process emails with proper delays and update statuses
5. **Resume Functionality**: User can queue next batch when ready

### Batch Status Tracking

- **pending**: Batch created, emails stored, no processing started
- **processing**: Current batch is being processed by workers
- **completed**: All emails in the batch have been processed
- **failed**: Batch processing has failed

### Dashboard Display Logic

- **Total Emails**: Total emails from uploaded file (e.g., 18,429)
- **Current Batch Size**: How many emails in current processing batch (e.g., 100)
- **Emails Queued**: How many emails currently in BullMQ queue
- **Sent**: Successfully processed emails (worker marked as "completed")
- **Failed**: Failed emails (worker marked as "failed")
- **Pending**: Emails not yet processed (database status "pending")
- **Resume Button**: Enabled when `canResume: true` AND `isProcessing: false`

## Implementation Notes

1. **Authentication:** Include `Authorization: Bearer <token>` header in all requests
2. **Pagination:** Use query parameters `?page=1&limit=10` for getAllBatches endpoint
3. **Date Handling:** All dates are ISO strings, parse them appropriately in frontend
4. **Resume Logic:** Check the `canResume` field before displaying resume functionality
5. **Statistics:** All percentage values include the `%` symbol
6. **Status Validation:** Only three possible status values exist
7. **UUID Validation:** All batchId parameters must be valid UUID format
8. **Email Storage:** All emails are persisted in database, not just queued temporarily

---

## Error Handling

All error responses follow this format:

```json
{
  "status": "number (HTTP status code)",
  "message": "string (error description)"
}
```

Common HTTP status codes:

- **400:** Bad Request - Invalid input parameters
- **401:** Unauthorized - Missing or invalid authentication token
- **403:** Forbidden - User lacks permission for the resource
- **404:** Not Found - Resource doesn't exist
- **500:** Internal Server Error - Server-side error occurred

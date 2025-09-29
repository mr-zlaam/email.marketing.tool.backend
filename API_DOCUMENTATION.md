# Email Marketing System API Documentation

## Overview

This is a bulk email marketing system that allows users to upload email lists and send campaigns in controlled batches. The system uses intelligent auto-pause functionality to prevent spam and maintain good sender reputation.

## Base URLs

- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://yourdomain.com/api/v1`

## Authentication

Most API endpoints require authentication using JWT Bearer tokens. Include the token in the Authorization header of your requests.

**Header Format:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

Endpoints that don't require authentication will be explicitly mentioned.

---

## User Management

The system supports regular users and admin users. Admin users have additional privileges to create other users and view all users in the system.

### Register New User

**Endpoint:** `POST /api/v1/user/registerUser`

**Description:** Creates a new user account in the system. This endpoint does not require authentication and is open for public registration.

**Authentication Required:** No

**Request Body:**

```json
{
  "username": "john_doe",
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Field Requirements:**

- `username`: Must be unique, alphanumeric characters and underscores only
- `fullName`: Full display name of the user
- `email`: Must be valid email format and unique in the system
- `password`: Minimum security requirements apply

**Success Response (HTTP 201):**

```json
{
  "success": true,
  "status": 201,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "user": {
      "uid": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "isVerified": false,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**

- **HTTP 400:** Username already exists, email already registered, or validation errors
- **HTTP 500:** Internal server error during user creation

### Admin Creates User

**Endpoint:** `POST /api/v1/user/adminCreatesTheUser`

**Description:** Allows admin users to create new user accounts. This is useful for administrative user management and bulk user creation by authorized personnel.

**Authentication Required:** Yes (Admin role only)

**Headers:**

```
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**

```json
{
  "username": "jane_smith",
  "fullName": "Jane Smith",
  "email": "jane@company.com",
  "password": "AdminCreatedPass123!"
}
```

**Success Response (HTTP 201):**

```json
{
  "success": true,
  "status": 201,
  "message": "User created successfully by admin",
  "data": {
    "user": {
      "uid": "660e8400-e29b-41d4-a716-446655440001",
      "username": "jane_smith",
      "fullName": "Jane Smith",
      "email": "jane@company.com",
      "role": "USER",
      "isVerified": false,
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

**Error Responses:**

- **HTTP 401:** Authentication token missing or invalid
- **HTTP 403:** User does not have admin privileges
- **HTTP 400:** Username or email already exists, validation errors
- **HTTP 500:** Internal server error

### Get All Users

**Endpoint:** `GET /api/v1/user/getAllUser`

**Description:** Retrieves a complete list of all users registered in the system. This endpoint is restricted to admin users only for security and privacy reasons.

**Authentication Required:** Yes (Admin role only)

**Headers:**

```
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Query Parameters:** None

**Success Response (HTTP 200):**

```json
{
  "success": true,
  "status": 200,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "uid": "550e8400-e29b-41d4-a716-446655440000",
        "username": "john_doe",
        "fullName": "John Doe",
        "email": "john@example.com",
        "role": "USER",
        "isVerified": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "uid": "660e8400-e29b-41d4-a716-446655440001",
        "username": "jane_smith",
        "fullName": "Jane Smith",
        "email": "jane@company.com",
        "role": "ADMIN",
        "isVerified": true,
        "createdAt": "2024-01-14T08:15:00.000Z",
        "updatedAt": "2024-01-14T08:15:00.000Z"
      }
    ],
    "totalUsers": 2
  }
}
```

**Response Fields Explanation:**

- `uid`: Unique identifier for each user
- `username`: User's chosen username
- `fullName`: User's display name
- `email`: User's email address
- `role`: Either "USER" or "ADMIN"
- `isVerified`: Whether the user has verified their email address
- `createdAt`: When the user account was created
- `updatedAt`: When the user account was last modified

**Error Responses:**

- **HTTP 401:** Authentication token missing or invalid
- **HTTP 403:** User does not have admin privileges
- **HTTP 500:** Internal server error

---

## Email Campaign Management

The email campaign system allows users to upload lists of email addresses and send marketing campaigns in controlled batches. The system includes intelligent auto-pause functionality to prevent overwhelming recipients and maintain good sender reputation.

### How the Email Batch System Works

Understanding the batch system is crucial for using the API effectively:

1. **File Upload Process**: When a user uploads a CSV or Excel file containing email addresses, the system extracts all email addresses and stores each email individually in the `individualEmails` table with automatic duplicate prevention.

2. **Database-Driven Processing**: The system uses PostgreSQL as the single source of truth. Each email is stored as a separate record with only essential information: email address, upload reference, and creation timestamp.

3. **Batch-by-Batch Queuing**: Instead of queuing all emails at once, the system only queues the current batch size (e.g., 50 emails) to BullMQ for processing.

4. **Worker Processing**: Background workers process emails one by one, applying the configured delay between sends. After successful processing, emails are **permanently deleted** from the database.

5. **Auto-Pause Mechanism**: After processing the specified number of emails (`emailsPerBatch`), the batch automatically pauses. Users can then resume to process the next batch.

6. **Resume Functionality**: When resuming, the system queries the database for all remaining emails (since only unprocessed emails exist) and queues the next batch. This approach ensures 100% reliable resume functionality.

7. **Duplicate Prevention**: The system uses a unique constraint on `(email, uploadId)` to automatically handle duplicate emails within the same upload using `ON CONFLICT DO NOTHING`.

8. **Progress Tracking**: The system tracks progress by counting remaining emails in the `individualEmails` table. When no emails remain, the upload is marked as "completed".

9. **Simplified Error Handling**: Failed emails remain in the database and can be retried later. The system doesn't track complex status states - emails either exist (pending) or are deleted (completed).

### Create Email Batch

**Endpoint:** `POST /api/v1/emailBatch/createEmailBatch`

**Description:** Creates a new email campaign batch or resumes an existing batch with new settings. This can be done either by uploading a new file containing email addresses or by resuming/updating an existing batch for a previous upload. The system uses a single batch per upload approach for simplified tracking and management.

**Authentication Required:** Yes

**Headers:**

```
Authorization: Bearer JWT_TOKEN
Content-Type: multipart/form-data (for file upload)
Content-Type: application/json (for existing upload)
```

**Option 1 - New File Upload:**

When uploading a new file, use multipart form data with the following fields:

- `file`: CSV or Excel file containing email addresses
- `batchName`: Descriptive name for this batch campaign
- `subject`: Email subject line for all emails in this batch
- `composedEmail`: HTML content of the email to be sent
- `delayBetweenEmails`: Number of seconds to wait between sending individual emails
- `emailsPerBatch`: Number of emails to process before automatically pausing the batch
- `scheduleTime`: When to start processing ("NOW" for immediate start)

**Option 2 - Resume Existing Batch:**

For resuming or updating an existing batch from previously uploaded email lists, send JSON data:

```json
{
  "uploadId": 123,
  "batchName": "Follow-up Campaign Wave 2",
  "subject": "Don't miss out on our special offer!",
  "composedEmail": "<html><body><h1>Special Offer</h1><p>Your email content here</p></body></html>",
  "delayBetweenEmails": "3",
  "emailsPerBatch": "25",
  "scheduleTime": "NOW"
}
```

**Field Requirements:**

- `batchName`: 3-50 characters, descriptive name for tracking
- `subject`: 3-50 characters, email subject line
- `composedEmail`: 10-10000 characters, HTML email content
- `delayBetweenEmails`: String representing seconds (e.g., "2" for 2 seconds)
- `emailsPerBatch`: String representing number (1-100)
- `scheduleTime`: Currently supports "NOW" for immediate processing

**File Requirements:**

- **Supported Formats**: CSV (.csv), Excel (.xlsx, .xls)
- **Maximum Size**: 10 MB per file
- **Required Structure**: Must contain a column named "email" with valid email addresses
- **Optional Columns**: firstName, lastName, or other custom fields

**What Happens Internally:**

When a batch is created or resumed, the following process occurs:

**For New File Upload:**

1. All email addresses are extracted from the uploaded file
2. Each email is inserted into the `individualEmails` table (only email address, uploadId, and timestamp)
3. Duplicate emails within the same upload are automatically ignored using `ON CONFLICT DO NOTHING`
4. The system counts actual inserted emails after deduplication
5. A batch record is created with the specified settings
6. The first batch of emails (up to `emailsPerBatch` limit) is queued in BullMQ
7. Background workers process emails with the configured delay, then permanently delete them from the database
8. After processing the batch size limit, the batch automatically pauses

**For Existing Upload (Resume):**

1. System counts all remaining emails in the `individualEmails` table (since only unprocessed emails exist)
2. If emails remain, the system updates the existing batch with new settings
3. The next batch of emails (up to `emailsPerBatch` limit) is queued in BullMQ
4. Workers continue processing with the new configuration
5. The batch status changes from "paused" to "processing"
6. This approach ensures 100% reliable resume functionality since the database only contains unprocessed emails

**Success Response (HTTP 201):**

**For New File Upload:**

```json
{
  "success": true,
  "status": 201,
  "message": "New email batch created for uploaded file",
  "data": {
    "batch": {
      "id": 1,
      "batchId": "550e8400-e29b-41d4-a716-446655440000",
      "batchName": "Summer Campaign 2024",
      "totalEmails": 50,
      "status": "processing",
      "emailsPerBatch": 50,
      "delayBetweenEmails": 2000,
      "subject": "Special Summer Offer",
      "composedEmail": "<html><body>Email content here</body></html>",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "uploadId": 1,
    "totalEmails": 1000,
    "status": "processing",
    "operation": "created"
  }
}
```

**For Resumed Batch:**

```json
{
  "success": true,
  "status": 201,
  "message": "Batch resumed under existing upload",
  "data": {
    "batch": {
      "id": 1,
      "batchId": "550e8400-e29b-41d4-a716-446655440000",
      "batchName": "Updated Campaign Name",
      "totalEmails": 25,
      "status": "processing",
      "emailsPerBatch": 25,
      "delayBetweenEmails": 3000,
      "subject": "Updated Subject Line",
      "composedEmail": "<html><body>Updated email content</body></html>",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T14:45:00.000Z"
    },
    "uploadId": 1,
    "totalEmails": 850,
    "status": "processing",
    "operation": "resumed"
  }
}
```

**Response Field Explanations:**

- `id`: Database ID of the batch record
- `batchId`: Unique UUID identifier for the batch
- `totalEmails`: Number of emails that will be processed in this batch
- `status`: Current processing status of the batch
- `delayBetweenEmails`: Delay in milliseconds (converted from seconds)
- `uploadId`: ID of the upload record this batch belongs to

**Error Responses:**

- **HTTP 400**: Invalid file format, no emails found in file, validation errors, batch currently processing (cannot update while active), or upload already completed
- **HTTP 401**: Authentication token missing or invalid
- **HTTP 404**: Upload ID not found (when using existing upload option)
- **HTTP 500**: Internal server error during batch creation or resume

### Get Uploads with Batches

**Endpoint:** `GET /api/v1/emailBatch/getUploadsWithBatches`

**Description:** Retrieves upload records along with their associated batch (single batch per upload). This is the primary endpoint for dashboard displays and campaign monitoring. It supports both paginated listing of all uploads and detailed view of specific uploads. Note that each upload will have exactly one batch associated with it.

**Authentication Required:** Yes

**Headers:**

```
Authorization: Bearer JWT_TOKEN
```

**Query Parameters:**

**Option 1 - Paginated List:**

- `page`: Page number (default: 1, minimum: 1)
- `pageSize`: Number of items per page (default: 10, minimum: 1, maximum: 100)

**Option 2 - Specific Upload:**

- `uploadId`: Specific upload ID to retrieve with all its batches

**Example URLs:**

- `/api/v1/emailBatch/getUploadsWithBatches?page=1&pageSize=10`
- `/api/v1/emailBatch/getUploadsWithBatches?uploadId=123`

**Success Response - Paginated List (HTTP 200):**

```json
{
  "success": true,
  "status": 200,
  "message": "Uploads with batches retrieved",
  "data": {
    "uploads": [
      {
        "id": 1,
        "uploadedFileName": "customer_email_list_2024.csv",
        "totalEmails": 1000,
        "remainingEmails": 900,
        "totalEmailSentToQueue": 1000,
        "status": "processing",
        "uploadedBy": "john_doe",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "metaData": {},
        "batches": [
          {
            "id": 1,
            "batchId": "550e8400-e29b-41d4-a716-446655440000",
            "batchName": "Welcome Campaign",
            "totalEmails": 50,
            "status": "paused",
            "emailsPerBatch": 50,
            "delayBetweenEmails": 2000,
            "subject": "Welcome to our service!",
            "createdAt": "2024-01-15T10:30:00.000Z",
            "updatedAt": "2024-01-15T11:00:00.000Z"
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalRecord": 5,
      "totalPage": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

**Success Response - Specific Upload (HTTP 200):**

```json
{
  "success": true,
  "status": 200,
  "message": "Upload with batches retrieved",
  "data": {
    "upload": {
      "id": 1,
      "uploadedFileName": "customer_email_list_2024.csv",
      "totalEmails": 1000,
      "remainingEmails": 950,
      "totalEmailSentToQueue": 1000,
      "status": "processing",
      "uploadedBy": "john_doe",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "metaData": {},
      "batches": [
        {
          "id": 1,
          "batchId": "550e8400-e29b-41d4-a716-446655440000",
          "batchName": "Welcome Campaign",
          "totalEmails": 50,
          "status": "paused",
          "emailsPerBatch": 50,
          "delayBetweenEmails": 2000,
          "subject": "Welcome to our service!"
        }
      ]
    },
    "totalBatches": 1
  }
}
```

**Response Field Explanations:**

**Upload Fields:**

- `id`: Unique identifier for the upload record
- `uploadedFileName`: Original name of the uploaded file
- `totalEmails`: Total number of unique email addresses found in the uploaded file (after deduplication)
- `remainingEmails`: Current number of emails still pending processing (real-time count from database)
- `totalEmailSentToQueue`: Number of emails that have been queued for processing
- `status`: Current status of the upload processing
- `uploadedBy`: Username of the user who uploaded the file
- `createdAt`: When the file was uploaded
- `metaData`: Additional metadata (empty object in new system)

**Individual Email Database Structure:**

The system now uses a simplified `individualEmails` table with only essential fields:

- `id`: Auto-incrementing primary key
- `email`: Email address (VARCHAR 255)
- `uploadId`: Foreign key reference to the upload record
- `createdAt`: Timestamp when email was added to database

**Key Design Decisions:**

- **No Status Field**: Emails are either in the database (unprocessed) or deleted (processed)
- **No User Data**: Only email addresses are stored, no firstName/lastName fields
- **Unique Constraint**: `(email, uploadId)` prevents duplicates within same upload
- **Cascading Delete**: When upload is deleted, all associated emails are automatically removed

**Batch Fields:**

- `id`: Database ID of the batch
- `batchId`: Unique UUID for the batch
- `batchName`: User-defined name for the batch
- `totalEmails`: Number of emails in the current batch being processed (up to `emailsPerBatch` limit)
- `status`: Current processing status of this batch (`processing`, `paused`, `completed`)
- `emailsPerBatch`: Configured auto-pause threshold (how many emails to process before pausing)
- `delayBetweenEmails`: Delay between individual emails in milliseconds
- `subject`: Email subject line for this batch

**Pagination Fields:**

- `currentPage`: Current page number being displayed
- `pageSize`: Number of items per page
- `totalRecord`: Total number of upload records available
- `totalPage`: Total number of pages available
- `hasNextPage`: Whether there are more pages after the current one
- `hasPreviousPage`: Whether there are pages before the current one

**Error Responses:**

- **HTTP 400**: Invalid pagination parameters or invalid uploadId format
- **HTTP 401**: Authentication token missing or invalid
- **HTTP 404**: Specific upload not found (when uploadId is specified)
- **HTTP 500**: Internal server error

---

## Key Improvements for Frontend Developers

The new database-driven approach provides several improvements for frontend integration:

### **Reliable Progress Tracking**
- Use `remainingEmails` field for accurate progress bars and completion percentages
- Formula: `Progress = (totalEmails - remainingEmails) / totalEmails * 100`
- Real-time updates without polling inconsistencies

### **Improved Resume Functionality**
- Resume operations now work reliably regardless of previous states
- No need to track complex queue states - the database is always accurate
- Resume button should be enabled when `remainingEmails > 0` and `status !== "processing"`

### **Simplified Error Handling**
- Failed emails remain in the database and can be retried later
- No complex status tracking - emails either exist (unprocessed) or are deleted (completed)
- System handles duplicates automatically with database constraints

### **Dashboard Recommendations**
```javascript
// Recommended progress calculation
const progressPercentage = Math.round(
  ((upload.totalEmails - upload.remainingEmails) / upload.totalEmails) * 100
);

// Check if upload can be resumed
const canResume = upload.remainingEmails > 0 &&
                  upload.batches[0]?.status !== "processing";

// Display status
const displayStatus = upload.remainingEmails === 0 ? "Completed" :
                     upload.batches[0]?.status || "Ready to start";
```

---

## Batch Status System

Understanding the different batch statuses is important for monitoring campaign progress and taking appropriate actions.

### Status Meanings

**pending**: The batch has been created and configured, but background workers have not yet started processing the emails. This is a temporary status that usually changes to "processing" within seconds.

**processing**: Background workers are actively sending emails from this batch. Emails are being processed one by one with the configured delay between sends. The batch will automatically change to "paused" when it reaches the `emailsPerBatch` limit.

**paused**: The batch has automatically paused after processing the configured number of emails (`emailsPerBatch`). This is the system's intelligent throttling mechanism to prevent overwhelming recipients and maintain good sender reputation. Users can create additional batches to continue processing.

**completed**: All emails assigned to this specific batch have been successfully processed. This means the batch has finished its designated work. Note that there may still be unprocessed emails in the original upload that require additional batches.

**failed**: The batch encountered an error during processing and has stopped. This could be due to various issues such as email service problems, configuration errors, or system failures.

### Auto-Pause System Explanation

The auto-pause system is a key feature that provides intelligent email sending control:

1. **Initial Setup**: User creates a batch with `emailsPerBatch: 50` setting
2. **Queue Population**: All emails from the upload are immediately queued in BullMQ
3. **Worker Processing**: Background workers begin processing emails one by one with the specified delay
4. **Redis Tracking**: The system tracks `processedCount` in Redis, incrementing after each email is sent
5. **Auto-Pause Trigger**: When `processedCount` reaches 50 (the configured limit):
   - Worker resets the counter to 0 in Redis
   - Worker sets the Redis `paused` flag to true
   - Worker updates the database batch status to "paused"
6. **Processing Halt**: The batch stops processing automatically
7. **Continuation**: User can create a new batch for the same upload to continue with remaining emails

This system provides precise control over email sending rates, helps prevent being flagged as spam, and allows for strategic campaign pacing.

---

## Error Response Format

All API endpoints follow a consistent error response format to ensure predictable error handling.

**Standard Error Response Structure:**

```json
{
  "success": false,
  "status": 400,
  "message": "Detailed error description explaining what went wrong",
  "data": null
}
```

### HTTP Status Codes

**200 OK**: Request successful, data retrieved or operation completed successfully

**201 Created**: Resource created successfully (user registration, batch creation)

**400 Bad Request**: Invalid request data, validation errors, or business logic violations. The message field will contain specific details about what was invalid.

**401 Unauthorized**: Authentication token is missing, invalid, or expired. The user needs to log in again or provide a valid token.

**403 Forbidden**: The authenticated user does not have sufficient privileges for the requested operation. For example, non-admin users trying to access admin-only endpoints.

**404 Not Found**: The requested resource does not exist. This could be a non-existent upload ID, batch ID, or user.

**500 Internal Server Error**: An unexpected error occurred on the server. These errors are logged for investigation and should be reported if they persist.

---

## Available Endpoints Summary

The API currently provides five core endpoints for essential functionality:

1. **POST /api/v1/user/registerUser**
   - Purpose: Create new user accounts
   - Authentication: Not required
   - Use case: Public user registration

2. **POST /api/v1/user/adminCreatesTheUser**
   - Purpose: Admin-managed user creation
   - Authentication: Required (Admin role)
   - Use case: Administrative user management

3. **GET /api/v1/user/getAllUser**
   - Purpose: Retrieve all system users
   - Authentication: Required (Admin role)
   - Use case: User management and administration

4. **POST /api/v1/emailBatch/createEmailBatch**
   - Purpose: Create email marketing campaigns
   - Authentication: Required
   - Use case: Campaign creation and email list processing

5. **GET /api/v1/emailBatch/getUploadsWithBatches**
   - Purpose: Monitor campaign progress and history
   - Authentication: Required
   - Use case: Dashboard display and campaign tracking

These endpoints provide complete functionality for user management and email campaign creation and monitoring. The system is designed to be scalable, secure, and efficient for bulk email marketing operations.

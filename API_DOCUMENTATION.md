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

1. **File Upload Process**: When a user uploads a CSV or Excel file containing email addresses, the system immediately extracts all email addresses and queues them in BullMQ for processing.

2. **Batch Configuration**: Each batch is created with specific settings including the number of emails to process before auto-pausing and the delay between individual email sends.

3. **Worker Processing**: Background workers process the queued emails one by one, respecting the configured delay between sends.

4. **Auto-Pause Mechanism**: After processing the specified number of emails (`emailsPerBatch`), the batch automatically pauses. This prevents overwhelming recipients and helps maintain good sender reputation.

5. **Database Optimization**: The system only updates the database when batch status changes (pause/complete), not after every individual email, ensuring optimal performance.

6. **Continuation Process**: Users can create additional batches for the same upload to continue processing remaining emails.

### Create Email Batch

**Endpoint:** `POST /api/v1/emailBatch/createEmailBatch`

**Description:** Creates a new email campaign batch. This can be done either by uploading a new file containing email addresses or by creating an additional batch for an existing upload. The system supports both scenarios to provide flexibility in campaign management.

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

**Option 2 - Existing Upload:**

For creating additional batches from previously uploaded email lists, send JSON data:

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

When a batch is created, the following process occurs:

1. If uploading a file, all email addresses are extracted and immediately queued in BullMQ
2. A batch record is created in the database with the specified settings
3. The `totalEmailSentToQueue` field is updated with the total number of emails queued
4. Background workers begin processing emails with the specified delay between sends
5. After processing the specified number of emails (`emailsPerBatch`), the batch automatically pauses

**Success Response (HTTP 201):**
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
      "totalEmails": 1000,
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
    "status": "processing"
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
- **HTTP 400**: Invalid file format, no emails found in file, validation errors, or active batch already exists for upload
- **HTTP 401**: Authentication token missing or invalid
- **HTTP 404**: Upload ID not found (when using existing upload option)
- **HTTP 500**: Internal server error during batch creation

### Get Uploads with Batches

**Endpoint:** `GET /api/v1/emailBatch/getUploadsWithBatches`

**Description:** Retrieves upload records along with their associated batches. This is the primary endpoint for dashboard displays and campaign monitoring. It supports both paginated listing of all uploads and detailed view of specific uploads.

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
        "totalEmailSentToQueue": 1000,
        "status": "processing",
        "uploadedBy": "john_doe",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "metaData": null,
        "batches": [
          {
            "id": 1,
            "batchId": "550e8400-e29b-41d4-a716-446655440000",
            "batchName": "Welcome Campaign Batch 1",
            "totalEmails": 50,
            "status": "paused",
            "emailsPerBatch": 50,
            "delayBetweenEmails": 2000,
            "subject": "Welcome to our service!",
            "createdAt": "2024-01-15T10:30:00.000Z",
            "updatedAt": "2024-01-15T11:00:00.000Z"
          },
          {
            "id": 2,
            "batchId": "660e8400-e29b-41d4-a716-446655440001",
            "batchName": "Welcome Campaign Batch 2",
            "totalEmails": 50,
            "status": "completed",
            "emailsPerBatch": 50,
            "delayBetweenEmails": 2000,
            "subject": "Welcome to our service!",
            "createdAt": "2024-01-15T12:00:00.000Z",
            "updatedAt": "2024-01-15T12:30:00.000Z"
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
      "totalEmailSentToQueue": 1000,
      "status": "processing",
      "uploadedBy": "john_doe",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "metaData": null,
      "batches": [
        {
          "id": 1,
          "batchId": "550e8400-e29b-41d4-a716-446655440000",
          "batchName": "Welcome Campaign Batch 1",
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
- `totalEmails`: Total number of email addresses found in the uploaded file
- `totalEmailSentToQueue`: Number of emails that have been queued for processing
- `status`: Current status of the upload processing
- `uploadedBy`: Username of the user who uploaded the file
- `createdAt`: When the file was uploaded
- `metaData`: Additional metadata (usually null)

**Batch Fields:**
- `id`: Database ID of the batch
- `batchId`: Unique UUID for the batch
- `batchName`: User-defined name for the batch
- `totalEmails`: Number of emails this specific batch will process
- `status`: Current processing status of this batch
- `emailsPerBatch`: Configured auto-pause threshold
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
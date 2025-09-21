# Email Marketing Server API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Base URL & Setup](#base-url--setup)
3. [Authentication & Authorization](#authentication--authorization)
4. [Database Models](#database-models)
5. [API Endpoints](#api-endpoints)
6. [Frontend Integration Guide](#frontend-integration-guide)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

## Overview

This is a comprehensive email marketing server built with TypeScript, Express.js, and PostgreSQL. The system provides user authentication, email batch processing, and background job queues for sending emails.

**Key Features:**

- JWT-based authentication with admin and user roles
- Email batch processing with file upload support (CSV, Excel, JSON)
- Background job queues using BullMQ and Redis
- Rate limiting and security middleware
- Email extraction from multiple file formats

## Base URL & Setup

**Base URL:** `http://localhost:8000/api/v1`

**Required Environment Variables:**

- `PORT` - Server port (default: from env)
- `DATABASE_URI` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `SENDGRID_API_KEY` - SendGrid API key for email sending
- `REDIS_HOST` & `REDIS_PORT` - Redis connection for job queues

## Authentication & Authorization

### Authentication Flow

The system uses JWT tokens with access and refresh token pattern:

- **Access Token:** Short-lived token for API requests (sent in Authorization header)
- **Refresh Token:** Long-lived token for generating new access tokens

### User Roles

- **ADMIN:** Full system access, can create/delete users, manage all email batches
- **USER:** Limited access, can create email batches and manage own data

### Token Usage

Include the access token in the Authorization header:

```
Authorization: Bearer {access_token}
```

## Database Models

### User Schema

```typescript
{
  uid: string (UUID, Primary Key)
  username: string (Unique, 50 chars max)
  fullName: string (100 chars max)
  email: string (Unique, 100 chars max)
  password: string (Hashed, 5000 chars max)
  role: "ADMIN" | "USER" (Default: "USER")
  isVerified: boolean (Default: false)
  OTP_TOKEN: string (Unique, nullable)
  OTP_TOKEN_VERSION: number (Default: 0)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Email Batch Schema

```typescript
{
  id: number (Primary Key)
  batchId: string (UUID, Unique)
  createdBy: string (References: user.username)
  batchName: string (100 chars max)
  composedEmail: string (Email content)
  totalEmails: number (Default: 0)
  emailsSent: number (Default: 0)
  emailsFailed: number (Default: 0)
  status: "pending" | "completed" | "failed"
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Email Schema

```typescript
{
  id: number (Primary Key)
  batchId: number (References: emailBatch.id)
  email: string (255 chars max)
  status: "pending" | "completed" | "failed"
  failedReason: string (500 chars max)
  attemptCount: number (Default: 0)
  lastAttemptAt: timestamp
  createdAt: timestamp
}
```

## API Endpoints

### Authentication Endpoints

#### 1. Register User (Admin Only via URL)

**Important:** This endpoint should be hidden in the frontend. Only accessible via direct URL for admin registration.

```http
POST /api/v1/user/registerUser
```

**Request Body:**

```json
{
  "username": "admin123",
  "fullName": "Admin User",
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Admin has been created successfully" | "Please check your email account for verification",
  "statusCode": 418 | 200
}
```

**Frontend Implementation:**

- Hide the signup page in navigation
- Only allow access via manual URL entry (e.g., `/admin-signup`)
- Add route guards to prevent normal users from accessing

#### 2. Admin Creates User

**Endpoint:** `POST /api/v1/user/adminCreatesTheUser`
**Authentication:** Required (Admin only)

```http
POST /api/v1/user/adminCreatesTheUser
Authorization: Bearer {admin_access_token}
```

**Request Body:**

```json
{
  "username": "newuser",
  "fullName": "New User",
  "email": "user@example.com",
  "password": "password123"
}
```

#### 3. Login User

```http
POST /api/v1/user/loginUser
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User has been logged in",
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### 4. Verify User Email

```http
PATCH /api/v1/user/verifyUser?token={verification_token}
```

#### 5. Resend OTP

```http
POST /api/v1/user/resendOTP
```

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

#### 6. Refresh Access Token

```http
POST /api/v1/user/refreshAccessToken
Authorization: Bearer {refresh_token}
```

### User Management Endpoints

#### 7. Get All Users (Admin Only)

```http
GET /api/v1/user/getAllUser
Authorization: Bearer {admin_access_token}
```

#### 8. Get Current User

```http
GET /api/v1/user/getCurrentUser
Authorization: Bearer {access_token}
```

#### 9. Get Single User (Admin Only)

```http
GET /api/v1/user/getSingleUser/{username}
Authorization: Bearer {admin_access_token}
```

#### 10. Delete User (Admin Only)

```http
DELETE /api/v1/user/deleteUser/{uid}
Authorization: Bearer {admin_access_token}
```

#### 11. Logout User

```http
POST /api/v1/user/logoutUser
Authorization: Bearer {access_token}
```

### Email Batch Endpoints

#### 12. Create Email Batch

```http
POST /api/v1/emailBatch/createEmailBatch
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Form Data:**

- `file`: Email file (CSV, Excel, JSON, TSV)
- `batchName`: string (3-50 chars)
- `delayBetweenEmails`: string (seconds)
- `emailsPerBatch`: string (1-100)
- `scheduleTime`: string ("NOW" or ISO date string)
- `composedEmail`: string (10-10000 chars)

**Supported File Formats:**

- CSV (`.csv`)
- Excel (`.xls`, `.xlsx`)
- JSON (`.json`) - Array of strings or objects with email property
- TSV/Text (`.tsv`, `.txt`)

**Example Request:**

```javascript
const formData = new FormData();
formData.append("file", emailFile);
formData.append("batchName", "Marketing Campaign 1");
formData.append("delayBetweenEmails", "5"); // 5 seconds
formData.append("emailsPerBatch", "50");
formData.append("scheduleTime", "NOW"); // or '2024-12-25T10:00:00Z'
formData.append("composedEmail", "Subject: Welcome!\n\nHello, welcome to our service!");
```

## Frontend Integration Guide

### 1. Authentication Setup

#### Login Flow

```javascript
// Login function
async function login(email, password) {
  const response = await fetch("/api/v1/user/loginUser", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (data.success) {
    // Store tokens
    localStorage.setItem("accessToken", data.data.accessToken);
    localStorage.setItem("refreshToken", data.data.refreshToken);

    // Redirect to dashboard
    window.location.href = "/dashboard";
  }
}
```

#### Token Refresh

```javascript
async function refreshToken() {
  const refreshToken = localStorage.getItem("refreshToken");

  const response = await fetch("/api/v1/user/refreshAccessToken", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${refreshToken}`
    }
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem("accessToken", data.data.accessToken);
    localStorage.setItem("refreshToken", data.data.refreshToken);
  }
}
```

#### API Request Helper

```javascript
async function apiRequest(url, options = {}) {
  const accessToken = localStorage.getItem("accessToken");

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers
    }
  });

  // Handle token expiration
  if (response.status === 401) {
    await refreshToken();
    // Retry request
    return apiRequest(url, options);
  }

  return response;
}
```

### 2. Admin Panel Setup

#### Hidden Signup Route

```javascript
// React Router example
import { Routes, Route, Navigate } from "react-router-dom";

function App() {
  return (
    <Routes>
      {/* Hidden admin signup - no navigation link */}
      <Route
        path="/admin-signup-hidden-url"
        element={<AdminSignup />}
      />

      {/* Public routes */}
      <Route
        path="/login"
        element={<Login />}
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />
    </Routes>
  );
}
```

#### User Management (Admin Only)

```javascript
// Get all users
async function getAllUsers() {
  const response = await apiRequest("/api/v1/user/getAllUser");
  return response.json();
}

// Delete user
async function deleteUser(uid) {
  const response = await apiRequest(`/api/v1/user/deleteUser/${uid}`, {
    method: "DELETE"
  });
  return response.json();
}

// Create user (Admin)
async function createUser(userData) {
  const response = await apiRequest("/api/v1/user/adminCreatesTheUser", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(userData)
  });
  return response.json();
}
```

### 3. Email Batch Management

#### File Upload Component

```javascript
function EmailBatchForm() {
  const [file, setFile] = useState(null);
  const [batchData, setBatchData] = useState({
    batchName: "",
    delayBetweenEmails: "5",
    emailsPerBatch: "50",
    scheduleTime: "NOW",
    composedEmail: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("file", file);

    Object.keys(batchData).forEach((key) => {
      formData.append(key, batchData[key]);
    });

    const response = await apiRequest("/api/v1/emailBatch/createEmailBatch", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      alert("Email batch created successfully!");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept=".csv,.xlsx,.xls,.json,.tsv,.txt"
        onChange={(e) => setFile(e.target.files[0])}
        required
      />

      <input
        type="text"
        placeholder="Batch Name"
        value={batchData.batchName}
        onChange={(e) => setBatchData({ ...batchData, batchName: e.target.value })}
        required
      />

      <input
        type="number"
        placeholder="Delay Between Emails (seconds)"
        value={batchData.delayBetweenEmails}
        onChange={(e) => setBatchData({ ...batchData, delayBetweenEmails: e.target.value })}
        required
      />

      <input
        type="number"
        placeholder="Emails Per Batch"
        value={batchData.emailsPerBatch}
        onChange={(e) => setBatchData({ ...batchData, emailsPerBatch: e.target.value })}
        min="1"
        max="100"
        required
      />

      <select
        value={batchData.scheduleTime}
        onChange={(e) => setBatchData({ ...batchData, scheduleTime: e.target.value })}>
        <option value="NOW">Send Now</option>
        <option value="custom">Schedule Later</option>
      </select>

      {batchData.scheduleTime === "custom" && (
        <input
          type="datetime-local"
          onChange={(e) => setBatchData({ ...batchData, scheduleTime: new Date(e.target.value).toISOString() })}
        />
      )}

      <textarea
        placeholder="Composed Email Content"
        value={batchData.composedEmail}
        onChange={(e) => setBatchData({ ...batchData, composedEmail: e.target.value })}
        minLength="10"
        maxLength="10000"
        required
      />

      <button type="submit">Create Email Batch</button>
    </form>
  );
}
```

### 4. Route Protection

#### Protected Route Component

```javascript
function ProtectedRoute({ children }) {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    return <Navigate to="/login" />;
  }

  return children;
}

function AdminRoute({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const response = await apiRequest("/api/v1/user/getCurrentUser");
        const userData = await response.json();

        if (userData.success && userData.data.role === "ADMIN") {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  return children;
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "error": "Additional error details"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (Invalid/missing token)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `418` - I'm a teapot (Admin creation success)
- `429` - Too Many Requests (Rate limited)
- `500` - Internal Server Error

### Frontend Error Handling

```javascript
async function handleApiResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    switch (response.status) {
      case 401:
        // Token expired, try refresh
        await refreshToken();
        break;
      case 403:
        // Insufficient permissions
        alert("You do not have permission to perform this action");
        break;
      case 429:
        // Rate limited
        alert("Too many requests. Please try again later.");
        break;
      default:
        alert(data.message || "An error occurred");
    }
    throw new Error(data.message);
  }

  return data;
}
```

## Rate Limiting

The API implements rate limiting on sensitive endpoints:

- **Login:** 5 attempts per 2 minutes
- **Resend OTP:** 1 request per 2 minutes
- **Update Operations:** 1 request per 24 hours

Rate limit headers are included in responses:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## Security Features

1. **CORS Configuration:** Configurable allowed origins
2. **Helmet:** Security headers middleware
3. **JWT Tokens:** Secure authentication with token versioning
4. **Password Hashing:** bcrypt for password security
5. **Input Validation:** Zod schema validation
6. **File Upload Security:** Multer with file type restrictions
7. **Rate Limiting:** Protection against abuse

## Development Notes

- **Database:** PostgreSQL with Drizzle ORM
- **Queue System:** BullMQ with Redis
- **Email Service:** SendGrid integration
- **File Processing:** Worker threads for large file processing
- **Logging:** Winston with daily rotate file
- **Environment:** TypeScript with Bun runtime

For any questions or issues, refer to the source code or contact the development team.

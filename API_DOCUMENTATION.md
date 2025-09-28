# 📧 Email Marketing System - API Documentation

## 🚀 System Overview

This is a **comprehensive email marketing system** designed for bulk email campaigns with intelligent batch processing, rate limiting, and real-time tracking. The system allows users to upload email lists, create batches with custom settings, and monitor campaign progress with detailed analytics.

### 🏗️ Architecture

```
📁 Frontend Application
    ↓ (HTTP Requests)
📁 Express.js API Server (/api/v1)
    ↓ (Database Operations)
📁 PostgreSQL Database (User Data, Batches, Uploads)
    ↓ (Queue Management)
📁 Redis + BullMQ (Email Queue, Batch Tracking)
    ↓ (Email Processing)
📁 Background Workers (Email Sending)
```

---

## 🔗 Base URL
```
Production: https://your-domain.com/api/v1
Development: http://localhost:3000/api/v1
```

---

## 🔐 Authentication

All endpoints (except auth) require **JWT Bearer Token** in headers:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

---

## 🎯 Email Marketing Campaign Flow

### Step 1: User Authentication
1. **Register** → **Verify OTP** → **Login** → Get JWT Token

### Step 2: Create Email Campaign
2. **Upload CSV/Excel** with emails → Create first batch → System queues all emails

### Step 3: Batch Management
3. **Monitor Progress** → **Pause/Resume** → **Create Additional Batches** for remaining emails

### Step 4: Analytics & Tracking
4. **View Upload History** → **Track Batch Progress** → **Monitor Email Status**

---

## 📚 API Endpoints

### 👤 User Management

#### Register User
```http
POST /api/v1/user/registerUser
```
**Body:**
```json
{
  "username": "john_doe",
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```
**Response:**
```json
{
  "success": true,
  "status": 201,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "user": {
      "uid": "uuid-123",
      "username": "john_doe",
      "email": "john@example.com",
      "isVerified": false
    }
  }
}
```

#### Verify User (OTP)
```http
PATCH /api/v1/user/verifyUser
```
**Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

#### Login User
```http
POST /api/v1/user/loginUser
```
**Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```
**Response:**
```json
{
  "success": true,
  "status": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "uid": "uuid-123",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "USER"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

#### Get Current User
```http
GET /api/v1/user/getCurrentUser
```
**Headers:** `Authorization: Bearer JWT_TOKEN`

#### Refresh Token
```http
POST /api/v1/user/refreshAccessToken
```
**Body:**
```json
{
  "refreshToken": "your-refresh-token"
}
```

#### Logout User
```http
POST /api/v1/user/logoutUser
```
**Headers:** `Authorization: Bearer JWT_TOKEN`

---

### 📧 Email Campaign Management

#### Create Email Batch (Upload + Batch)
```http
POST /api/v1/emailBatch/createEmailBatch
```
**Headers:**
```
Authorization: Bearer JWT_TOKEN
Content-Type: multipart/form-data
```
**Form Data:**
```javascript
const formData = new FormData();
formData.append('file', emailFile); // CSV/Excel file
formData.append('batchName', 'Summer Campaign 2024');
formData.append('subject', 'Special Summer Offer!');
formData.append('composedEmail', '<h1>Your Email HTML Content</h1>');
formData.append('delayBetweenEmails', '2'); // seconds
formData.append('emailsPerBatch', '50'); // emails per batch before auto-pause
formData.append('scheduleTime', 'NOW');
```

**Alternative - Create Batch for Existing Upload:**
```json
{
  "uploadId": 123,
  "batchName": "Followup Campaign",
  "subject": "Don't Miss Out!",
  "composedEmail": "<p>Followup email content</p>",
  "delayBetweenEmails": "3",
  "emailsPerBatch": "25",
  "scheduleTime": "NOW"
}
```

**Response:**
```json
{
  "success": true,
  "status": 201,
  "message": "New email batch created for uploaded file",
  "data": {
    "batch": {
      "id": 1,
      "batchId": "uuid-batch-123",
      "batchName": "Summer Campaign 2024",
      "totalEmails": 1000,
      "status": "processing",
      "emailsPerBatch": 50,
      "delayBetweenEmails": 2000,
      "subject": "Special Summer Offer!",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "uploadId": 1,
    "totalEmails": 1000,
    "status": "processing"
  }
}
```

#### Get Uploads with Batches (📊 Main Dashboard Endpoint)
```http
GET /api/v1/emailBatch/getUploadsWithBatches
```
**Headers:** `Authorization: Bearer JWT_TOKEN`

**Query Parameters:**
```
?page=1&pageSize=10                    // Paginated list
?uploadId=123                          // Specific upload details
```

**Response:**
```json
{
  "success": true,
  "status": 200,
  "message": "Uploads with batches retrieved",
  "data": {
    "uploads": [
      {
        "id": 1,
        "uploadedFileName": "summer_leads.csv",
        "totalEmails": 1000,
        "totalEmailSentToQueue": 1000,
        "status": "processing",
        "uploadedBy": "john_doe",
        "createdAt": "2024-01-15T10:00:00Z",
        "metaData": null,
        "batches": [
          {
            "id": 1,
            "batchId": "uuid-batch-123",
            "batchName": "Summer Campaign Batch 1",
            "totalEmails": 50,
            "status": "paused",
            "emailsPerBatch": 50,
            "delayBetweenEmails": 2000,
            "subject": "Special Summer Offer!",
            "createdAt": "2024-01-15T10:30:00Z",
            "updatedAt": "2024-01-15T11:00:00Z"
          },
          {
            "id": 2,
            "batchId": "uuid-batch-456",
            "batchName": "Summer Campaign Batch 2",
            "totalEmails": 50,
            "status": "completed",
            "emailsPerBatch": 50,
            "delayBetweenEmails": 2000,
            "subject": "Special Summer Offer!",
            "createdAt": "2024-01-15T12:00:00Z",
            "updatedAt": "2024-01-15T12:30:00Z"
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

#### Get All Batches (Simple List)
```http
GET /api/v1/emailBatch/getAllBatches
```
**Headers:** `Authorization: Bearer JWT_TOKEN`

#### Delete Batch
```http
DELETE /api/v1/emailBatch/deleteBatch/:batchId
```
**Headers:** `Authorization: Bearer JWT_TOKEN`
**URL:** `/api/v1/emailBatch/deleteBatch/uuid-batch-123`

---

## 🎛️ Batch Status Management

### Batch Statuses:
- **`pending`** - Batch created but not started
- **`processing`** - Currently sending emails
- **`paused`** - Auto-paused after reaching `emailsPerBatch` limit
- **`completed`** - All emails in batch sent successfully
- **`failed`** - Batch failed due to error

### How Auto-Pause Works:
1. Create batch with `emailsPerBatch: 50`
2. System processes 50 emails → **Auto-pauses**
3. User can create new batch for remaining emails
4. Or resume existing batch (if implemented)

---

## 📊 Frontend Integration Examples

### React.js Integration

#### 1. Authentication Hook
```javascript
// hooks/useAuth.js
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const response = await fetch('/api/v1/user/loginUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (data.success) {
      setToken(data.data.tokens.accessToken);
      setUser(data.data.user);
      localStorage.setItem('accessToken', data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
    }
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return { token, user, login, logout };
};
```

#### 2. Email Campaign Hook
```javascript
// hooks/useEmailCampaigns.js
import { useState, useEffect } from 'react';

export const useEmailCampaigns = (token) => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(null);

  const fetchUploads = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/emailBatch/getUploadsWithBatches?page=${page}&pageSize=${pageSize}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const data = await response.json();
      if (data.success) {
        setUploads(data.data.uploads);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBatch = async (formData) => {
    const response = await fetch('/api/v1/emailBatch/createEmailBatch', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      fetchUploads(); // Refresh list
    }
    return data;
  };

  useEffect(() => {
    if (token) fetchUploads();
  }, [token]);

  return { uploads, loading, pagination, fetchUploads, createBatch };
};
```

#### 3. Campaign Dashboard Component
```javascript
// components/CampaignDashboard.jsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEmailCampaigns } from '../hooks/useEmailCampaigns';

const CampaignDashboard = () => {
  const { token, user } = useAuth();
  const { uploads, loading, pagination, fetchUploads } = useEmailCampaigns(token);

  const getStatusColor = (status) => {
    const colors = {
      'processing': 'bg-blue-100 text-blue-800',
      'paused': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'pending': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div>Loading campaigns...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Email Campaigns</h1>

      {uploads.map(upload => (
        <div key={upload.id} className="bg-white shadow rounded-lg mb-6 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">{upload.uploadedFileName}</h3>
              <p className="text-gray-600">
                {upload.totalEmails} total emails •
                {upload.totalEmailSentToQueue} queued
              </p>
            </div>
            <span className={`px-2 py-1 rounded text-sm ${getStatusColor(upload.status)}`}>
              {upload.status}
            </span>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Batches ({upload.batches.length})</h4>
            {upload.batches.map(batch => (
              <div key={batch.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{batch.batchName}</p>
                    <p className="text-sm text-gray-600">
                      {batch.totalEmails} emails • {batch.emailsPerBatch} per batch •
                      {batch.delayBetweenEmails/1000}s delay
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${getStatusColor(batch.status)}`}>
                    {batch.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {pagination && (
        <div className="flex justify-center space-x-2 mt-6">
          {pagination.hasPreviousPage && (
            <button
              onClick={() => fetchUploads(pagination.currentPage - 1)}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Previous
            </button>
          )}
          <span className="px-4 py-2">
            Page {pagination.currentPage} of {pagination.totalPage}
          </span>
          {pagination.hasNextPage && (
            <button
              onClick={() => fetchUploads(pagination.currentPage + 1)}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CampaignDashboard;
```

---

## 📁 File Upload Requirements

### Supported Formats:
- **CSV** (.csv)
- **Excel** (.xlsx, .xls)

### File Structure:
```csv
email,firstName,lastName
john@example.com,John,Doe
jane@example.com,Jane,Smith
mike@example.com,Mike,Johnson
```

### File Size Limits:
- Maximum file size: **10MB**
- Maximum emails per file: **10,000**

---

## ⚠️ Error Handling

### Standard Error Response:
```json
{
  "success": false,
  "status": 400,
  "message": "Invalid request parameters",
  "data": null
}
```

### Common Error Codes:
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (invalid/missing token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found (resource doesn't exist)
- **429** - Too Many Requests (rate limited)
- **500** - Internal Server Error

### Rate Limiting:
- **Login**: 5 attempts per 2 minutes
- **OTP**: 1 request per 2 minutes
- **Profile Updates**: 1 request per 24 hours

---

## 🚀 Production Deployment Checklist

1. **Environment Variables:**
   ```env
   NODE_ENV=production
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   JWT_SECRET=your-secret-key
   ALLOWED_REGIONS=["https://yourdomain.com"]
   ```

2. **CORS Configuration:**
   - Update `ALLOWED_REGIONS` in environment
   - Ensure frontend domain is whitelisted

3. **Rate Limiting:**
   - Configure Redis for rate limiting
   - Adjust limits based on requirements

4. **File Upload:**
   - Configure proper storage (AWS S3, etc.)
   - Set appropriate file size limits

---

## 📞 Support & Integration Help

For technical support or integration assistance:
- **Documentation**: This file
- **TypeScript Types**: Available in `/src/types/types.ts`
- **Validation Schemas**: Check `/src/features/*/validation/*.ts`
- **Example Requests**: Use the examples above

---

**🎉 Happy Building! The system is designed for scale, performance, and ease of use.**
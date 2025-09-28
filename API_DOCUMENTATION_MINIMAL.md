# 📧 Email Marketing System - Essential API Documentation

## 🚀 System Overview

This documentation covers only the **essential endpoints** for initial frontend integration:
- User registration and admin user creation
- Email batch creation and retrieval

---

## 🔗 Base URL
```
Production: https://your-domain.com/api/v1
Development: http://localhost:3000/api/v1
```

---

## 🔐 Authentication

Most endpoints require **JWT Bearer Token** in headers:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

---

## 📚 Essential API Endpoints

### 👤 User Management (Limited Scope)

#### 1. Register User
```http
POST /api/v1/user/registerUser
```
**Description:** Register a new user account
**Authentication:** Not required

**Request Body:**
```json
{
  "username": "john_doe",
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (201 Created):**
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
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**
```json
// 400 - Validation Error
{
  "success": false,
  "status": 400,
  "message": "Username already exists"
}

// 400 - Email exists
{
  "success": false,
  "status": 400,
  "message": "Email already registered"
}
```

#### 2. Admin Creates User
```http
POST /api/v1/user/adminCreatesTheUser
```
**Description:** Admin creates a user account (admin-only endpoint)
**Authentication:** Required (Admin role)

**Headers:**
```
Authorization: Bearer JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "jane_admin",
  "fullName": "Jane Admin",
  "email": "jane@company.com",
  "password": "AdminPass123!"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "status": 201,
  "message": "User created successfully by admin",
  "data": {
    "user": {
      "uid": "660e8400-e29b-41d4-a716-446655440001",
      "username": "jane_admin",
      "fullName": "Jane Admin",
      "email": "jane@company.com",
      "role": "USER",
      "isVerified": false,
      "createdBy": "admin_user",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**
```json
// 401 - Not authenticated
{
  "success": false,
  "status": 401,
  "message": "Authentication token required"
}

// 403 - Not admin
{
  "success": false,
  "status": 403,
  "message": "Admin access required"
}
```

---

### 📧 Email Batch Management (Limited Scope)

#### 1. Create Email Batch
```http
POST /api/v1/emailBatch/createEmailBatch
```
**Description:** Create a new email batch by uploading a file or using existing upload
**Authentication:** Required

**Headers:**
```
Authorization: Bearer JWT_TOKEN
Content-Type: multipart/form-data
```

**Form Data (New File Upload):**
```javascript
const formData = new FormData();
formData.append('file', emailFile);           // CSV/Excel file
formData.append('batchName', 'Summer Campaign 2024');
formData.append('subject', 'Special Summer Offer!');
formData.append('composedEmail', '<h1>Your Email HTML Content</h1>');
formData.append('delayBetweenEmails', '2');   // seconds
formData.append('emailsPerBatch', '50');      // emails per batch before auto-pause
formData.append('scheduleTime', 'NOW');
```

**Alternative (Existing Upload):**
```javascript
// Send as JSON instead of FormData
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

**Response (201 Created):**
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
      "subject": "Special Summer Offer!",
      "composedEmail": "<h1>Your Email HTML Content</h1>",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "uploadId": 1,
    "totalEmails": 1000,
    "status": "processing"
  }
}
```

**Validation Rules:**
- `batchName`: 3-50 characters
- `subject`: 3-50 characters
- `composedEmail`: 10-10000 characters
- `delayBetweenEmails`: String (seconds)
- `emailsPerBatch`: String, 1-100
- `scheduleTime`: String, 3-50 characters

**File Requirements:**
- **Formats:** CSV (.csv), Excel (.xlsx, .xls)
- **Size:** Maximum 10MB
- **Structure:**
```csv
email,firstName,lastName
john@example.com,John,Doe
jane@example.com,Jane,Smith
```

**Error Responses:**
```json
// 400 - Validation Error
{
  "success": false,
  "status": 400,
  "message": "Batch name must be at least 3 characters"
}

// 400 - No emails found
{
  "success": false,
  "status": 400,
  "message": "No valid emails found in the uploaded file"
}

// 400 - Active batch exists (for existing upload)
{
  "success": false,
  "status": 400,
  "message": "An active batch already exists for this upload. Please wait for it to finish."
}
```

#### 2. Get Uploads with Batches
```http
GET /api/v1/emailBatch/getUploadsWithBatches
```
**Description:** Retrieve uploads with their associated batches (paginated)
**Authentication:** Required

**Headers:**
```
Authorization: Bearer JWT_TOKEN
```

**Query Parameters:**
```
?page=1&pageSize=10        // Paginated list of all uploads
?uploadId=123              // Get specific upload with its batches
```

**Response (200 OK) - Paginated List:**
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
        "createdAt": "2024-01-15T10:00:00.000Z",
        "metaData": null,
        "batches": [
          {
            "id": 1,
            "batchId": "550e8400-e29b-41d4-a716-446655440000",
            "batchName": "Summer Campaign Batch 1",
            "totalEmails": 50,
            "status": "paused",
            "emailsPerBatch": 50,
            "delayBetweenEmails": 2000,
            "subject": "Special Summer Offer!",
            "createdAt": "2024-01-15T10:30:00.000Z",
            "updatedAt": "2024-01-15T11:00:00.000Z"
          },
          {
            "id": 2,
            "batchId": "660e8400-e29b-41d4-a716-446655440001",
            "batchName": "Summer Campaign Batch 2",
            "totalEmails": 50,
            "status": "completed",
            "emailsPerBatch": 50,
            "delayBetweenEmails": 2000,
            "subject": "Special Summer Offer!",
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

**Response (200 OK) - Specific Upload:**
```json
{
  "success": true,
  "status": 200,
  "message": "Upload with batches retrieved",
  "data": {
    "upload": {
      "id": 1,
      "uploadedFileName": "summer_leads.csv",
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
          "batchName": "Summer Campaign Batch 1",
          "totalEmails": 50,
          "status": "paused",
          "emailsPerBatch": 50,
          "delayBetweenEmails": 2000,
          "subject": "Special Summer Offer!",
          "createdAt": "2024-01-15T10:30:00.000Z",
          "updatedAt": "2024-01-15T11:00:00.000Z"
        }
      ]
    },
    "totalBatches": 1
  }
}
```

**Error Responses:**
```json
// 400 - Invalid pagination
{
  "success": false,
  "status": 400,
  "message": "Invalid pagination parameters. Page must be >= 1, pageSize between 1-100"
}

// 404 - Upload not found (when uploadId specified)
{
  "success": false,
  "status": 404,
  "message": "Upload not found"
}
```

---

## 🎛️ Batch Status Reference

### Status Values:
- **`pending`** - Batch created but not started
- **`processing`** - Currently sending emails
- **`paused`** - Auto-paused after reaching `emailsPerBatch` limit
- **`completed`** - All emails in batch sent successfully
- **`failed`** - Batch failed due to error

### Auto-Pause Behavior:
1. Create batch with `emailsPerBatch: 50`
2. System processes 50 emails → **Automatically pauses**
3. Batch status changes from `processing` → `paused`
4. User can create new batch for remaining emails

---

## 📊 Frontend Integration Examples

### React.js Implementation

#### 1. User Registration Hook
```javascript
// hooks/useUserRegistration.js
import { useState } from 'react';

export const useUserRegistration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const registerUser = async (userData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/user/registerUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const adminCreateUser = async (userData, adminToken) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/user/adminCreatesTheUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { registerUser, adminCreateUser, loading, error };
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
  const [error, setError] = useState(null);

  const fetchUploads = async (page = 1, pageSize = 10) => {
    setLoading(true);
    setError(null);

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
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createBatch = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/emailBatch/createEmailBatch', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        fetchUploads(); // Refresh list
        return data;
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUploads();
  }, [token]);

  return { uploads, loading, pagination, error, fetchUploads, createBatch };
};
```

#### 3. Registration Form Component
```javascript
// components/UserRegistrationForm.jsx
import React, { useState } from 'react';
import { useUserRegistration } from '../hooks/useUserRegistration';

const UserRegistrationForm = ({ isAdmin = false, adminToken = null }) => {
  const { registerUser, adminCreateUser, loading, error } = useUserRegistration();
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isAdmin && adminToken) {
        await adminCreateUser(formData, adminToken);
        alert('User created successfully by admin!');
      } else {
        await registerUser(formData);
        alert('User registered successfully! Please check email for verification.');
      }

      // Reset form
      setFormData({ username: '', fullName: '', email: '', password: '' });
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold">
        {isAdmin ? 'Admin: Create User' : 'Register New User'}
      </h2>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      <input
        type="text"
        name="username"
        placeholder="Username"
        value={formData.username}
        onChange={handleChange}
        required
        className="w-full p-2 border rounded"
      />

      <input
        type="text"
        name="fullName"
        placeholder="Full Name"
        value={formData.fullName}
        onChange={handleChange}
        required
        className="w-full p-2 border rounded"
      />

      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
        onChange={handleChange}
        required
        className="w-full p-2 border rounded"
      />

      <input
        type="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleChange}
        required
        className="w-full p-2 border rounded"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white p-2 rounded disabled:opacity-50"
      >
        {loading ? 'Creating...' : (isAdmin ? 'Create User' : 'Register')}
      </button>
    </form>
  );
};

export default UserRegistrationForm;
```

#### 4. Campaign Creation Form
```javascript
// components/EmailBatchForm.jsx
import React, { useState } from 'react';
import { useEmailCampaigns } from '../hooks/useEmailCampaigns';

const EmailBatchForm = ({ token }) => {
  const { createBatch, loading, error } = useEmailCampaigns(token);
  const [formData, setFormData] = useState({
    batchName: '',
    subject: '',
    composedEmail: '',
    delayBetweenEmails: '2',
    emailsPerBatch: '50',
    scheduleTime: 'NOW'
  });
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    formDataToSend.append('file', file);

    Object.keys(formData).forEach(key => {
      formDataToSend.append(key, formData[key]);
    });

    try {
      await createBatch(formDataToSend);
      alert('Email batch created successfully!');
      // Reset form
      setFormData({
        batchName: '',
        subject: '',
        composedEmail: '',
        delayBetweenEmails: '2',
        emailsPerBatch: '50',
        scheduleTime: 'NOW'
      });
      setFile(null);
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold">Create Email Batch</h2>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={(e) => setFile(e.target.files[0])}
        required
        className="w-full p-2 border rounded"
      />

      <input
        type="text"
        placeholder="Batch Name (3-50 chars)"
        value={formData.batchName}
        onChange={(e) => setFormData({...formData, batchName: e.target.value})}
        required
        className="w-full p-2 border rounded"
      />

      <input
        type="text"
        placeholder="Email Subject (3-50 chars)"
        value={formData.subject}
        onChange={(e) => setFormData({...formData, subject: e.target.value})}
        required
        className="w-full p-2 border rounded"
      />

      <textarea
        placeholder="Email Content (HTML supported)"
        value={formData.composedEmail}
        onChange={(e) => setFormData({...formData, composedEmail: e.target.value})}
        required
        rows={4}
        className="w-full p-2 border rounded"
      />

      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          placeholder="Delay (seconds)"
          value={formData.delayBetweenEmails}
          onChange={(e) => setFormData({...formData, delayBetweenEmails: e.target.value})}
          className="p-2 border rounded"
        />

        <input
          type="number"
          placeholder="Emails per batch"
          value={formData.emailsPerBatch}
          onChange={(e) => setFormData({...formData, emailsPerBatch: e.target.value})}
          className="p-2 border rounded"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !file}
        className="w-full bg-green-500 text-white p-2 rounded disabled:opacity-50"
      >
        {loading ? 'Creating Batch...' : 'Create Email Batch'}
      </button>
    </form>
  );
};

export default EmailBatchForm;
```

---

## ⚠️ Error Handling

### Standard Error Response Format:
```json
{
  "success": false,
  "status": 400,
  "message": "Error description",
  "data": null
}
```

### Common HTTP Status Codes:
- **200** - Success
- **201** - Created successfully
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (missing/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **500** - Internal Server Error

---

## 🚀 Next Steps

1. **Implement user registration** and admin user creation
2. **Build email batch creation** with file upload
3. **Create dashboard** to display uploads and batches
4. **Add authentication** (login/logout) when ready
5. **Implement batch controls** (pause/resume) in future phases

---

**This covers all essential functionality for your initial implementation!** 🎉
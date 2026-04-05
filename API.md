# API Documentation

This document lists all API endpoints, auth flow, and request/response formats.

## Base URL

`http://localhost:3000`

## Auth Overview

- Access token: JWT (short-lived)
- Refresh token: rotated on `/auth/refresh`
- Use JWT in header:
```
Authorization: Bearer <token>
```

## Status Codes (common)

- `200` OK
- `201` Created
- `204` No Content
- `400` Validation error
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `423` Locked

---

## Auth

### POST `/auth/register`
Bootstrap or admin-only user creation.

**Request**
```json
{
  "name": "Admin",
  "email": "admin+123@example.com",
  "password": "Str0ng!Password123",
  "role": "admin"
}
```

**Notes**
- If no users exist, set `ALLOW_BOOTSTRAP=true` and restart server.
- Otherwise, include admin JWT.

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Admin",
    "email": "admin+123@example.com",
    "role": "admin",
    "status": "active",
    "createdAt": "..."
  }
}
```

### POST `/auth/login`

**Request**
```json
{
  "email": "admin+123@example.com",
  "password": "Str0ng!Password123"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "refreshToken": "<refresh>",
    "user": {
      "id": "...",
      "name": "Admin",
      "email": "admin+123@example.com",
      "role": "admin",
      "status": "active"
    }
  }
}
```

### POST `/auth/refresh`

**Request**
```json
{
  "refreshToken": "<refresh>"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "refreshToken": "<refresh>"
  }
}
```

### POST `/auth/logout`

**Request**
```json
{
  "refreshToken": "<refresh>"
}
```

**Response 200**
```json
{
  "success": true,
  "data": { "loggedOut": true }
}
```

---

## Users (admin only)

### POST `/users`

**Request**
```json
{
  "name": "Analyst",
  "email": "analyst+123@example.com",
  "password": "Str0ng!Password123",
  "role": "analyst"
}
```

### GET `/users`

### GET `/users/{id}`

### PATCH `/users/{id}`

**Request**
```json
{
  "role": "analyst",
  "status": "active"
}
```

---

## Records

### POST `/records` (admin)

**Request**
```json
{
  "amount": 1200,
  "type": "income",
  "category": "salary",
  "date": "2026-04-05T10:00:00.000Z",
  "notes": "Monthly payroll"
}
```

### GET `/records`

**Query params**
- `dateFrom` (ISO datetime)
- `dateTo` (ISO datetime)
- `category`
- `type` (`income` | `expense`)
- `search` (matches category/notes)
- `page` (default `1`)
- `pageSize` (default `20`, max `100`)
- `includeDeleted` (`true` to include soft-deleted)

**Response**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

### GET `/records/{id}`
Returns 404 for soft-deleted records.

### PATCH `/records/{id}` (admin)

### DELETE `/records/{id}` (admin)
Soft delete (sets `deletedAt`).

---

## Summary

### GET `/summary`
Totals, net balance, category totals (soft-deleted records excluded).

### GET `/summary/recent`
Query: `limit` (default `5`).

### GET `/summary/trends`
Query: `period` (`monthly` | `weekly`), `dateFrom`, `dateTo`.
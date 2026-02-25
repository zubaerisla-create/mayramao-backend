# Admin Authentication System

## Overview
This admin authentication system allows admins to login with email and password, and receive JWT access and refresh tokens for secure API access.

> 💡 Users (not admins) may also sign up or log in with Google; a separate endpoint handles Google OAuth tokens, creating the user if needed and returning JWT tokens. See the section "Google Authentication" below.

## Setup Instructions

### 1. Create Default Admin User

Update your `.env` file with admin credentials:
```
ADMIN_EMAIL=zubaerislam703@gmail.com
ADMIN_PASSWORD=Admin@123456
```

Run the seed script to create the admin user(s):
```bash
npx ts-node scripts/seedAdmin.ts
```

The script will create both primary and any additional admins defined by `ADMIN_EMAIL_2` / `ADMIN_PASSWORD_2`.
Or add a script in `package.json`:
```json
"scripts": {
  "seed:admin": "ts-node scripts/seedAdmin.ts"
}
```

Then run:
```bash
npm run seed:admin
```

### 2. Admin Login

**Endpoint:**
```
POST /api/v1/admin/login
```

**Request Body:**
```json
{
  "email": "zubaerislam703@gmail.com",
  "password": "Admin@123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin login successful",
  "admin": {
    "id": "...",
    "email": "zubaerislam703@gmail.com",
    "role": "superadmin"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### 3. Password Reset (Admin)

Admins can reset their password via OTP sent to their email.

1. **Forgot password**
   ```http
   POST /api/v1/admin/forgot-password
   Content-Type: application/json

   { "email": "admin@mayramao.com" }
   ```
   Response:
   ```json
   { "success": true, "message": "Password reset OTP sent to admin email" }
   ```

2. **Resend OTP**
   ```http
   POST /api/v1/admin/resend-otp
   Content-Type: application/json

   { "email": "admin@mayramao.com" }
   ```
   Response same as above.

3. **Reset password**
   ```http
   POST /api/v1/admin/reset-password
   Content-Type: application/json

   {
     "email": "admin@mayramao.com",
     "otp": "123456",
     "newPassword": "newpass123",
     "confirmPassword": "newpass123"
   }
   ```
   Response:
   ```json
   { "success": true, "message": "Password reset successfully" }
   ```

### 4. Using Access Token

Include the access token in the Authorization header for protected routes:
```
Authorization: Bearer <accessToken>
```

Example:
```bash
curl -H "Authorization: Bearer eyJhbGc..." http://localhost:5000/api/v1/admin/profile
```

### 4. Refresh Access Token

**Endpoint:**
```
POST /api/v1/admin/refresh-token
```

**Request Body:**
```json
{
  "refreshToken": "<refreshToken>"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGc..."
}
```

### 5. Get Admin Profile

**Endpoint:**
```
GET /api/v1/admin/profile
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "admin": {
    "_id": "...",
    "email": "zubaerislam703@gmail.com",
    "role": "superadmin",
    "isActive": true
  }
}
```

## API Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/v1/admin/login` | No | Admin login |
| POST | `/api/v1/admin/refresh-token` | No | Refresh access token |
| GET | `/api/v1/admin/profile` | Yes | Get admin profile |

### User Management (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/users` | List all users with profile info |
| GET | `/api/v1/admin/users/:id` | Get single user and profile |
| PUT | `/api/v1/admin/users/:id` | Activate or block a user (body: `{ isActive: true|false }`) |

## Token Details

- **Access Token:** Expires in 15 minutes
- **Refresh Token:** Expires in 7 days

## Google Authentication (Users Only)

Regular users can sign up or log in using a Google ID token obtained from the frontend. The backend endpoint verifies the token with Google, creates a user record if none exists, and returns the standard JWT tokens.

**Endpoint:**
```
POST /api/v1/auth/google
```

**Request Body:**
```json
{ "idToken": "<google-id-token>" }
```

**Response:**
```json
{
  "success": true,
  "user": { "id": "...", "name": "...", "email": "..." },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

(The Google flow is separate from admin authentication.)

## Password Security

- Passwords are hashed using bcrypt (10 salt rounds)
- Never store plain text passwords
- Always use HTTPS for token transmission

## Admin Roles

- `admin`: Regular admin user
- `superadmin`: Super admin with full access

## Future Enhancements

- Add more admin endpoints for user management
- Implement role-based access control (RBAC)
- Add admin activity logging
- Implement password reset for admin
- Add email verification for admin account creation

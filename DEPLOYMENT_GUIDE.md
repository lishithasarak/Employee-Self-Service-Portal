# ESS Portal Deployment Guide

## Selected deployment approach

Use a simple three-part production setup compatible with the existing app:

- Frontend: static hosting for the Vite PWA
- Backend: Node.js service
- Data: managed MySQL database
- Files: AWS S3 bucket for documents/profile uploads

The current project architecture already matches this model and does not require a framework rewrite.

Recommended provider choice: Render for the frontend and backend, with a managed MySQL instance and AWS S3 for object storage.

---

## Required runtime environment

### Backend

Create a production .env file for the backend with the variables the app already reads:

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=replace_with_a_secure_random_secret
FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGIN=https://your-frontend-domain.com

DB_HOST=your_mysql_host
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=smart_ess

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Smart ESS <no-reply@example.com>

STORAGE_PROVIDER=s3
AWS_REGION=your_aws_region
AWS_ACCESS_KEY_ID=your_restricted_access_key
AWS_SECRET_ACCESS_KEY=your_restricted_secret
AWS_S3_BUCKET=your_private_bucket
```

Notes:
- Keep all secrets out of source control.
- Production startup requires S3 and SMTP configuration.
- Keep local storage available only for local development and testing.

### Frontend

Create a production frontend env file:

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

Do not put backend secrets here. Only the public API URL is needed.

---

## Production database setup

1. Create the MySQL database.
2. Set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in the backend env file.
3. Run the schema setup:

```bash
cd backend
npm install
npm run db:setup
```

4. Seed only if a starting dataset is required:

```bash
npm run db:seed
```

5. Start the backend and confirm the app is ready:

```bash
npm run dev
```

Then verify:

```bash
curl https://your-backend-domain.com/api/ready
```

Expected response:

```json
{ "status": "ready", "database": "connected" }
```

---

## Production build checks

### Frontend

```bash
cd frontend
npm install
npm run build
```

### Backend

Use the existing backend start path:

```bash
cd backend
npm install
node server.js
```

No new framework is required; the current app already supports the existing backend startup pattern.

---

## AWS S3 production checklist

Before enabling S3 in production:

- Create a private S3 bucket
- Configure IAM credentials with upload/download/delete permissions
- Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET
- Set STORAGE_PROVIDER=s3
- Test document upload and signed download behavior
- Confirm deleted or replaced files are removed properly
- Keep the local storage mode for development only; production startup rejects it

The app already contains the storage abstraction and authorization checks; the remaining work is environment configuration and bucket setup.

---

## Deployment checklist

Before going live, verify:

- Backend env variables configured
- Frontend API URL configured
- MySQL database created and schema applied
- /api/health returns OK
- /api/ready returns ready
- Frontend build passes
- JWT secret is secure
- CORS origin matches the frontend host
- AWS S3 is configured for document storage if required
- CI still passes after final env setup
- Direct frontend routes work after refresh (Render SPA rewrite)
- Password reset email delivery works with the configured SMTP account

---

## Final production sequence

```bash
Create production database
        ↓
Configure backend .env
        ↓
Configure frontend .env
        ↓
Run backend schema setup
        ↓
Optional seed for initial data
        ↓
Deploy backend
        ↓
Deploy frontend
        ↓
Verify /api/health and /api/ready
        ↓
Verify upload and signed URL flows
        ↓
Go live
```

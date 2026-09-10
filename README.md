# Smart Employee Self-Service Portal

A production-style Employee Self-Service Portal built with React + Vite in the frontend and Node.js + Express + MySQL in the backend.

## ✨ Key Features

- **Progressive Web App (PWA)**: Install on any device, works offline
- **Role-based Access**: Employee, Manager, and Admin workflows
- **Mobile First**: Fully responsive design optimized for mobile devices
- **Security Hardened**: JWT auth, rate limiting, secure headers, input validation
- **Audit Trail**: Complete activity logging for compliance
- **Real-time Workflows**: Attendance, leave, payroll, reimbursements, tickets

## Project structure

- `backend/` — Express API, JWT auth, MySQL schema, route modules
- `frontend/` — Vite React app with PWA support, role-based UI layouts

## Phase 1-4 Completed

- ✅ Project scaffolding and core architecture
- ✅ MySQL schema design for ESS domain
- ✅ JWT authentication foundation
- ✅ Role-based access middleware
- ✅ Employee/manager/admin dashboards
- ✅ Complete feature implementations (attendance, leave, payroll, etc.)
- ✅ Security hardening (rate limiting, headers, validation, audit logs)
- ✅ Progressive Web App (PWA) support with offline capability

## Run locally

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

For a new MySQL database, copy `backend/.env.example` to `backend/.env`, set
the database credentials, then run `npm run db:setup` from `backend/`. Use
`npm run db:seed` only for a new development/demo database.

## Testing

Run the full backend and frontend test suite from the project root:

```bash
npm test
```

Run either suite independently:

```bash
npm run test:backend
npm run test:frontend
```

The backend uses Node's built-in test runner and automatically loads every
`*.test.js` file in `backend/tests/`. Frontend tests cover the API utility's
authentication state and response handling without requiring a browser.

Continuous integration runs on each push and pull request through
`.github/workflows/ci.yml`. It installs both applications, runs `npm test`,
validates backend syntax, and builds the frontend.

## PWA Installation

The app is a Progressive Web App and can be installed on any device:

- **Android**: Menu → Install app
- **iOS**: Share → Add to Home Screen
- **Desktop**: Click install icon in address bar

See [PWA_GUIDE.md](PWA_GUIDE.md) for detailed installation and offline usage instructions.

## Notes

- Configure MySQL credentials in `backend/.env` before using the live database.
- The app supports demo mode with fallback data when no database is configured.
- PWA works offline with intelligent caching for API responses and uploaded files.
- All existing working features remain intact and properly secured.

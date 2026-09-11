const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const { errorHandler } = require('./middleware/errorHandler');
const { securityHeaders, createRateLimiter } = require('./middleware/securityMiddleware');
const { requestLogger } = require('./middleware/requestLogger');
const db = require('./config/db');

// ============================================================
// ROUTES
// ============================================================

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const profileRoutes = require('./routes/profileRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const documentRoutes = require('./routes/documentRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const teamRoutes = require('./routes/teamRoutes');
const reimbursementRoutes = require('./routes/reimbursementRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const auditRoutes = require('./routes/auditRoutes');
const departmentRoutes = require('./routes/departmentRoutes');

// ============================================================
// APP INITIALIZATION
// ============================================================

const app = express();

app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(requestLogger);

// ============================================================
// CORS
// ============================================================

const configuredCorsOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = configuredCorsOrigins.length > 0
  ? configuredCorsOrigins
  : [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
    ];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ============================================================
// BODY PARSERS
// ============================================================

app.use(
  express.json({
    limit: '2mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb',
  })
);

// ============================================================
// SERVE UPLOADED FILES
// ============================================================

if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Smart ESS API is running',
  });
});

app.get('/api/ready', async (req, res) => {
  try {
    await db.isReady();
    res.status(200).json({ status: 'ready', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', database: 'unavailable' });
  }
});

// ============================================================
// API ROUTES
// ============================================================

// Authentication
app.use('/api/auth', authRoutes);

// Employee Management
app.use('/api/employees', employeeRoutes);

// Employee Profile
app.use('/api/profile', profileRoutes);

// Attendance
app.use('/api/attendance', attendanceRoutes);

// Leave Management
app.use('/api/leaves', leaveRoutes);

// Payroll
app.use('/api/payroll', payrollRoutes);

// Documents
app.use('/api/documents', documentRoutes);

// Support Tickets
app.use('/api/tickets', ticketRoutes);

// Team Management
app.use('/api/team', teamRoutes);

// Reimbursements
app.use('/api/reimbursements', reimbursementRoutes);

// Notifications
app.use('/api/notifications', notificationRoutes);

// Audit Trail
app.use('/api/audit', auditRoutes);

// Analytics Dashboard
app.use('/api/analytics', analyticsRoutes);

// Department administration
app.use('/api/departments', departmentRoutes);

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================

// This must always be the last middleware.
app.use(errorHandler);

module.exports = app;

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const generateToken = require('../utils/generateToken');
const { sendPasswordResetEmail } = require('../utils/emailService');
const { logAudit } = require('../utils/auditLogger');
const { createRateLimiter } = require('../middleware/securityMiddleware');

const router = express.Router();

const normalizeEmail = (value) => (value || '').toLowerCase().trim();

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

router.post('/login', createRateLimiter({ windowMs: 60 * 1000, max: 5, message: 'Too many login attempts. Please try again in a minute.' }), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        message: 'Email and password must be provided as strings.',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const [rows] = await db.query(
      `SELECT
          u.id,
          u.name,
          u.email,
          u.password_hash,
          r.name AS role
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.email = ?
         AND u.is_active = 1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    // Update last login time
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      newValue: { method: 'email' },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error && error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        message: 'Database connection refused.',
      });
    }

    if (error && error.code === 'ER_ACCESS_DENIED_ERROR') {
      return res.status(503).json({
        message: 'Database credentials are invalid or missing.',
      });
    }

    next(error);
  }
});

/*
|--------------------------------------------------------------------------
| EMPLOYEE SELF REGISTRATION
|--------------------------------------------------------------------------
|
| Public registration creates EMPLOYEE accounts only.
| Manager/Admin accounts must be created by an administrator.
|
|--------------------------------------------------------------------------
*/

router.post('/register', async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
    } = req.body || {};

    const cleanName = String(name || '').trim();
    const normalizedEmail = normalizeEmail(email);
    const cleanPhone = String(phone || '').trim();

    // Basic validation
    if (!cleanName) {
      return res.status(400).json({
        message: 'Full name is required.',
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid email address.',
      });
    }

    if (String(password || '').length < 8) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: 'Passwords do not match.',
      });
    }

    await connection.beginTransaction();

    /*
    |--------------------------------------------------------------------------
    | CHECK WHETHER EMAIL ALREADY EXISTS
    |--------------------------------------------------------------------------
    */

    const [existingUsers] = await connection.query(
      `SELECT id
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        message:
          'An account with this email already exists. Please login instead.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | GET EMPLOYEE ROLE
    |--------------------------------------------------------------------------
    */

    const [roleRows] = await connection.query(
      `SELECT id
       FROM roles
       WHERE name = 'EMPLOYEE'
       LIMIT 1`
    );

    if (roleRows.length === 0) {
      await connection.rollback();

      return res.status(500).json({
        message: 'Employee role is not configured.',
      });
    }

    const employeeRoleId = roleRows[0].id;

    /*
    |--------------------------------------------------------------------------
    | HASH PASSWORD
    |--------------------------------------------------------------------------
    */

    const passwordHash = await bcrypt.hash(password, 10);

    /*
    |--------------------------------------------------------------------------
    | CREATE USER
    |--------------------------------------------------------------------------
    */

    const [userResult] = await connection.query(
      `INSERT INTO users
        (name, email, password_hash, role_id, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [
        cleanName,
        normalizedEmail,
        passwordHash,
        employeeRoleId,
      ]
    );

    const userId = userResult.insertId;

    /*
    |--------------------------------------------------------------------------
    | GENERATE EMPLOYEE CODE
    |--------------------------------------------------------------------------
    */

    const employeeCode =
      `EMP-${String(userId).padStart(5, '0')}`;

    /*
    |--------------------------------------------------------------------------
    | CREATE EMPLOYEE RECORD
    |--------------------------------------------------------------------------
    */

    const [employeeResult] = await connection.query(
      `INSERT INTO employees
        (
          user_id,
          employee_code,
          department_id,
          designation,
          phone,
          joining_date,
          status
        )
       VALUES (?, ?, NULL, NULL, ?, CURRENT_DATE, 'ACTIVE')`,
      [
        userId,
        employeeCode,
        cleanPhone || null,
      ]
    );

    await connection.commit();

    /*
    |--------------------------------------------------------------------------
    | AUTOMATICALLY LOG IN NEW EMPLOYEE
    |--------------------------------------------------------------------------
    */

    const token = generateToken({
      id: userId,
      email: normalizedEmail,
      role: 'EMPLOYEE',
      name: cleanName,
    });

    return res.status(201).json({
      message: 'Employee account created successfully.',
      token,
      user: {
        id: userId,
        employee_id: employeeResult.insertId,
        employee_code: employeeCode,
        name: cleanName,
        email: normalizedEmail,
        role: 'EMPLOYEE',
      },
    });

  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      // Ignore rollback errors
    }

    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message:
          'An account with this email already exists.',
      });
    }

    next(error);
  } finally {
    connection.release();
  }
});

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD
|--------------------------------------------------------------------------
|
| Existing token-based route.
| This can still remain in your project.
|
|--------------------------------------------------------------------------
*/

router.post('/forgot-password', async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const { email } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        message: 'Email address is required.',
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid email address.',
      });
    }

    const [users] = await connection.query(
      `SELECT id, name, email
       FROM users
       WHERE email = ?
         AND is_active = 1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (!users.length) {
      return res.status(200).json({
        message:
          'If an account exists with this email, a password reset link has been generated.',
      });
    }

    const user = users[0];

    await connection.query(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = ?
         AND used_at IS NULL`,
      [user.id]
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await connection.query(
      `INSERT INTO password_reset_tokens
        (
          user_id,
          token_hash,
          expires_at
        )
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
      [user.id, tokenHash]
    );

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendBaseUrl}/reset-password?token=${rawToken}`;

    let emailSent = false;

    if (process.env.SMTP_HOST) {
      emailSent = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    }

    return res.status(200).json({
      message:
        'If an account exists with this email, a password reset link has been generated.',
      emailSent,
      ...(process.env.NODE_ENV !== 'production' ? { resetUrl } : {}),
    });
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
});

/*
|--------------------------------------------------------------------------
| RESET PASSWORD
|--------------------------------------------------------------------------
|
| Direct password reset using:
| Email + New Password + Confirm Password
|
|--------------------------------------------------------------------------
*/

router.post('/reset-password/token', async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const { token, password, confirmPassword } = req.body || {};

    if (!token) {
      return res.status(400).json({ message: 'Reset token is required.' });
    }

    if (!password) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');

    const [resetRows] = await connection.query(
      `SELECT id, user_id, expires_at
       FROM password_reset_tokens
       WHERE token_hash = ?
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [tokenHash]
    );

    if (!resetRows || resetRows.length === 0) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [updateResult] = await connection.query(
      `UPDATE users
       SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND is_active = 1`,
      [passwordHash, resetRows[0].user_id]
    );

    if (!updateResult.affectedRows) {
      return res.status(400).json({ message: 'Unable to reset the password for this account.' });
    }

    await connection.query(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [resetRows[0].id]
    );

    await logAudit({
      userId: resetRows[0].user_id,
      action: 'PASSWORD_RESET',
      entityType: 'AUTH',
      entityId: resetRows[0].user_id,
      newValue: { resetTokenUsed: true },
    });

    return res.status(200).json({
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
});

router.post('/reset-password', async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const {
      email,
      password,
      confirmPassword,
    } = req.body || {};

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        message: 'Email address is required.',
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid email address.',
      });
    }

    if (!password) {
      return res.status(400).json({
        message: 'New password is required.',
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        message:
          'Password must contain at least 8 characters.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: 'Passwords do not match.',
      });
    }

    const [users] = await connection.query(
      `SELECT id
       FROM users
       WHERE email = ?
         AND is_active = 1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (!users.length) {
      return res.status(404).json({
        message:
          'No active account found with this email address.',
      });
    }

    const user = users[0];

    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    const [updateResult] = await connection.query(
      `UPDATE users
       SET password_hash = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND is_active = 1`,
      [
        passwordHash,
        user.id,
      ]
    );

    if (!updateResult.affectedRows) {
      return res.status(400).json({
        message:
          'Unable to reset the password for this account.',
      });
    }

    return res.status(200).json({
      message:
        'Password reset successfully. You can now login with your new password.',
    });

  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
});

module.exports = router;
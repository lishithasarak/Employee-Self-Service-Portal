const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { generateAttendanceCSV } = require('../utils/csvExport');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

const isValidDateString = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

// Convert JavaScript Date to MySQL DATETIME format
// Example:
// 2026-08-18T08:37:11.091Z
// becomes:
// 2026-08-18 08:37:11
const toMySQLDateTime = (date = new Date()) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

router.get('/admin/summary', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        message: 'Date must be YYYY-MM-DD.'
      });
    }

    const [rows] = await db.query(
      `SELECT 
         COUNT(*) AS total,
         COALESCE(
           SUM(
             CASE 
               WHEN a.status IN ('PRESENT', 'LATE') THEN 1 
               ELSE 0 
             END
           ),
           0
         ) AS present,
         COALESCE(
           SUM(
             CASE 
               WHEN EXISTS (
                 SELECT 1 
                 FROM leave_requests lr 
                 WHERE lr.employee_id = e.id 
                   AND lr.status = 'APPROVED' 
                   AND ? BETWEEN lr.start_date AND lr.end_date
               ) THEN 1 
               ELSE 0 
             END
           ),
           0
         ) AS on_leave,
         COALESCE(AVG(a.working_hours), 0) AS avg_hours
       FROM employees e
       INNER JOIN users u ON u.id = e.user_id
       LEFT JOIN attendance a 
         ON a.employee_id = e.id 
         AND a.attendance_date = ?
       WHERE e.status = 'ACTIVE' 
         AND u.is_active = 1`,
      [date, date]
    );

    const summary = rows[0];

    const total = Number(summary.total);
    const present = Number(summary.present);
    const onLeave = Number(summary.on_leave);

    res.status(200).json({
      date,
      summary: {
        total,
        present,
        onLeave,
        absent: Math.max(0, total - present - onLeave),
        avgHours: Number(Number(summary.avg_hours).toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin-only attendance register. Every active employee is returned so an
// administrator can explicitly record an absent employee as well.
router.get('/admin/records', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    if (!isValidDateString(date)) return res.status(400).json({ message: 'Date must be YYYY-MM-DD.' });
    const [attendance] = await db.query(
      `SELECT e.id AS employee_id, e.employee_code, u.name AS employee_name,
              d.name AS department, a.id AS attendance_id, a.status, a.check_in,
              a.check_out, a.working_hours, a.notes
       FROM employees e
       INNER JOIN users u ON u.id = e.user_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = ?
       WHERE e.status = 'ACTIVE' AND u.is_active = 1
       ORDER BY d.name, u.name`,
      [date]
    );
    res.status(200).json({ date, attendance: attendance || [] });
  } catch (error) { next(error); }
});

// Overrides do not manufacture check-in/out timestamps; they only set the
// administrative status and optional note for the selected calendar date.
router.put('/admin/records/:employeeId', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const date = String(req.body?.date || '');
    const status = String(req.body?.status || '').toUpperCase();
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : null;
    if (!Number.isInteger(employeeId) || employeeId <= 0 || !isValidDateString(date)) return res.status(400).json({ message: 'A valid employee and YYYY-MM-DD date are required.' });
    if (!['PRESENT', 'ABSENT', 'LATE'].includes(status)) return res.status(400).json({ message: 'Status must be PRESENT, ABSENT, or LATE.' });
    if (notes && notes.length > 255) return res.status(400).json({ message: 'Notes cannot exceed 255 characters.' });
    const [employees] = await db.query('SELECT id FROM employees WHERE id = ? AND status = \'ACTIVE\' LIMIT 1', [employeeId]);
    if (!employees.length) return res.status(404).json({ message: 'Active employee not found.' });
    const [existing] = await db.query('SELECT id, status, notes FROM attendance WHERE employee_id = ? AND attendance_date = ? LIMIT 1', [employeeId, date]);
    if (existing.length) {
      await db.query('UPDATE attendance SET status = ?, notes = ? WHERE id = ?', [status, notes, existing[0].id]);
    } else {
      await db.query('INSERT INTO attendance (employee_id, attendance_date, status, notes) VALUES (?, ?, ?, ?)', [employeeId, date, status, notes]);
    }
    await logAudit({ userId: req.user.id, action: 'ATTENDANCE_OVERRIDDEN', entityType: 'ATTENDANCE', entityId: existing[0]?.id || null, oldValue: existing[0] || null, newValue: { employee_id: employeeId, date, status, notes } });
    res.status(200).json({ message: 'Attendance status updated successfully.', status });
  } catch (error) { next(error); }
});

router.get('/team', authenticate, authorize('MANAGER'), async (req, res, next) => {
  try {
    const date =
      req.query.date || new Date().toISOString().slice(0, 10);

    const [managerRows] = await db.query(
      'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (!managerRows.length) {
      return res.status(404).json({
        message: 'Manager employee record not found.'
      });
    }

    const [attendance] = await db.query(
      `SELECT 
         e.id AS employee_id,
         e.employee_code,
         u.name AS employee_name,
         a.check_in,
         a.check_out,
         a.working_hours,
         COALESCE(
           (
             SELECT 'ON_LEAVE'
             FROM leave_requests lr
             WHERE lr.employee_id = e.id
               AND lr.status = 'APPROVED'
               AND ? BETWEEN lr.start_date AND lr.end_date
             LIMIT 1
           ),
           a.status,
           'ABSENT'
         ) AS status
       FROM employees e
       INNER JOIN users u ON u.id = e.user_id
       LEFT JOIN attendance a 
         ON a.employee_id = e.id 
         AND a.attendance_date = ?
       WHERE e.manager_id = ?
         AND e.status = 'ACTIVE'
       ORDER BY u.name`,
      [date, date, managerRows[0].id]
    );

    res.status(200).json({
      date,
      attendance
    });
  } catch (error) {
    next(error);
  }
});

// Get employee attendance records
router.get(
  '/',
  authenticate,
  authorize('EMPLOYEE', 'MANAGER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const [rows] = await db.query(
        `SELECT 
           id,
           employee_id,
           attendance_date,
           check_in,
           check_out,
           working_hours,
           status
         FROM attendance
         WHERE employee_id = (
           SELECT id 
           FROM employees 
           WHERE user_id = ?
         )
         ORDER BY attendance_date DESC
         LIMIT 100`,
        [req.user.id]
      );

      const presentDays = rows.filter(
        (item) => item.status === 'PRESENT'
      ).length;

      const workingHours = rows.reduce(
        (total, item) =>
          total + Number(item.working_hours || 0),
        0
      );

      res.status(200).json({
        attendance: rows || [],
        summary: {
          presentDays,
          workingHours: parseFloat(workingHours.toFixed(2)),
          recordsCount: rows.length || 0
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Check in
router.post(
  '/check-in',
  authenticate,
  authorize('EMPLOYEE', 'MANAGER', 'ADMIN'),
  async (req, res, next) => {
    try {
      // Get employee ID from user
      const [empRows] = await db.query(
        'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
        [req.user.id]
      );

      if (!empRows || empRows.length === 0) {
        return res.status(404).json({
          message: 'Employee record not found.'
        });
      }

      const employeeId = empRows[0].id;

      // Today's date
      const today = new Date()
        .toISOString()
        .slice(0, 10);

      // Convert JavaScript date to MySQL DATETIME
      const checkInTime = toMySQLDateTime();

      // Check if already checked in today
      const [existing] = await db.query(
        `SELECT id, check_in 
         FROM attendance 
         WHERE employee_id = ? 
           AND attendance_date = ? 
         LIMIT 1`,
        [employeeId, today]
      );

      if (existing && existing.length > 0) {
        if (existing[0].check_in) {
          return res.status(400).json({
            message: 'You have already checked in today.'
          });
        }

        // Update existing absent record to present with check-in
        await db.query(
          `UPDATE attendance 
           SET check_in = ?, 
               status = ?
           WHERE id = ?`,
          [
            checkInTime,
            'PRESENT',
            existing[0].id
          ]
        );
      } else {
        // Create new attendance record
        await db.query(
          `INSERT INTO attendance (
             employee_id,
             attendance_date,
             check_in,
             status
           )
           VALUES (?, ?, ?, ?)`,
          [
            employeeId,
            today,
            checkInTime,
            'PRESENT'
          ]
        );
      }

      // Fetch and return the updated record
      const [newRecord] = await db.query(
        `SELECT 
           id,
           employee_id,
           attendance_date,
           check_in,
           check_out,
           working_hours,
           status
         FROM attendance
         WHERE employee_id = ?
           AND attendance_date = ?
         LIMIT 1`,
        [employeeId, today]
      );

      res.status(201).json({
        message: 'Check-in recorded successfully.',
        record: newRecord[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Check out
router.post(
  '/check-out',
  authenticate,
  authorize('EMPLOYEE', 'MANAGER', 'ADMIN'),
  async (req, res, next) => {
    try {
      // Get employee ID from user
      const [empRows] = await db.query(
        'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
        [req.user.id]
      );

      if (!empRows || empRows.length === 0) {
        return res.status(404).json({
          message: 'Employee record not found.'
        });
      }

      const employeeId = empRows[0].id;

      // Today's date
      const today = new Date()
        .toISOString()
        .slice(0, 10);

      // Convert JavaScript date to MySQL DATETIME
      const checkOutTime = toMySQLDateTime();

      // Get today's attendance record
      const [attendanceRows] = await db.query(
        `SELECT 
           id,
           check_in,
           check_out
         FROM attendance
         WHERE employee_id = ?
           AND attendance_date = ?
         LIMIT 1`,
        [employeeId, today]
      );

      if (!attendanceRows || attendanceRows.length === 0) {
        return res.status(400).json({
          message:
            'No check-in record found for today. Please check in first.'
        });
      }

      const record = attendanceRows[0];

      if (!record.check_in) {
        return res.status(400).json({
          message:
            'You must check in before checking out.'
        });
      }

      if (record.check_out) {
        return res.status(400).json({
          message:
            'You have already checked out today.'
        });
      }

      // Calculate working hours
      const checkInDate = new Date(record.check_in);
      const checkOutDate = new Date(checkOutTime);

      const diffMs =
        checkOutDate.getTime() -
        checkInDate.getTime();

      const diffHours = parseFloat(
        (
          diffMs /
          (1000 * 60 * 60)
        ).toFixed(2)
      );

      // Update attendance record
      await db.query(
        `UPDATE attendance 
         SET check_out = ?,
             working_hours = ?,
             status = ?
         WHERE id = ?`,
        [
          checkOutTime,
          diffHours,
          'PRESENT',
          record.id
        ]
      );

      // Fetch and return updated record
      const [updatedRecord] = await db.query(
        `SELECT 
           id,
           employee_id,
           attendance_date,
           check_in,
           check_out,
           working_hours,
           status
         FROM attendance
         WHERE id = ?
         LIMIT 1`,
        [record.id]
      );

      res.status(200).json({
        message: 'Check-out recorded successfully.',
        record: updatedRecord[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Export attendance records as CSV
router.get('/export/csv', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const role = req.user.role;
    let query = '';
    let params = [];

    if (role === 'ADMIN') {
      // Admin: export all attendance
      query = `
        SELECT
          u.name AS employee_name,
          e.employee_code,
          a.attendance_date,
          a.check_in,
          a.check_out,
          a.working_hours,
          a.status
        FROM attendance a
        INNER JOIN employees e ON e.id = a.employee_id
        INNER JOIN users u ON u.id = e.user_id
        ORDER BY a.attendance_date DESC, e.employee_code ASC
        LIMIT 10000
      `;
    } else {
      // Manager: export team attendance
      query = `
        SELECT
          u.name AS employee_name,
          e.employee_code,
          a.attendance_date,
          a.check_in,
          a.check_out,
          a.working_hours,
          a.status
        FROM attendance a
        INNER JOIN employees e ON e.id = a.employee_id
        INNER JOIN users u ON u.id = e.user_id
        WHERE e.manager_id = (
          SELECT id FROM employees WHERE user_id = ? LIMIT 1
        )
        ORDER BY a.attendance_date DESC, e.employee_code ASC
        LIMIT 10000
      `;
      params = [req.user.id];
    }

    const [records] = await db.query(query, params);

    const csv = generateAttendanceCSV(records || []);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `attendance_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

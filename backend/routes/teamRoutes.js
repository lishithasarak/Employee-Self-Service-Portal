const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

router.get('/summary', authenticate, authorize('MANAGER'), async (req, res, next) => {
  try {
    const [managerRows] = await db.query('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [req.user.id]);
    if (managerRows.length === 0) {
      return res.status(404).json({ message: 'Manager employee record not found.' });
    }

    const managerId = managerRows[0].id;
    const today = new Date().toISOString().slice(0, 10);
    const [teamRows] = await db.query(
      `SELECT
         COUNT(*) AS total_members,
         COALESCE(SUM(CASE WHEN EXISTS (
           SELECT 1 FROM leave_requests lr WHERE lr.employee_id = e.id AND lr.status = 'APPROVED' AND ? BETWEEN lr.start_date AND lr.end_date
         ) THEN 1 ELSE 0 END), 0) AS on_leave,
         COALESCE(SUM(CASE WHEN NOT EXISTS (
           SELECT 1 FROM leave_requests lr WHERE lr.employee_id = e.id AND lr.status = 'APPROVED' AND ? BETWEEN lr.start_date AND lr.end_date
         ) AND EXISTS (
           SELECT 1 FROM attendance a WHERE a.employee_id = e.id AND a.attendance_date = ? AND a.status IN ('PRESENT', 'LATE')
         ) THEN 1 ELSE 0 END), 0) AS present_today
       FROM employees e
       INNER JOIN users u ON u.id = e.user_id
       WHERE e.manager_id = ? AND e.status = 'ACTIVE' AND u.is_active = 1`,
      [today, today, today, managerId]
    );
    const [pendingLeaveRows] = await db.query(
      `SELECT COUNT(*) AS count FROM leave_requests lr
       INNER JOIN employees e ON e.id = lr.employee_id
       WHERE e.manager_id = ? AND lr.status = 'PENDING'`,
      [managerId]
    );
    const [pendingReimbursementRows] = await db.query(
      `SELECT COUNT(*) AS count FROM reimbursements r
       INNER JOIN employees e ON e.id = r.employee_id
       WHERE e.manager_id = ? AND r.status = 'PENDING'`,
      [managerId]
    );

    const team = teamRows[0];
    const totalMembers = Number(team.total_members);
    const presentToday = Number(team.present_today);
    const onLeave = Number(team.on_leave);
    res.status(200).json({
      summary: {
        totalMembers,
        presentToday,
        absentToday: Math.max(0, totalMembers - presentToday - onLeave),
        onLeave,
        pendingLeaves: Number(pendingLeaveRows[0].count),
        pendingReimbursements: Number(pendingReimbursementRows[0].count),
      },
    });
  } catch (error) {
    next(error);
  }
});

// A manager can only retrieve employees whose manager_id is their own employee record.
router.get('/', authenticate, authorize('MANAGER'), async (req, res, next) => {
  try {
    const requestedDate = req.query.date || new Date().toISOString().slice(0, 10);

    if (!isIsoDate(requestedDate) || Number.isNaN(Date.parse(`${requestedDate}T00:00:00Z`))) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format.' });
    }

    const [managerRows] = await db.query(
      'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (managerRows.length === 0) {
      return res.status(404).json({ message: 'Manager employee record not found.' });
    }

    const managerId = managerRows[0].id;
    const [members] = await db.query(
      `SELECT
         e.id,
         e.employee_code,
         u.name,
         d.name AS department,
         e.designation,
         e.status AS employment_status,
         COALESCE(
           (SELECT 'ON_LEAVE'
            FROM leave_requests lr
            WHERE lr.employee_id = e.id
              AND lr.status = 'APPROVED'
              AND ? BETWEEN lr.start_date AND lr.end_date
            LIMIT 1),
           (SELECT a.status
            FROM attendance a
            WHERE a.employee_id = e.id AND a.attendance_date = ?
            LIMIT 1),
           'ABSENT'
         ) AS attendance_status,
         COALESCE(
           (SELECT lr.status
            FROM leave_requests lr
            WHERE lr.employee_id = e.id
              AND lr.status = 'APPROVED'
              AND ? BETWEEN lr.start_date AND lr.end_date
            LIMIT 1),
           'NOT_ON_LEAVE'
         ) AS leave_status
       FROM employees e
       INNER JOIN users u ON u.id = e.user_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.manager_id = ? AND e.status = 'ACTIVE' AND u.is_active = 1
       ORDER BY u.name ASC`,
      [requestedDate, requestedDate, requestedDate, managerId]
    );

    res.status(200).json({
      date: requestedDate,
      teamMembers: members,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

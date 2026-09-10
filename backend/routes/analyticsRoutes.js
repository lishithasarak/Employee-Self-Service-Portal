const express = require('express');
const db = require('../config/db');
const {
  authenticate,
  authorize,
} = require('../middleware/authMiddleware');

const router = express.Router();

/*
 * ============================================================
 * GET ANALYTICS DASHBOARD DATA
 * ============================================================
 *
 * GET /api/analytics
 *
 * Access:
 * ADMIN
 */

router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  async (req, res, next) => {
    try {
      const from = String(req.query.from || '');
      const to = String(req.query.to || '');
      const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
        && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

      if ((from && !to) || (!from && to)) {
        return res.status(400).json({
          message: 'Both from and to dates are required when filtering analytics.',
        });
      }

      if ((from && !isDate(from)) || (to && !isDate(to)) || (from && from > to)) {
        return res.status(400).json({
          message: 'Dates must use YYYY-MM-DD and the start date cannot be after the end date.',
        });
      }

      const rangeFilter = from
        ? 'WHERE %FIELD% >= ? AND %FIELD% < DATE_ADD(?, INTERVAL 1 DAY)'
        : '';
      const attendanceFilter = rangeFilter.replaceAll('%FIELD%', 'attendance_date');
      const createdAtFilter = rangeFilter.replaceAll('%FIELD%', 'created_at');
      const rangeParams = from ? [from, to] : [];

      /*
       * ========================================================
       * EMPLOYEE STATISTICS
       * ========================================================
       */

      const [employeeStats] = await db.query(`
        SELECT
          COUNT(*) AS total_employees,

          COALESCE(
            SUM(status = 'ACTIVE'),
            0
          ) AS active_employees,

          COALESCE(
            SUM(status = 'INACTIVE'),
            0
          ) AS inactive_employees,

          COALESCE(
            SUM(status = 'ON_LEAVE'),
            0
          ) AS on_leave_employees,

          COALESCE(
            SUM(status = 'TERMINATED'),
            0
          ) AS terminated_employees

        FROM employees
      `);

      /*
       * ========================================================
       * DEPARTMENT STATISTICS
       * ========================================================
       */

      const [departmentStats] = await db.query(`
        SELECT
          d.id,
          d.name,
          d.code,
          COUNT(e.id) AS employee_count

        FROM departments d

        LEFT JOIN employees e
          ON e.department_id = d.id

        GROUP BY
          d.id,
          d.name,
          d.code

        ORDER BY
          employee_count DESC
      `);

      /*
       * ========================================================
       * LEAVE STATISTICS
       * ========================================================
       */

      const [leaveStats] = await db.query(`
        SELECT
          COUNT(*) AS total_requests,

          COALESCE(
            SUM(status = 'PENDING'),
            0
          ) AS pending,

          COALESCE(
            SUM(status = 'APPROVED'),
            0
          ) AS approved,

          COALESCE(
            SUM(status = 'REJECTED'),
            0
          ) AS rejected,

          COALESCE(
            SUM(status = 'CANCELLED'),
            0
          ) AS cancelled

        FROM leave_requests
        ${createdAtFilter}
      `, rangeParams);

      /*
       * ========================================================
       * ATTENDANCE STATISTICS
       * ========================================================
       */

      const [attendanceStats] = await db.query(`
        SELECT
          COUNT(*) AS total_records,

          COALESCE(
            SUM(status = 'PRESENT'),
            0
          ) AS present,

          COALESCE(
            SUM(status = 'ABSENT'),
            0
          ) AS absent,

          COALESCE(
            SUM(status = 'LATE'),
            0
          ) AS late,

          COALESCE(
            SUM(status = 'ON_LEAVE'),
            0
          ) AS on_leave,

          COALESCE(
            SUM(status = 'HOLIDAY'),
            0
          ) AS holiday

        FROM attendance
        ${attendanceFilter}
      `, rangeParams);

      /*
       * ========================================================
       * SUPPORT TICKET STATISTICS
       * ========================================================
       */

      const [ticketStats] = await db.query(`
        SELECT
          COUNT(*) AS total_tickets,

          COALESCE(
            SUM(status = 'OPEN'),
            0
          ) AS open,

          COALESCE(
            SUM(status = 'IN_PROGRESS'),
            0
          ) AS in_progress,

          COALESCE(
            SUM(status = 'RESOLVED'),
            0
          ) AS resolved,

          COALESCE(
            SUM(status = 'CLOSED'),
            0
          ) AS closed

        FROM support_tickets
        ${createdAtFilter}
      `, rangeParams);

      /*
       * ========================================================
       * RESPONSE
       * ========================================================
       */

      res.status(200).json({
        employees: employeeStats[0],
        departments: departmentStats,
        leaves: leaveStats[0],
        attendance: attendanceStats[0],
        tickets: ticketStats[0],
        dateRange: from ? { from, to } : null,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

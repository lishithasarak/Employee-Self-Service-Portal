const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { sendLeaveApprovalEmail } = require('../utils/emailService');
const { generateLeaveRequestsCSV } = require('../utils/csvExport');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

const defaultLeaveTypes = [
  { id: 1, name: 'Casual Leave', description: 'Short-term personal leave', max_days_per_year: 12, is_paid: 1 },
  { id: 2, name: 'Earned Leave', description: 'Annual earned leave', max_days_per_year: 18, is_paid: 1 },
  { id: 3, name: 'Sick Leave', description: 'Medical leave', max_days_per_year: 10, is_paid: 1 },
  { id: 4, name: 'Paid Leave', description: 'Company holiday leave', max_days_per_year: 5, is_paid: 1 },
];

const isValidDateString = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

// Get leave types
router.get('/types/all', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const [leaveTypes] = await db.query(
      `SELECT 
         id,
         name,
         description,
         max_days_per_year,
         is_paid
       FROM leave_types
       ORDER BY name ASC`
    );

    res.status(200).json({
      leaveTypes: leaveTypes?.length ? leaveTypes : defaultLeaveTypes,
    });
  } catch (error) {
    next(error);
  }
});

// Get employee leave balance
router.get('/balance/me', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    // Get employee ID from user
    const [empRows] = await db.query(
      'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (!empRows || empRows.length === 0) {
      return res.status(404).json({ message: 'Employee record not found.' });
    }

    const employeeId = empRows[0].id;
    const currentYear = new Date().getFullYear();

    const [balances] = await db.query(
      `SELECT 
         lb.id,
         lb.employee_id,
         lb.leave_type_id,
         lt.name AS leave_type_name,
         lb.total_days,
         lb.used_days,
         lb.remaining_days,
         lb.year
       FROM leave_balances lb
       LEFT JOIN leave_types lt ON lt.id = lb.leave_type_id
       WHERE lb.employee_id = ? AND lb.year = ?
       ORDER BY lt.name ASC`,
      [employeeId, currentYear]
    );

    res.status(200).json({
      balances: balances || [],
      year: currentYear,
    });
  } catch (error) {
    next(error);
  }
});

// A manager may only review leave requests submitted by direct reports.
router.get('/team', authenticate, authorize('MANAGER'), async (req, res, next) => {
  try {
    const [managerRows] = await db.query(
      'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (managerRows.length === 0) {
      return res.status(404).json({ message: 'Manager employee record not found.' });
    }

    const [leaveRequests] = await db.query(
      `SELECT
         lr.id,
         lr.employee_id,
         e.employee_code,
         u.name AS employee_name,
         d.name AS department,
         lt.name AS leave_type,
         lr.start_date,
         lr.end_date,
         lr.total_days,
         lr.reason,
         lr.status,
         lr.rejection_reason,
         lr.created_at
       FROM leave_requests lr
       INNER JOIN employees e ON e.id = lr.employee_id
       INNER JOIN users u ON u.id = e.user_id
       LEFT JOIN departments d ON d.id = e.department_id
       INNER JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE e.manager_id = ?
       ORDER BY CASE WHEN lr.status = 'PENDING' THEN 0 ELSE 1 END, lr.created_at DESC`,
      [managerRows[0].id]
    );

    res.status(200).json({ leaveRequests });
  } catch (error) {
    next(error);
  }
});

router.get('/admin', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const [leaveRequests] = await db.query(`SELECT lr.id,lr.start_date,lr.end_date,lr.total_days,lr.reason,lr.status,lt.name AS leave_type,u.name AS employee_name,e.employee_code,d.name AS department FROM leave_requests lr INNER JOIN employees e ON e.id=lr.employee_id INNER JOIN users u ON u.id=e.user_id INNER JOIN leave_types lt ON lt.id=lr.leave_type_id LEFT JOIN departments d ON d.id=e.department_id ORDER BY lr.created_at DESC`);
    res.status(200).json({ leaveRequests });
  } catch (error) { next(error); }
});

// Get employee leave requests
router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    // Get employee ID from user
    const [empRows] = await db.query(
      'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (!empRows || empRows.length === 0) {
      return res.status(200).json({ leaveRequests: [] });
    }

    const employeeId = empRows[0].id;

    const [leaveRequests] = await db.query(
      `SELECT 
         lr.id,
         lr.employee_id,
         lr.leave_type_id,
         lt.name AS leave_type,
         lr.start_date,
         lr.end_date,
         lr.total_days,
         lr.reason,
         lr.status,
         lr.rejection_reason,
         lr.created_at
       FROM leave_requests lr
       LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.employee_id = ?
       ORDER BY lr.created_at DESC`,
      [employeeId]
    );

    res.status(200).json({
      leaveRequests: leaveRequests || [],
    });
  } catch (error) {
    next(error);
  }
});

// Create leave request
router.post('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { leave_type_id, start_date, end_date, reason } = req.body;

    if (!leave_type_id || !start_date || !end_date || !reason) {
      return res.status(400).json({ message: 'Leave type, dates, and reason are required.' });
    }

    if (!Number.isInteger(Number(leave_type_id)) || Number(leave_type_id) <= 0) {
      return res.status(400).json({ message: 'Leave type ID is invalid.' });
    }

    if (!isValidDateString(String(start_date)) || !isValidDateString(String(end_date))) {
      return res.status(400).json({ message: 'Start and end dates must be valid YYYY-MM-DD values.' });
    }

    if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 1000) {
      return res.status(400).json({ message: 'Reason must be between 5 and 1000 characters.' });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate > endDate) {
      return res.status(400).json({ message: 'End date cannot be before start date.' });
    }

    // Calculate total days
    const diffTime = endDate.getTime() - startDate.getTime();
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Get employee ID
    const [empRows] = await db.query(
      'SELECT id, manager_id FROM employees WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (!empRows || empRows.length === 0) {
      return res.status(404).json({ message: 'Employee record not found.' });
    }

    const employeeId = empRows[0].id;
    const managerId = empRows[0].manager_id;

    // Check leave balance
    const currentYear = new Date().getFullYear();
    const [balanceRows] = await db.query(
      `SELECT remaining_days FROM leave_balances
       WHERE employee_id = ? AND leave_type_id = ? AND year = ?
       LIMIT 1`,
      [employeeId, leave_type_id, currentYear]
    );

    if (balanceRows.length === 0) {
      return res.status(400).json({ message: 'No leave balance is available for this leave type.' });
    }

    const remainingDays = Number(balanceRows[0].remaining_days);
    if (remainingDays < totalDays) {
      return res.status(400).json({
        message: `Insufficient leave balance. Available: ${remainingDays} days, Requested: ${totalDays} days.`
      });
    }

    // Create leave request
    const [result] = await db.query(
      `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status, manager_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, leave_type_id, start_date, end_date, totalDays, reason, 'PENDING', managerId]
    );

    // Fetch and return the created request
    const [newRequest] = await db.query(
      `SELECT 
         lr.id,
         lr.employee_id,
         lr.leave_type_id,
         lt.name AS leave_type,
         lr.start_date,
         lr.end_date,
         lr.total_days,
         lr.reason,
         lr.status,
         lr.created_at
       FROM leave_requests lr
       LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.id = ?
       LIMIT 1`,
      [result.insertId]
    );

    if (managerId) {
      const [managerUserRows] = await db.query(
        'SELECT user_id FROM employees WHERE id = ? LIMIT 1',
        [managerId]
      );
      if (managerUserRows.length > 0) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES (?, ?, ?, 'LEAVE')`,
          [
            managerUserRows[0].user_id,
            'New leave request',
            `A team member submitted a ${newRequest[0].leave_type} request for ${newRequest[0].total_days} day(s).`,
          ]
        );
      }
    }

    res.status(201).json({ 
      message: 'Leave request created successfully.',
      leaveRequest: newRequest[0]
    });
  } catch (error) {
    next(error);
  }
});

// Approve or reject a direct report's pending request. Balance and status changes are atomic.
router.put('/:id/decision', authenticate, authorize('MANAGER'), async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const requestId = Number(req.params.id);
    const decision = String(req.body?.status || '').toUpperCase();
    const rejectionReason = typeof req.body?.rejection_reason === 'string' ? req.body.rejection_reason.trim() : null;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'A valid leave request ID is required.' });
    }
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ message: 'Status must be APPROVED or REJECTED.' });
    }
    if (decision === 'REJECTED' && !rejectionReason) {
      return res.status(400).json({ message: 'A rejection reason is required.' });
    }

    await connection.beginTransaction();

    const [managerRows] = await connection.query(
      'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    if (managerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Manager employee record not found.' });
    }

    const [requestRows] = await connection.query(
      `SELECT lr.id, lr.employee_id, lr.leave_type_id, lr.total_days, lr.status, lr.start_date, lr.end_date, lr.rejection_reason, lt.name AS leave_type, e.user_id, u.email, u.name
       FROM leave_requests lr
       INNER JOIN employees e ON e.id = lr.employee_id
       INNER JOIN users u ON u.id = e.user_id
       LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.id = ? AND e.manager_id = ?
       FOR UPDATE`,
      [requestId, managerRows[0].id]
    );
    if (requestRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Leave request not found for your team.' });
    }

    const leaveRequest = requestRows[0];
    if (leaveRequest.status !== 'PENDING') {
      await connection.rollback();
      return res.status(400).json({ message: 'Only pending leave requests can be decided.' });
    }

    if (decision === 'APPROVED') {
      const year = new Date().getFullYear();
      const [balanceRows] = await connection.query(
        `SELECT id, remaining_days FROM leave_balances
         WHERE employee_id = ? AND leave_type_id = ? AND year = ? FOR UPDATE`,
        [leaveRequest.employee_id, leaveRequest.leave_type_id, year]
      );
      if (balanceRows.length === 0 || Number(balanceRows[0].remaining_days) < Number(leaveRequest.total_days)) {
        await connection.rollback();
        return res.status(400).json({ message: 'The employee no longer has sufficient leave balance.' });
      }

      await connection.query(
        `UPDATE leave_balances
         SET used_days = used_days + ?, remaining_days = remaining_days - ?
         WHERE id = ?`,
        [leaveRequest.total_days, leaveRequest.total_days, balanceRows[0].id]
      );
    }

    await connection.query(
      'UPDATE leave_requests SET status = ?, rejection_reason = ? WHERE id = ?',
      [decision, decision === 'REJECTED' ? rejectionReason : null, requestId]
    );
    await connection.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, 'LEAVE')`,
      [
        leaveRequest.user_id,
        `Leave request ${decision.toLowerCase()}`,
        decision === 'APPROVED'
          ? 'Your leave request has been approved.'
          : `Your leave request was rejected: ${rejectionReason}`,
      ]
    );

    // Send email notification
    try {
      await sendLeaveApprovalEmail({
        to: leaveRequest.email,
        name: leaveRequest.name,
        leaveType: leaveRequest.leave_type || 'Unknown',
        startDate: leaveRequest.start_date,
        endDate: leaveRequest.end_date,
        totalDays: leaveRequest.total_days,
        status: decision,
        reason: rejectionReason || ''
      });
    } catch (emailError) {
      console.error('Failed to send leave approval email:', emailError);
      // Don't fail the request if email fails
    }

    await connection.commit();
    res.status(200).json({ message: `Leave request ${decision.toLowerCase()} successfully.`, status: decision });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.get('/admin/types', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const [leaveTypes] = await db.query('SELECT id, name, description, max_days_per_year, is_paid FROM leave_types ORDER BY name ASC');
    res.status(200).json({ leaveTypes: leaveTypes || [] });
  } catch (error) { next(error); }
});

router.post('/admin/types', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim(); const description = String(req.body?.description || '').trim() || null;
    const maxDays = Number(req.body?.max_days_per_year); const isPaid = req.body?.is_paid === false || req.body?.is_paid === 0 ? 0 : 1;
    if (!name || name.length > 80 || !Number.isFinite(maxDays) || maxDays < 0 || maxDays > 366 || !Number.isInteger(maxDays)) return res.status(400).json({ message: 'Provide a leave type name and a whole annual allowance from 0 to 366 days.' });
    if (description && description.length > 255) return res.status(400).json({ message: 'Description cannot exceed 255 characters.' });
    const [result] = await db.query('INSERT INTO leave_types (name, description, max_days_per_year, is_paid) VALUES (?, ?, ?, ?)', [name, description, maxDays, isPaid]);
    await logAudit({ userId: req.user.id, action: 'LEAVE_TYPE_CREATED', entityType: 'LEAVE_TYPE', entityId: result.insertId, newValue: { name, max_days_per_year: maxDays, is_paid: Boolean(isPaid) } });
    res.status(201).json({ message: 'Leave type created successfully.', id: result.insertId });
  } catch (error) { if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A leave type with this name already exists.' }); next(error); }
});

router.put('/admin/types/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const id = Number(req.params.id); const name = String(req.body?.name || '').trim(); const description = String(req.body?.description || '').trim() || null;
    const maxDays = Number(req.body?.max_days_per_year); const isPaid = req.body?.is_paid === false || req.body?.is_paid === 0 ? 0 : 1;
    if (!Number.isInteger(id) || id <= 0 || !name || name.length > 80 || !Number.isInteger(maxDays) || maxDays < 0 || maxDays > 366) return res.status(400).json({ message: 'Provide valid leave type details.' });
    const [result] = await db.query('UPDATE leave_types SET name = ?, description = ?, max_days_per_year = ?, is_paid = ? WHERE id = ?', [name, description, maxDays, isPaid, id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Leave type not found.' });
    await logAudit({ userId: req.user.id, action: 'LEAVE_TYPE_UPDATED', entityType: 'LEAVE_TYPE', entityId: id, newValue: { name, max_days_per_year: maxDays, is_paid: Boolean(isPaid) } });
    res.status(200).json({ message: 'Leave type updated successfully.' });
  } catch (error) { if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A leave type with this name already exists.' }); next(error); }
});

router.get('/admin/balances', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return res.status(400).json({ message: 'Provide a valid year.' });
    const [balances] = await db.query(`SELECT lb.id, lb.employee_id, lb.leave_type_id, lb.total_days, lb.used_days, lb.remaining_days, lb.year, u.name AS employee_name, e.employee_code, lt.name AS leave_type_name
      FROM leave_balances lb INNER JOIN employees e ON e.id = lb.employee_id INNER JOIN users u ON u.id = e.user_id INNER JOIN leave_types lt ON lt.id = lb.leave_type_id WHERE lb.year = ? ORDER BY u.name, lt.name`, [year]);
    res.status(200).json({ balances: balances || [], year });
  } catch (error) { next(error); }
});

router.put('/admin/balances', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const employeeId = Number(req.body?.employee_id); const leaveTypeId = Number(req.body?.leave_type_id); const year = Number(req.body?.year || new Date().getFullYear()); const totalDays = Number(req.body?.total_days);
    if (![employeeId, leaveTypeId, year].every(Number.isInteger) || employeeId <= 0 || leaveTypeId <= 0 || year < 2000 || year > 2100 || !Number.isFinite(totalDays) || totalDays < 0 || totalDays > 366) return res.status(400).json({ message: 'Provide a valid employee, leave type, year, and allowance.' });
    const [current] = await db.query('SELECT id, used_days FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ? LIMIT 1', [employeeId, leaveTypeId, year]);
    const usedDays = Number(current[0]?.used_days || 0);
    if (totalDays < usedDays) return res.status(400).json({ message: `Allowance cannot be lower than the ${usedDays} day(s) already used.` });
    await db.query(`INSERT INTO leave_balances (employee_id, leave_type_id, total_days, used_days, remaining_days, year) VALUES (?, ?, ?, 0, ?, ?)
      ON DUPLICATE KEY UPDATE total_days = VALUES(total_days), remaining_days = VALUES(total_days) - used_days`, [employeeId, leaveTypeId, totalDays, totalDays, year]);
    await logAudit({ userId: req.user.id, action: 'LEAVE_BALANCE_ADJUSTED', entityType: 'LEAVE_BALANCE', entityId: current[0]?.id || null, oldValue: current[0] || null, newValue: { employee_id: employeeId, leave_type_id: leaveTypeId, year, total_days: totalDays } });
    res.status(200).json({ message: 'Leave balance updated successfully.' });
  } catch (error) { next(error); }
});

// An administrator may decide any pending leave request. This remains a
// separate endpoint from the manager action so the manager's direct-report
// scope can never be accidentally bypassed.
router.put('/admin/:id/decision', authenticate, authorize('ADMIN'), async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const requestId = Number(req.params.id);
    const decision = String(req.body?.status || '').toUpperCase();
    const rejectionReason = typeof req.body?.rejection_reason === 'string'
      ? req.body.rejection_reason.trim()
      : null;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'A valid leave request ID is required.' });
    }
    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(decision)) {
      return res.status(400).json({ message: 'Status must be APPROVED, REJECTED, or CANCELLED.' });
    }
    if (decision === 'REJECTED' && !rejectionReason) {
      return res.status(400).json({ message: 'A rejection reason is required.' });
    }

    await connection.beginTransaction();
    const [requestRows] = await connection.query(
      `SELECT lr.id, lr.employee_id, lr.leave_type_id, lr.total_days, lr.status,
              lr.start_date, lr.end_date, lt.name AS leave_type, e.user_id,
              u.email, u.name
       FROM leave_requests lr
       INNER JOIN employees e ON e.id = lr.employee_id
       INNER JOIN users u ON u.id = e.user_id
       LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.id = ? FOR UPDATE`,
      [requestId]
    );

    if (!requestRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    const leaveRequest = requestRows[0];
    if (leaveRequest.status !== 'PENDING') {
      await connection.rollback();
      return res.status(400).json({ message: 'Only pending leave requests can be decided.' });
    }

    if (decision === 'APPROVED') {
      const year = new Date(leaveRequest.start_date).getUTCFullYear();
      const [balanceRows] = await connection.query(
        `SELECT id, remaining_days FROM leave_balances
         WHERE employee_id = ? AND leave_type_id = ? AND year = ? FOR UPDATE`,
        [leaveRequest.employee_id, leaveRequest.leave_type_id, year]
      );
      if (!balanceRows.length || Number(balanceRows[0].remaining_days) < Number(leaveRequest.total_days)) {
        await connection.rollback();
        return res.status(400).json({ message: 'The employee no longer has sufficient leave balance.' });
      }
      await connection.query(
        `UPDATE leave_balances
         SET used_days = used_days + ?, remaining_days = remaining_days - ?
         WHERE id = ?`,
        [leaveRequest.total_days, leaveRequest.total_days, balanceRows[0].id]
      );
    }

    await connection.query(
      'UPDATE leave_requests SET status = ?, rejection_reason = ? WHERE id = ?',
      [decision, decision === 'REJECTED' ? rejectionReason : null, requestId]
    );
    await connection.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'LEAVE')`,
      [
        leaveRequest.user_id,
        `Leave request ${decision.toLowerCase()}`,
        decision === 'REJECTED'
          ? `Your leave request was rejected: ${rejectionReason}`
          : `Your leave request was ${decision.toLowerCase()} by an administrator.`,
      ]
    );
    await connection.commit();

    await logAudit({
      userId: req.user.id,
      action: `ADMIN_LEAVE_${decision}`,
      entityType: 'LEAVE_REQUEST',
      entityId: requestId,
      oldValue: { status: leaveRequest.status },
      newValue: { status: decision, rejection_reason: rejectionReason },
    });

    try {
      await sendLeaveApprovalEmail({
        to: leaveRequest.email,
        name: leaveRequest.name,
        leaveType: leaveRequest.leave_type || 'Unknown',
        startDate: leaveRequest.start_date,
        endDate: leaveRequest.end_date,
        totalDays: leaveRequest.total_days,
        status: decision,
        reason: rejectionReason || '',
      });
    } catch (emailError) {
      console.error('Failed to send admin leave decision email:', emailError);
    }

    return res.status(200).json({ message: `Leave request ${decision.toLowerCase()} successfully.`, status: decision });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

// Cancel/update leave request
router.put('/:id', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const requestId = req.params.id;

    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    // Get employee ID
    const [empRows] = await db.query(
      'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (!empRows || empRows.length === 0) {
      return res.status(404).json({ message: 'Employee record not found.' });
    }

    // Verify ownership
    const [leaveRows] = await db.query(
      'SELECT id, employee_id, status FROM leave_requests WHERE id = ? LIMIT 1',
      [requestId]
    );

    if (!leaveRows || leaveRows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    const leaveRequest = leaveRows[0];

    if (leaveRequest.employee_id !== empRows[0].id) {
      return res.status(403).json({ message: 'You do not have permission to update this leave request.' });
    }

    if (leaveRequest.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only pending requests can be cancelled.' });
    }

    // Update status to CANCELLED
    await db.query(
      'UPDATE leave_requests SET status = ? WHERE id = ?',
      ['CANCELLED', requestId]
    );

    // Fetch and return the updated request
    const [updatedRequest] = await db.query(
      `SELECT 
         lr.id,
         lr.employee_id,
         lr.leave_type_id,
         lt.name AS leave_type,
         lr.start_date,
         lr.end_date,
         lr.total_days,
         lr.reason,
         lr.status,
         lr.created_at
       FROM leave_requests lr
       LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.id = ?
       LIMIT 1`,
      [requestId]
    );

    res.status(200).json({ 
      message: 'Leave request cancelled successfully.',
      leaveRequest: updatedRequest[0]
    });
  } catch (error) {
    next(error);
  }
});

// Export leave requests as CSV
router.get('/export/csv', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const role = req.user.role;
    let query = '';
    let params = [];

    if (role === 'ADMIN') {
      // Admin: export all leave requests
      query = `
        SELECT
          u.name AS employee_name,
          e.employee_code,
          lt.name AS leave_type,
          lr.start_date,
          lr.end_date,
          lr.total_days,
          lr.reason,
          lr.status,
          lr.created_at
        FROM leave_requests lr
        INNER JOIN employees e ON e.id = lr.employee_id
        INNER JOIN users u ON u.id = e.user_id
        LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
        ORDER BY lr.created_at DESC
        LIMIT 10000
      `;
    } else {
      // Manager: export team leave requests
      query = `
        SELECT
          u.name AS employee_name,
          e.employee_code,
          lt.name AS leave_type,
          lr.start_date,
          lr.end_date,
          lr.total_days,
          lr.reason,
          lr.status,
          lr.created_at
        FROM leave_requests lr
        INNER JOIN employees e ON e.id = lr.employee_id
        INNER JOIN users u ON u.id = e.user_id
        LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
        WHERE e.manager_id = (
          SELECT id FROM employees WHERE user_id = ? LIMIT 1
        )
        ORDER BY lr.created_at DESC
        LIMIT 10000
      `;
      params = [req.user.id];
    }

    const [records] = await db.query(query, params);

    const csv = generateLeaveRequestsCSV(records || []);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `leave_requests_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

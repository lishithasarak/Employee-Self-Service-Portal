const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { sendReimbursementApprovalEmail } = require('../utils/emailService');
const { generateReimbursementCSV } = require('../utils/csvExport');

const router = express.Router();
const categories = new Set(['TRAVEL', 'FOOD', 'MEDICAL', 'OTHER']);
const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const [employeeRows] = await db.query('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [req.user.id]);
    if (employeeRows.length === 0) return res.status(404).json({ message: 'Employee record not found.' });
    const [reimbursements] = await db.query(
      `SELECT id, category, amount, expense_date, description, receipt_url, status, comments, created_at
       FROM reimbursements WHERE employee_id = ? ORDER BY created_at DESC`,
      [employeeRows[0].id]
    );
    res.status(200).json({ reimbursements });
  } catch (error) { next(error); }
});

router.get('/team', authenticate, authorize('MANAGER'), async (req, res, next) => {
  try {
    const [managerRows] = await db.query('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [req.user.id]);
    if (managerRows.length === 0) return res.status(404).json({ message: 'Manager employee record not found.' });
    const [reimbursements] = await db.query(
      `SELECT r.id, r.category, r.amount, r.expense_date, r.description, r.receipt_url, r.status, r.comments, r.created_at,
              u.name AS employee_name, e.employee_code
       FROM reimbursements r
       INNER JOIN employees e ON e.id = r.employee_id
       INNER JOIN users u ON u.id = e.user_id
       WHERE e.manager_id = ?
       ORDER BY CASE WHEN r.status = 'PENDING' THEN 0 ELSE 1 END, r.created_at DESC`,
      [managerRows[0].id]
    );
    res.status(200).json({ reimbursements });
  } catch (error) { next(error); }
});

router.post('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const category = String(req.body?.category || '').trim().toUpperCase();
    const amount = Number(req.body?.amount);
    const expenseDate = String(req.body?.expense_date || '');
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const receiptUrl = typeof req.body?.receipt_url === 'string' ? req.body.receipt_url.trim() : null;
    if (!categories.has(category) || !Number.isFinite(amount) || amount <= 0 || amount > 1000000 || !isDate(expenseDate) || !description) {
      return res.status(400).json({ message: 'Category, positive amount up to 1,000,000, valid expense date, and description are required.' });
    }
    if (description.length > 1000) return res.status(400).json({ message: 'Description is too long.' });
    if (receiptUrl && (receiptUrl.length > 255 || !/^https?:\/\//i.test(receiptUrl))) return res.status(400).json({ message: 'Receipt URL must be a valid http(s) URL within 255 characters.' });

    const [employeeRows] = await db.query('SELECT id, manager_id FROM employees WHERE user_id = ? LIMIT 1', [req.user.id]);
    if (employeeRows.length === 0) return res.status(404).json({ message: 'Employee record not found.' });
    const employee = employeeRows[0];
    const [result] = await db.query(
      `INSERT INTO reimbursements (employee_id, category, amount, expense_date, description, receipt_url, status)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      [employee.id, category, amount, expenseDate, description, receiptUrl || null]
    );
    if (employee.manager_id) {
      const [managerRows] = await db.query('SELECT user_id FROM employees WHERE id = ? LIMIT 1', [employee.manager_id]);
      if (managerRows.length) await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES (?, 'New reimbursement request', ?, 'REIMBURSEMENT')`,
        [managerRows[0].user_id, `A team member submitted reimbursement RMB-${result.insertId}.`]
      );
    }
    res.status(201).json({ message: 'Reimbursement request submitted successfully.', reimbursementId: result.insertId, requestCode: `RMB-${result.insertId}` });
  } catch (error) { next(error); }
});

router.put('/:id/decision', authenticate, authorize('MANAGER'), async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const requestId = Number(req.params.id);
    const status = String(req.body?.status || '').toUpperCase();
    const comments = typeof req.body?.comments === 'string' ? req.body.comments.trim() : null;
    if (!Number.isInteger(requestId) || !['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ message: 'A valid request ID and decision are required.' });
    if (status === 'REJECTED' && !comments) return res.status(400).json({ message: 'A rejection reason is required.' });
    await connection.beginTransaction();
    const [managerRows] = await connection.query('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [req.user.id]);
    const [requestRows] = await connection.query(
      `SELECT r.id, r.status, r.category, r.amount, e.user_id, u.email, u.name FROM reimbursements r 
       INNER JOIN employees e ON e.id = r.employee_id
       INNER JOIN users u ON u.id = e.user_id
       WHERE r.id = ? AND e.manager_id = ? FOR UPDATE`, [requestId, managerRows[0]?.id || 0]
    );
    if (!managerRows.length || !requestRows.length) { await connection.rollback(); return res.status(404).json({ message: 'Reimbursement request not found for your team.' }); }
    if (requestRows[0].status !== 'PENDING') { await connection.rollback(); return res.status(400).json({ message: 'Only pending reimbursement requests can be decided.' }); }
    await connection.query('UPDATE reimbursements SET status = ?, comments = ?, reviewed_by = ? WHERE id = ?', [status, comments, managerRows[0].id, requestId]);
    await connection.query(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'REIMBURSEMENT')`, [requestRows[0].user_id, `Reimbursement ${status.toLowerCase()}`, status === 'APPROVED' ? `Your reimbursement RMB-${requestId} was approved.` : `Your reimbursement RMB-${requestId} was rejected: ${comments}`]);
    
    // Send email notification
    try {
      await sendReimbursementApprovalEmail({
        to: requestRows[0].email,
        name: requestRows[0].name,
        category: requestRows[0].category,
        amount: Number(requestRows[0].amount),
        status: status,
        comments: comments || ''
      });
    } catch (emailError) {
      console.error('Failed to send reimbursement approval email:', emailError);
      // Don't fail the request if email fails
    }
    
    await connection.commit();
    res.status(200).json({ message: `Reimbursement ${status.toLowerCase()} successfully.`, status });
  } catch (error) { await connection.rollback(); next(error); }
  finally { connection.release(); }
});

// Export reimbursements as CSV
router.get('/export/csv', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const role = req.user.role;
    let query = '';
    let params = [];

    if (role === 'ADMIN') {
      query = `
        SELECT
          u.name AS employee_name,
          e.employee_code,
          r.category,
          r.amount,
          r.expense_date,
          r.description,
          r.status,
          r.created_at
        FROM reimbursements r
        INNER JOIN employees e ON e.id = r.employee_id
        INNER JOIN users u ON u.id = e.user_id
        ORDER BY r.created_at DESC
        LIMIT 10000
      `;
    } else {
      query = `
        SELECT
          u.name AS employee_name,
          e.employee_code,
          r.category,
          r.amount,
          r.expense_date,
          r.description,
          r.status,
          r.created_at
        FROM reimbursements r
        INNER JOIN employees e ON e.id = r.employee_id
        INNER JOIN users u ON u.id = e.user_id
        WHERE e.manager_id = (
          SELECT id FROM employees WHERE user_id = ? LIMIT 1
        )
        ORDER BY r.created_at DESC
        LIMIT 10000
      `;
      params = [req.user.id];
    }

    const [records] = await db.query(query, params);

    const csv = generateReimbursementCSV(records || []);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `reimbursements_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

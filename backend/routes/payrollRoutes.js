const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { generatePayrollCSV } = require('../utils/csvExport');

const router = express.Router();

const months = new Set(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);

router.get('/admin/employees', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const [employees] = await db.query(
      `SELECT e.id, e.employee_code, u.name, d.name AS department, e.designation
       FROM employees e INNER JOIN users u ON u.id = e.user_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.status = 'ACTIVE' AND u.is_active = 1 ORDER BY u.name`
    );
    res.status(200).json({ employees });
  } catch (error) { next(error); }
});

router.get('/admin', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const [payslips] = await db.query(
      `SELECT p.id, p.employee_id, p.month, p.year, p.gross_salary, p.deductions, p.net_salary, p.file_url, p.status, p.created_at,
              e.employee_code, u.name AS employee_name, d.name AS department
       FROM payslips p INNER JOIN employees e ON e.id = p.employee_id
       INNER JOIN users u ON u.id = e.user_id LEFT JOIN departments d ON d.id = e.department_id
       ORDER BY p.year DESC, FIELD(p.month, 'December','November','October','September','August','July','June','May','April','March','February','January'), u.name`
    );
    res.status(200).json({ payslips });
  } catch (error) { next(error); }
});

router.post('/admin', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const employeeId = Number(req.body?.employee_id); const year = Number(req.body?.year);
    const month = String(req.body?.month || ''); const grossSalary = Number(req.body?.gross_salary); const deductions = Number(req.body?.deductions || 0);
    if (!Number.isInteger(employeeId) || !months.has(month) || !Number.isInteger(year) || year < 2000 || !Number.isFinite(grossSalary) || grossSalary < 0 || !Number.isFinite(deductions) || deductions < 0 || deductions > grossSalary) return res.status(400).json({ message: 'Provide a valid employee, pay period, gross salary, and deductions.' });
    const [employees] = await db.query('SELECT id FROM employees WHERE id = ? LIMIT 1', [employeeId]);
    if (!employees.length) return res.status(404).json({ message: 'Employee not found.' });
    const [result] = await db.query(`INSERT INTO payslips (employee_id, month, year, gross_salary, deductions, net_salary, status) VALUES (?, ?, ?, ?, ?, ?, 'DRAFT')`, [employeeId, month, year, grossSalary, deductions, grossSalary - deductions]);
    res.status(201).json({ message: 'Draft payslip created.', payslipId: result.insertId });
  } catch (error) { if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A payslip already exists for this employee and pay period.' }); next(error); }
});

router.put('/admin/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const id = Number(req.params.id); const status = req.body?.status ? String(req.body.status).toUpperCase() : null;
    const grossSalary = req.body?.gross_salary === undefined ? null : Number(req.body.gross_salary); const deductions = req.body?.deductions === undefined ? null : Number(req.body.deductions);
    const [rows] = await db.query('SELECT p.*, e.user_id FROM payslips p INNER JOIN employees e ON e.id = p.employee_id WHERE p.id = ? LIMIT 1', [id]);
    if (!Number.isInteger(id) || !rows.length) return res.status(404).json({ message: 'Payslip not found.' });
    const current = rows[0]; const gross = grossSalary === null ? Number(current.gross_salary) : grossSalary; const deduction = deductions === null ? Number(current.deductions) : deductions;
    if (!Number.isFinite(gross) || gross < 0 || !Number.isFinite(deduction) || deduction < 0 || deduction > gross || (status && !['DRAFT', 'PUBLISHED'].includes(status))) return res.status(400).json({ message: 'Invalid payroll update.' });
    const nextStatus = status || current.status;
    await db.query('UPDATE payslips SET gross_salary = ?, deductions = ?, net_salary = ?, status = ? WHERE id = ?', [gross, deduction, gross - deduction, nextStatus, id]);
    if (current.status !== 'PUBLISHED' && nextStatus === 'PUBLISHED') await db.query(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, 'Payslip available', ?, 'PAYROLL')`, [current.user_id, `Your ${current.month} ${current.year} payslip is now available.`]);
    res.status(200).json({ message: nextStatus === 'PUBLISHED' && current.status !== 'PUBLISHED' ? 'Payslip published.' : 'Payslip updated.' });
  } catch (error) { next(error); }
});

// Get employee payslips
router.get('/', authenticate, authorize('EMPLOYEE', 'ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    // Get employee ID from user
    const [empRows] = await db.query(
      'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (!empRows || empRows.length === 0) {
      return res.status(200).json({
        payslips: [],
        summary: {
          grossSalary: 0,
          netSalary: 0,
        },
      });
    }

    const employeeId = empRows[0].id;

    const [payslips] = await db.query(
      `SELECT 
         id,
         employee_id,
         month,
         year,
         gross_salary,
         deductions,
         net_salary,
         file_url,
         status,
         created_at
       FROM payslips
       WHERE employee_id = ? AND status = 'PUBLISHED'
       ORDER BY year DESC, month DESC
       LIMIT 50`,
      [employeeId]
    );

    const summary = {
      grossSalary: payslips.length > 0 ? payslips[0].gross_salary : 0,
      netSalary: payslips.length > 0 ? payslips[0].net_salary : 0,
    };

    res.status(200).json({
      payslips: payslips || [],
      summary,
    });
  } catch (error) {
    next(error);
  }
});

// Get payslip by ID
router.get('/:id', authenticate, authorize('EMPLOYEE', 'ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const payslipId = req.params.id;

    // Get employee ID from user
    const [empRows] = await db.query(
      'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (!empRows || empRows.length === 0) {
      return res.status(404).json({ message: 'Employee record not found.' });
    }

    const employeeId = empRows[0].id;

    const [payslips] = await db.query(
      `SELECT 
         p.id,
         p.employee_id,
         p.month,
         p.year,
         p.gross_salary,
         p.deductions,
         p.net_salary,
         p.file_url,
         p.status,
         p.created_at,
         e.employee_code,
         u.name AS employee_name,
         d.name AS department,
         e.designation
       FROM payslips p
       LEFT JOIN employees e ON e.id = p.employee_id
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE p.id = ? AND p.employee_id = ?
       LIMIT 1`,
      [payslipId, employeeId]
    );

    if (!payslips || payslips.length === 0) {
      return res.status(404).json({ message: 'Payslip not found.' });
    }

    res.status(200).json({
      payslip: payslips[0],
    });
  } catch (error) {
    next(error);
  }
});

// Export payroll data as CSV
router.get('/export/csv', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const query = `
      SELECT
        u.name AS employee_name,
        e.employee_code,
        d.name AS department,
        p.gross_salary,
        p.basic_pay,
        p.allowances,
        p.deductions,
        p.net_salary,
        p.payment_date,
        p.status
      FROM payslips p
      INNER JOIN employees e ON e.id = p.employee_id
      INNER JOIN users u ON u.id = e.user_id
      LEFT JOIN departments d ON d.id = e.department_id
      ORDER BY p.payment_date DESC, e.employee_code ASC
      LIMIT 10000
    `;

    const [records] = await db.query(query);

    const csv = generatePayrollCSV(records || []);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `payroll_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const express = require('express');
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { generateEmployeeCSV } = require('../utils/csvExport');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const [employees] = await db.query(`SELECT e.id, e.employee_code, e.department_id, e.manager_id, u.name, u.email, d.name AS department, e.designation, e.joining_date, e.status, r.name AS role, m.employee_code AS manager_code
      FROM employees e INNER JOIN users u ON u.id = e.user_id INNER JOIN roles r ON r.id = u.role_id
      LEFT JOIN departments d ON d.id = e.department_id LEFT JOIN employees m ON m.id = e.manager_id ORDER BY u.name`);
    res.status(200).json({ employees });
  } catch (error) { next(error); }
});

router.get('/meta', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const [departments] = await db.query('SELECT id, name FROM departments WHERE is_active = 1 ORDER BY name');
    const [managers] = await db.query(`SELECT e.id, e.employee_code, u.name FROM employees e INNER JOIN users u ON u.id=e.user_id INNER JOIN roles r ON r.id=u.role_id WHERE r.name='MANAGER' AND e.status='ACTIVE' AND u.is_active=1 ORDER BY u.name`);
    res.status(200).json({ departments, managers });
  } catch (error) { next(error); }
});

router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { name, email, password, designation, department_id, joining_date, manager_id, role = 'EMPLOYEE', phone } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!String(name || '').trim() || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || String(password || '').length < 8 || !String(designation || '').trim() || !joining_date) return res.status(400).json({ message: 'Name, valid email, 8-character password, designation, and joining date are required.' });
    if (!['EMPLOYEE', 'MANAGER', 'ADMIN'].includes(role)) return res.status(400).json({ message: 'Invalid role.' });
    await connection.beginTransaction();
    const [roleRows] = await connection.query('SELECT id FROM roles WHERE name = ? LIMIT 1', [role]);
    if (!roleRows.length) { await connection.rollback(); return res.status(400).json({ message: 'Role is not configured.' }); }
    const passwordHash = await bcrypt.hash(password, 10);
    const [userResult] = await connection.query('INSERT INTO users (name, email, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, 1)', [name.trim(), normalizedEmail, passwordHash, roleRows[0].id]);
    const employeeCode = `EMP-${String(userResult.insertId).padStart(5, '0')}`;
    const [employeeResult] = await connection.query('INSERT INTO employees (user_id, employee_code, department_id, designation, phone, joining_date, manager_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, \'ACTIVE\')', [userResult.insertId, employeeCode, department_id || null, designation.trim(), phone || null, joining_date, manager_id || null]);
    await connection.commit();
    await logAudit({ userId: req.user.id, action: 'EMPLOYEE_CREATED', entityType: 'EMPLOYEE', entityId: employeeResult.insertId, newValue: { employee_code: employeeCode, role, department_id: department_id || null } });
    res.status(201).json({ message: 'Employee created successfully.', employee: { id: employeeResult.insertId, employee_code: employeeCode } });
  } catch (error) { await connection.rollback(); if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'An account with this email already exists.' }); next(error); } finally { connection.release(); }
});

router.put('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const employeeId = Number(req.params.id);
    const { designation, department_id, manager_id, joining_date, phone, role } = req.body || {};
    if (!Number.isInteger(employeeId) || employeeId <= 0) return res.status(400).json({ message: 'Invalid employee ID.' });
    const [employeeRows] = await db.query('SELECT e.id, e.user_id FROM employees e WHERE e.id = ? LIMIT 1', [employeeId]);
    if (!employeeRows.length) return res.status(404).json({ message: 'Employee not found.' });
    if (manager_id && Number(manager_id) === employeeId) return res.status(400).json({ message: 'An employee cannot be their own manager.' });
    if (role && !['EMPLOYEE', 'MANAGER', 'ADMIN'].includes(role)) return res.status(400).json({ message: 'Invalid role.' });
    await db.query(`UPDATE employees SET designation = COALESCE(?, designation), department_id = ?, manager_id = ?, joining_date = COALESCE(?, joining_date), phone = ? WHERE id = ?`, [designation?.trim() || null, department_id || null, manager_id || null, joining_date || null, phone || null, employeeId]);
    if (role) await db.query('UPDATE users SET role_id = (SELECT id FROM roles WHERE name = ?) WHERE id = ?', [role, employeeRows[0].user_id]);
    await logAudit({ userId: req.user.id, action: 'EMPLOYEE_UPDATED', entityType: 'EMPLOYEE', entityId: employeeId, newValue: { designation, department_id: department_id || null, manager_id: manager_id || null, joining_date, phone, role } });
    res.status(200).json({ message: 'Employee updated successfully.' });
  } catch (error) { next(error); }
});

router.put('/:id/status', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const status = String(req.body?.status || '').toUpperCase();
    if (!['ACTIVE', 'INACTIVE'].includes(status)) return res.status(400).json({ message: 'Status must be ACTIVE or INACTIVE.' });
    const [result] = await db.query(`UPDATE employees e INNER JOIN users u ON u.id = e.user_id SET e.status = ?, u.is_active = ? WHERE e.id = ?`, [status, status === 'ACTIVE' ? 1 : 0, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Employee not found.' });
    await logAudit({ userId: req.user.id, action: 'EMPLOYEE_STATUS_UPDATED', entityType: 'EMPLOYEE', entityId: Number(req.params.id), newValue: { status } });
    res.status(200).json({ message: `Employee ${status.toLowerCase()}.` });
  } catch (error) { next(error); }
});

router.get('/me', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), async (req, res) => {
  res.status(200).json({
    message: 'Employee profile endpoint is available.',
    user: req.user,
  });
});

// Export employees as CSV
router.get('/export/csv', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const query = `
      SELECT
        u.name,
        e.employee_code,
        u.email,
        e.phone,
        d.name AS department,
        e.designation,
        e.joining_date,
        e.status
      FROM employees e
      INNER JOIN users u ON u.id = e.user_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.status = 'ACTIVE'
      ORDER BY u.name ASC
      LIMIT 10000
    `;

    const [records] = await db.query(query);

    const csv = generateEmployeeCSV(records || []);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `employees_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

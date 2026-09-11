const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();
const normalizeCode = (value) => String(value || '').trim().toUpperCase();
const isValidCode = (value) => /^[A-Z0-9_-]{2,50}$/.test(value);
const authorizeDepartmentAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  if (String(req.user.role || '').trim().toUpperCase() !== 'ADMIN') {
    return res.status(403).json({ message: 'You do not have permission to access this resource.' });
  }

  next();
};

router.use(authenticate, authorizeDepartmentAdmin);

router.get('/', async (req, res, next) => {
  try {
    const [departments] = await db.query(`
      SELECT d.id, d.name, d.code, d.description, d.is_active, d.archived_at,
             d.created_at, COUNT(e.id) AS employee_count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id
      GROUP BY d.id, d.name, d.code, d.description, d.is_active, d.archived_at, d.created_at
      ORDER BY d.is_active DESC, d.name ASC
    `);
    res.status(200).json({ departments: departments || [] });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const code = normalizeCode(req.body?.code);
    const description = String(req.body?.description || '').trim() || null;
    if (!name || name.length > 120 || !isValidCode(code) || (description && description.length > 255)) {
      return res.status(400).json({ message: 'A name, a 2-50 character department code, and an optional 255-character description are required.' });
    }
    const [result] = await db.query('INSERT INTO departments (name, code, description) VALUES (?, ?, ?)', [name, code, description]);
    await logAudit({ userId: req.user.id, action: 'DEPARTMENT_CREATED', entityType: 'DEPARTMENT', entityId: result.insertId, newValue: { name, code, description } });
    res.status(201).json({ message: 'Department created successfully.', department: { id: result.insertId, name, code, description, is_active: 1 } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A department with this name or code already exists.' });
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const name = String(req.body?.name || '').trim();
    const code = normalizeCode(req.body?.code);
    const description = String(req.body?.description || '').trim() || null;
    if (!Number.isInteger(id) || id <= 0 || !name || name.length > 120 || !isValidCode(code) || (description && description.length > 255)) {
      return res.status(400).json({ message: 'Provide a valid department, name, code, and optional description.' });
    }
    const [existing] = await db.query('SELECT id, name, code, description FROM departments WHERE id = ? LIMIT 1', [id]);
    if (!existing.length) return res.status(404).json({ message: 'Department not found.' });
    await db.query('UPDATE departments SET name = ?, code = ?, description = ? WHERE id = ?', [name, code, description, id]);
    await logAudit({ userId: req.user.id, action: 'DEPARTMENT_UPDATED', entityType: 'DEPARTMENT', entityId: id, oldValue: existing[0], newValue: { name, code, description } });
    res.status(200).json({ message: 'Department updated successfully.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A department with this name or code already exists.' });
    next(error);
  }
});

router.put('/:id/archive', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Invalid department ID.' });
    const [result] = await db.query('UPDATE departments SET is_active = 0, archived_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = 1', [id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Active department not found.' });
    await logAudit({ userId: req.user.id, action: 'DEPARTMENT_ARCHIVED', entityType: 'DEPARTMENT', entityId: id });
    res.status(200).json({ message: 'Department archived. Existing employee assignments were preserved.' });
  } catch (error) { next(error); }
});

router.put('/:id/restore', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Invalid department ID.' });
    const [result] = await db.query('UPDATE departments SET is_active = 1, archived_at = NULL WHERE id = ? AND is_active = 0', [id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Archived department not found.' });
    await logAudit({ userId: req.user.id, action: 'DEPARTMENT_RESTORED', entityType: 'DEPARTMENT', entityId: id });
    res.status(200).json({ message: 'Department restored successfully.' });
  } catch (error) { next(error); }
});

module.exports = router;

const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const search = String(req.query.search || '').trim();
    const action = String(req.query.action || '').trim();
    const clauses = [];
    const params = [];

    if (!isAdmin) {
      clauses.push('al.user_id = ?');
      params.push(req.user.id);
    }
    if (action) {
      clauses.push('al.action = ?');
      params.push(action);
    }
    if (search) {
      clauses.push('(u.name LIKE ? OR u.email LIKE ? OR al.action LIKE ? OR al.entity_type LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await db.query(
      `SELECT al.id, al.user_id, al.action, al.entity_type, al.entity_id,
              al.old_value, al.new_value, al.created_at, u.name AS user_name, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [...params, limit]
    );

    const logs = Array.isArray(rows) ? rows : [];

    return res.status(200).json({
      logs: logs.map((log) => {
        const parseJson = (value) => {
          if (value === null || value === undefined || value === '') {
            return null;
          }

          if (typeof value === 'object') {
            return value;
          }

          try {
            return JSON.parse(value);
          } catch (error) {
            return value;
          }
        };

        return {
          ...log,
          old_value: parseJson(log.old_value),
          new_value: parseJson(log.new_value),
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

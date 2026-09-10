const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const [notifications] = await db.query('SELECT id, title, message, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [req.user.id]);
    res.status(200).json({ notifications, unreadCount: notifications.filter((item) => !item.is_read).length });
  } catch (error) { next(error); }
});
router.put('/:id/read', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), async (req, res, next) => {
  try { const [result] = await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]); if (!result.affectedRows) return res.status(404).json({ message: 'Notification not found.' }); res.status(200).json({ message: 'Notification marked as read.' }); } catch (error) { next(error); }
});
router.put('/read-all', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), async (req, res, next) => {
  try { await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]); res.status(200).json({ message: 'Notifications marked as read.' }); } catch (error) { next(error); }
});
module.exports = router;

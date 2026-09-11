const db = require('../config/db');

const logAudit = async ({
  userId,
  action,
  entityType = null,
  entityId = null,
  oldValue = null,
  newValue = null,
}) => {
  if (!action) {
    return null;
  }

  try {
    const [result] = await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId ?? null, action, entityType, entityId, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null]
    );

    return result;
  } catch (error) {
    console.error('Audit log insert failed:', {
      code: error?.code,
      message: error?.message,
    });

    if (error && ['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ECONNRESET'].includes(error.code)) {
      return null;
    }

    return null;
  }
};

module.exports = { logAudit };

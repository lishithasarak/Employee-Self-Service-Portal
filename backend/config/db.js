const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const {
  sampleUsers,
  sampleEmployees,
  sampleAttendance,
} = require('../data/sampleData');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_ess',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const demoUsers = sampleUsers.map((user) => ({
  ...user,
  is_active: user.is_active ? 1 : 0,
}));

const demoEmployees = sampleEmployees.map((employee) => ({
  ...employee,
}));

const demoAttendance = sampleAttendance.map((record) => ({
  ...record,
}));

const demoAuditLogs = [
  {
    id: 1,
    user_id: 3,
    action: 'LOGIN',
    entity_type: 'AUTH',
    entity_id: 3,
    old_value: null,
    new_value: JSON.stringify({ method: 'JWT' }),
    created_at: '2026-08-17 09:00:00',
  },
  {
    id: 2,
    user_id: 3,
    action: 'PROFILE_UPDATE',
    entity_type: 'PROFILE',
    entity_id: 3,
    old_value: JSON.stringify({ phone: null }),
    new_value: JSON.stringify({ phone: '+1-555-0101' }),
    created_at: '2026-08-17 10:25:00',
  },
];

const getDemoProfile = (userId) => {
  const numericUserId = Number(userId);
  const user = demoUsers.find((item) => Number(item.id) === numericUserId);
  const employee = demoEmployees.find((item) => Number(item.user_id) === numericUserId);

  if (!user || !employee) {
    return [];
  }

  return [{
    user_id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    employee_id: employee.id,
    employee_code: employee.employee_code,
    department: employee.department || null,
    designation: employee.designation || null,
    phone: employee.phone || null,
    address: employee.address || null,
    emergency_contact_name: employee.emergency_contact_name || null,
    emergency_contact_phone: employee.emergency_contact_phone || null,
    joining_date: employee.joining_date || null,
    profile_photo: employee.profile_photo || null,
    manager_name: employee.manager_name || null,
  }];
};

const getDemoRows = (sql, params) => {
  const normalized = String(sql || '').replace(/\s+/g, ' ').trim();
  const upper = normalized.toUpperCase();

  if (upper.includes('FROM USERS') && upper.includes('WHERE EMAIL = ?')) {
    const email = String(params?.[0] || '').toLowerCase();
    const user = demoUsers.find((item) => String(item.email).toLowerCase() === email);

    if (!user) {
      return [];
    }

    return [{
      id: user.id,
      name: user.name,
      email: user.email,
      password_hash: user.password_hash,
      role: user.role,
      is_active: user.is_active,
    }];
  }

  if (upper.includes('SELECT ID, NAME, EMAIL FROM USERS WHERE EMAIL = ? AND IS_ACTIVE = 1 LIMIT 1')) {
    const email = String(params?.[0] || '').toLowerCase();
    const user = demoUsers.find((item) => String(item.email).toLowerCase() === email);
    return user ? [{ id: user.id, name: user.name, email: user.email }] : [];
  }

  if (upper.includes('FROM USERS U') && upper.includes('LEFT JOIN EMPLOYEES E')) {
    const userId = Number(params?.[0] || 0);
    return getDemoProfile(userId);
  }

  if (upper.includes('FROM PASSWORD_RESET_TOKENS') && upper.includes('WHERE TOKEN_HASH = ?')) {
    const tokenHash = String(params?.[0] || '');
    const tokens = demoResetTokens.filter((token) => token.token_hash === tokenHash && !token.used_at && new Date(token.expires_at) > new Date());
    return tokens.map((token) => ({ id: token.id, user_id: token.user_id, expires_at: token.expires_at }));
  }

  if (upper.includes('FROM ATTENDANCE') && upper.includes('WHERE EMPLOYEE_ID = (')) {
    const employeeId = Number(params?.[0] || 0);
    const rows = demoAttendance.filter((item) => Number(item.employee_id) === employeeId);
    return rows;
  }

  if (upper.includes('FROM ATTENDANCE') && upper.includes('WHERE EMPLOYEE_ID = ?') && upper.includes('ORDER BY ATTENDANCE_DATE DESC')) {
    const userId = Number(params?.[0] || 0);
    const employee = demoEmployees.find((item) => Number(item.user_id) === userId);
    if (!employee) {
      return [];
    }

    return demoAttendance.filter((item) => Number(item.employee_id) === Number(employee.id));
  }

  if (upper.includes('FROM PAYSLIPS') && upper.includes('WHERE EMPLOYEE_ID = ?')) {
    const employeeId = Number(params?.[0] || 0);
    const rows = [
      {
        id: 1,
        employee_id: employeeId,
        month: 'August',
        year: 2026,
        gross_salary: 85000,
        deductions: 12500,
        net_salary: 72500,
        file_url: '/downloads/payslip-aug-2026.pdf',
        status: 'PUBLISHED',
        created_at: '2026-08-01 00:00:00',
      },
      {
        id: 2,
        employee_id: employeeId,
        month: 'July',
        year: 2026,
        gross_salary: 85000,
        deductions: 11750,
        net_salary: 73250,
        file_url: '/downloads/payslip-jul-2026.pdf',
        status: 'PUBLISHED',
        created_at: '2026-07-01 00:00:00',
      },
    ];

    return rows;
  }

  if (upper.includes('FROM DOCUMENTS') && upper.includes('WHERE IS_ACTIVE = 1')) {
    return [
      {
        id: 1,
        title: 'Employee Handbook',
        category: 'Policy',
        file_url: '/uploads/employee-handbook.pdf',
        visibility: 'ALL',
        created_at: '2026-08-01 00:00:00',
      },
      {
        id: 2,
        title: 'Travel Reimbursement Policy',
        category: 'Finance',
        file_url: '/uploads/travel-policy.pdf',
        visibility: 'EMPLOYEE',
        created_at: '2026-08-02 00:00:00',
      },
      {
        id: 3,
        title: 'Holiday Calendar 2026',
        category: 'Schedule',
        file_url: '/uploads/holiday-calendar.pdf',
        visibility: 'ALL',
        created_at: '2026-08-03 00:00:00',
      },
    ];
  }

  if (upper.includes('FROM SUPPORT_TICKETS') && upper.includes('WHERE 1 = 1')) {
    return [
      {
        id: 1,
        employee_id: 1,
        category: 'Payroll',
        subject: 'Payslip discrepancy',
        description: 'I want to verify the deduction line item in my August payslip.',
        priority: 'MEDIUM',
        status: 'OPEN',
        assigned_to: null,
        created_at: '2026-08-12 10:00:00',
        employee_name: 'Nisha Employee',
        assigned_to_name: null,
      },
      {
        id: 2,
        employee_id: 1,
        category: 'IT Support',
        subject: 'Laptop access issue',
        description: 'Need access to internal ticketing portal after device migration.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        assigned_to: null,
        created_at: '2026-08-08 08:30:00',
        employee_name: 'Nisha Employee',
        assigned_to_name: null,
      },
    ];
  }

  if (upper.includes('SELECT ID FROM EMPLOYEES WHERE USER_ID = ? LIMIT 1')) {
    const userId = Number(params?.[0] || 0);
    const employee = demoEmployees.find((item) => Number(item.user_id) === userId);
    return employee ? [{ id: employee.id }] : [];
  }

  if (upper.includes('UPDATE USERS SET LAST_LOGIN = CURRENT_TIMESTAMP WHERE ID = ?')) {
    return [{ affectedRows: 1 }];
  }

  if (upper.includes('INSERT INTO PASSWORD_RESET_TOKENS')) {
    const userId = Number(params?.[0] || 0);
    const tokenHash = String(params?.[1] || '');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const record = {
      id: demoResetTokens.length + 1,
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used_at: null,
    };

    demoResetTokens.push(record);
    return [{ insertId: record.id, affectedRows: 1 }];
  }

  if (upper.includes('UPDATE PASSWORD_RESET_TOKENS SET USED_AT = CURRENT_TIMESTAMP WHERE USER_ID = ?') || upper.includes('UPDATE PASSWORD_RESET_TOKENS SET USED_AT = CURRENT_TIMESTAMP WHERE ID = ?')) {
    const userId = Number(params?.[0] || 0);
    const id = Number(params?.[0] || 0);
    const matching = demoResetTokens.filter((token) => (Number(token.user_id) === userId && userId > 0) || (Number(token.id) === id && id > 0));
    matching.forEach((token) => {
      token.used_at = new Date().toISOString();
    });
    return [{ affectedRows: matching.length }];
  }

  if (upper.includes('SELECT ID FROM USERS WHERE EMAIL = ? AND IS_ACTIVE = 1 LIMIT 1')) {
    const email = String(params?.[0] || '').toLowerCase();
    const user = demoUsers.find((item) => String(item.email).toLowerCase() === email);
    return user ? [{ id: user.id }] : [];
  }

  if (upper.includes('INSERT INTO AUDIT_LOGS')) {
    const userId = params?.[0] ?? null;
    const action = String(params?.[1] || '');
    const entityType = params?.[2] ?? null;
    const entityId = params?.[3] ?? null;
    const oldValue = params?.[4] ?? null;
    const newValue = params?.[5] ?? null;

    const record = {
      id: demoAuditLogs.length + 1,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    demoAuditLogs.unshift(record);
    return [{ insertId: record.id, affectedRows: 1 }];
  }

  if (upper.includes('FROM AUDIT_LOGS') && (upper.includes('WHERE USER_ID = ?') || upper.includes('WHERE AL.USER_ID = ?'))) {
    const userId = Number(params?.[0] || 0);
    const limit = Number(params?.[1] || 20);
    const filtered = demoAuditLogs
      .filter((item) => Number(item.user_id) === userId)
      .slice(0, limit);

    return filtered.map((item) => ({
      id: item.id,
      user_id: item.user_id,
      action: item.action,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      old_value: item.old_value,
      new_value: item.new_value,
      created_at: item.created_at,
    }));
  }

  if (upper.includes('UPDATE USERS SET PASSWORD_HASH = ?') || upper.includes('UPDATE USERS SET PASSWORD_HASH = ?, UPDATED_AT = CURRENT_TIMESTAMP WHERE ID = ?')) {
    return [{ affectedRows: 1 }];
  }

  return [];
};

const fallbackQuery = async (sql, params = []) => {
  const rows = getDemoRows(sql, params);
  return [rows];
};

const createDemoConnection = () => ({
  query: async (sql, params = []) => fallbackQuery(sql, params),
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {},
  release: () => {},
});

const queryWithFallback = async (sql, params = []) => {
  try {
    return await pool.query(sql, params);
  } catch (error) {
    if (['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ECONNRESET'].includes(error.code)) {
      return fallbackQuery(sql, params);
    }

    throw error;
  }
};

const demoResetTokens = [];

const getDemoTokenRows = (sql, params = []) => {
  const upper = String(sql || '').replace(/\s+/g, ' ').trim().toUpperCase();

  if (upper.includes('SELECT ID, NAME, EMAIL FROM USERS WHERE EMAIL = ? AND IS_ACTIVE = 1 LIMIT 1')) {
    const email = String(params?.[0] || '').toLowerCase();
    const user = demoUsers.find((item) => String(item.email).toLowerCase() === email);
    return user ? [{ id: user.id, name: user.name, email: user.email }] : [];
  }

  if (upper.includes('UPDATE PASSWORD_RESET_TOKENS SET USED_AT = CURRENT_TIMESTAMP WHERE USER_ID = ? AND USED_AT IS NULL')) {
    demoResetTokens
      .filter((token) => Number(token.user_id) === Number(params?.[0]))
      .forEach((token) => {
        token.used_at = new Date().toISOString();
      });

    return [{ affectedRows: 1 }];
  }

  if (upper.includes('INSERT INTO PASSWORD_RESET_TOKENS') || upper.includes('INSERT INTO password_reset_tokens')) {
    const userId = Number(params?.[0] || 0);
    const tokenHash = String(params?.[1] || '');
    const expiresAt = String(params?.[2] || new Date().toISOString());

    const record = {
      id: demoResetTokens.length + 1,
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used_at: null,
      created_at: new Date().toISOString(),
    };

    demoResetTokens.push(record);
    return [{ insertId: record.id, affectedRows: 1 }];
  }

  if (upper.includes('SELECT ID FROM USERS WHERE EMAIL = ? AND IS_ACTIVE = 1 LIMIT 1')) {
    const email = String(params?.[0] || '').toLowerCase();
    const user = demoUsers.find((item) => String(item.email).toLowerCase() === email);
    return user ? [{ id: user.id }] : [];
  }

  if (upper.includes('SELECT ID FROM PASSWORD_RESET_TOKENS')) {
    const tokenHash = String(params?.[0] || '');
    return demoResetTokens.filter((token) => token.token_hash === tokenHash && !token.used_at).map((token) => ({ id: token.id, user_id: token.user_id, expires_at: token.expires_at }));
  }

  if (upper.includes('INSERT INTO AUDIT_LOGS')) {
    const userId = params?.[0] ?? null;
    const action = String(params?.[1] || '');
    const entityType = params?.[2] ?? null;
    const entityId = params?.[3] ?? null;
    const oldValue = params?.[4] ?? null;
    const newValue = params?.[5] ?? null;

    const record = {
      id: demoAuditLogs.length + 1,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    demoAuditLogs.unshift(record);
    return [{ insertId: record.id, affectedRows: 1 }];
  }

  if (upper.includes('FROM AUDIT_LOGS') && (upper.includes('WHERE USER_ID = ?') || upper.includes('WHERE AL.USER_ID = ?'))) {
    const userId = Number(params?.[0] || 0);
    const limit = Number(params?.[1] || 20);
    const filtered = demoAuditLogs.filter((item) => Number(item.user_id) === userId).slice(0, limit);
    return filtered.map((item) => ({
      id: item.id,
      user_id: item.user_id,
      action: item.action,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      old_value: item.old_value,
      new_value: item.new_value,
      created_at: item.created_at,
    }));
  }

  return [];
};

const db = {
  query: async (sql, params = []) => {
    try {
      return await pool.query(sql, params);
    } catch (error) {
      if (['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ECONNRESET'].includes(error.code)) {
        return [getDemoRows(sql, params)];
      }

      throw error;
    }
  },
  execute: async (sql, params = []) => {
    try {
      return await pool.execute(sql, params);
    } catch (error) {
      if (['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ECONNRESET'].includes(error.code)) {
        return [getDemoRows(sql, params)];
      }

      throw error;
    }
  },
  getConnection: async () => {
    try {
      return await pool.getConnection();
    } catch (error) {
      if (['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ECONNRESET'].includes(error.code)) {
        return createDemoConnection();
      }

      throw error;
    }
  },
  close: async () => pool.end(),
  isReady: async () => {
    await pool.query('SELECT 1');
    return true;
  },
};

module.exports = db;

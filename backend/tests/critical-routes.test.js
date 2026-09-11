const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../app');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

const startServer = async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.on('listening', resolve));
  return { server, port: server.address().port };
};

const tokenFor = (id, role) => jwt.sign(
  { id, role, name: 'Test User', email: 'test@smartess.com' },
  process.env.JWT_SECRET,
  { expiresIn: '8h' }
);

const jsonRequest = (method, body, token) => ({
  method,
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(body),
});

test('registration validates required account details', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(
      `http://localhost:${port}/api/auth/register`,
      jsonRequest('POST', { name: 'New User' })
    );

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /valid email/i);
  } finally {
    server.close();
  }
});

test('login rejects a request without credentials', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(
      `http://localhost:${port}/api/auth/login`,
      jsonRequest('POST', {})
    );

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /email and password are required/i);
  } finally {
    server.close();
  }
});

test('leave requests reject invalid input before changing data', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(
      `http://localhost:${port}/api/leaves`,
      jsonRequest('POST', { leave_type_id: 1 }, tokenFor(3, 'EMPLOYEE'))
    );

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /leave type, dates, and reason/i);
  } finally {
    server.close();
  }
});

test('reimbursements reject invalid input before changing data', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(
      `http://localhost:${port}/api/reimbursements`,
      jsonRequest('POST', { category: 'TRAVEL', amount: -1 }, tokenFor(3, 'EMPLOYEE'))
    );

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /positive amount/i);
  } finally {
    server.close();
  }
});

test('notifications require authentication', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(`http://localhost:${port}/api/notifications`);

    assert.equal(response.status, 401);
  } finally {
    server.close();
  }
});

test('employee management remains restricted to administrators', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(`http://localhost:${port}/api/employees`, {
      headers: { Authorization: `Bearer ${tokenFor(2, 'MANAGER')}` },
    });

    assert.equal(response.status, 403);
  } finally {
    server.close();
  }
});

test('department management remains restricted to administrators', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(`http://localhost:${port}/api/departments`, {
      headers: { Authorization: `Bearer ${tokenFor(2, 'MANAGER')}` },
    });

    assert.equal(response.status, 403);
  } finally {
    server.close();
  }
});

test('department management accepts case variations of the administrator role', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(
      `http://localhost:${port}/api/departments`,
      jsonRequest('POST', { name: '', code: '!' }, tokenFor(1, 'admin'))
    );

    assert.equal(response.status, 400);
  } finally {
    server.close();
  }
});

test('department creation validates the name and code before changing data', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(
      `http://localhost:${port}/api/departments`,
      jsonRequest('POST', { name: '', code: '!' }, tokenFor(1, 'ADMIN'))
    );

    assert.equal(response.status, 400);
  } finally {
    server.close();
  }
});

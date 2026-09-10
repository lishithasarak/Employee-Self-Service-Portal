const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const app = require('../app');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

const startServer = async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.on('listening', resolve));
  const { port } = server.address();
  return { server, port };
};

const createToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

test('GET /api/profile/me returns employee profile when authenticated', async () => {
  const { server, port } = await startServer();

  try {
    const token = createToken({ id: 3, role: 'EMPLOYEE', name: 'Nisha Employee', email: 'employee@smartess.com' });
    const res = await fetch(`http://localhost:${port}/api/profile/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.employee.name, 'Nisha Employee');
  } finally {
    server.close();
  }
});

test('GET /api/attendance returns attendance history for the authenticated employee', async () => {
  const { server, port } = await startServer();

  try {
    const token = createToken({ id: 3, role: 'EMPLOYEE', name: 'Nisha Employee', email: 'employee@smartess.com' });
    const res = await fetch(`http://localhost:${port}/api/attendance`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.attendance));
  } finally {
    server.close();
  }
});

test('POST /api/auth/reset-password/token accepts a valid reset token and changes the password', async () => {
  const { server, port } = await startServer();

  try {
    const forgotRes = await fetch(`http://localhost:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@smartess.com' }),
    });

    const forgotData = await forgotRes.json();
    assert.equal(forgotRes.status, 200);
    assert.ok(forgotData.resetUrl || forgotData.message);

    const token = forgotData.resetUrl ? new URL(forgotData.resetUrl).searchParams.get('token') : null;
    assert.ok(token, 'Expected a reset token in the forgot-password response');

    const newPassword = 'NewPassword123!';
    const resetRes = await fetch(`http://localhost:${port}/api/auth/reset-password/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        password: newPassword,
        confirmPassword: newPassword,
      }),
    });

    const resetData = await resetRes.json();
    assert.equal(resetRes.status, 200, resetData.message || 'Expected token-based reset to succeed');
    assert.match(resetData.message, /successfully/i);

    const loginRes = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@smartess.com', password: newPassword }),
    });

    assert.equal(loginRes.status, 200, 'Expected new password to authenticate');
  } finally {
    server.close();
  }
});

test('GET /api/audit returns recent activity for the authenticated user', async () => {
  const { server, port } = await startServer();

  try {
    const token = createToken({ id: 3, role: 'EMPLOYEE', name: 'Nisha Employee', email: 'employee@smartess.com' });
    const res = await fetch(`http://localhost:${port}/api/audit`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.logs));
    assert.ok(data.logs.length >= 0);
  } finally {
    server.close();
  }
});

test('GET /api/health returns secure response headers', async () => {
  const { server, port } = await startServer();

  try {
    const res = await fetch(`http://localhost:${port}/api/health`);

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
  } finally {
    server.close();
  }
});

test('POST /api/auth/login enforces a rate limit after repeated bad attempts', async () => {
  const { server, port } = await startServer();

  try {
    let lastStatus = 401;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const res = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bad@example.com', password: 'wrongpass' }),
      });

      lastStatus = res.status;
    }

    assert.equal(lastStatus, 429, 'Expected the login limiter to block repeated bad attempts.');
  } finally {
    server.close();
  }
});

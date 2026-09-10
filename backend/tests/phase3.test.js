const test = require('node:test');
const assert = require('node:assert/strict');
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

test('GET /api/payroll returns payslip history for an authenticated employee', async () => {
  const { server, port } = await startServer();

  try {
    const token = createToken({ id: 3, role: 'EMPLOYEE', name: 'Nisha Employee', email: 'employee@smartess.com' });
    const res = await fetch(`http://localhost:${port}/api/payroll`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.payslips));
  } finally {
    server.close();
  }
});

test('GET /api/documents returns company documents with categories', async () => {
  const { server, port } = await startServer();

  try {
    const token = createToken({ id: 3, role: 'EMPLOYEE', name: 'Nisha Employee', email: 'employee@smartess.com' });
    const res = await fetch(`http://localhost:${port}/api/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.documents));
  } finally {
    server.close();
  }
});

test('GET /api/tickets returns employee support tickets', async () => {
  const { server, port } = await startServer();

  try {
    const token = createToken({ id: 3, role: 'EMPLOYEE', name: 'Nisha Employee', email: 'employee@smartess.com' });
    const res = await fetch(`http://localhost:${port}/api/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.tickets));
  } finally {
    server.close();
  }
});

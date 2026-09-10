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

const createToken = (role) => jwt.sign(
  { id: 1, role, name: 'Admin User', email: 'admin@smartess.com' },
  process.env.JWT_SECRET,
  { expiresIn: '8h' }
);

test('analytics rejects a partial date range before querying data', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(
      `http://localhost:${port}/api/analytics?from=2026-08-01`,
      { headers: { Authorization: `Bearer ${createToken('ADMIN')}` } }
    );

    assert.equal(response.status, 400);
    const data = await response.json();
    assert.match(data.message, /both from and to dates/i);
  } finally {
    server.close();
  }
});

test('analytics rejects date ranges with an end date before the start date', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(
      `http://localhost:${port}/api/analytics?from=2026-08-31&to=2026-08-01`,
      { headers: { Authorization: `Bearer ${createToken('ADMIN')}` } }
    );

    assert.equal(response.status, 400);
    const data = await response.json();
    assert.match(data.message, /start date cannot be after the end date/i);
  } finally {
    server.close();
  }
});

test('analytics remains restricted to administrators', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(`http://localhost:${port}/api/analytics`, {
      headers: { Authorization: `Bearer ${createToken('MANAGER')}` },
    });

    assert.equal(response.status, 403);
  } finally {
    server.close();
  }
});

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiGet } from '../src/utils/api.js';

const createStorage = () => {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

beforeEach(() => {
  globalThis.localStorage = createStorage();
  globalThis.window = { location: { href: '' } };
});

test('apiGet sends the saved JWT token and parses JSON responses', async () => {
  localStorage.setItem('token', 'test-token');
  let request;

  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ employees: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const data = await apiGet('/employees');

  assert.deepEqual(data, { employees: [] });
  assert.equal(request.url, 'http://localhost:5000/api/employees');
  assert.equal(request.options.headers.Authorization, 'Bearer test-token');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
});

test('apiGet exposes a server error message', async () => {
  globalThis.fetch = async () => new Response(
    JSON.stringify({ message: 'Access denied' }),
    {
      status: 403,
      headers: { 'content-type': 'application/json' },
    }
  );

  await assert.rejects(apiGet('/analytics'), /Access denied/);
});

test('apiGet clears authentication state after an expired session', async () => {
  localStorage.setItem('token', 'expired-token');
  localStorage.setItem('role', 'ADMIN');
  localStorage.setItem('userName', 'Admin User');
  globalThis.fetch = async () => new Response(
    JSON.stringify({ message: 'Session expired' }),
    {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }
  );

  await assert.rejects(apiGet('/analytics'), /Session expired/);

  assert.equal(localStorage.getItem('token'), null);
  assert.equal(localStorage.getItem('role'), null);
  assert.equal(localStorage.getItem('userName'), null);
  assert.equal(window.location.href, '/login');
});

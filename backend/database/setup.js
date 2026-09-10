const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const root = __dirname;
const withSeed = process.argv.includes('--seed');

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    await connection.query(fs.readFileSync(path.join(root, 'schema.sql'), 'utf8'));
    if (withSeed) await connection.query(fs.readFileSync(path.join(root, 'seed.sql'), 'utf8'));
    console.log(`Database schema applied${withSeed ? ' with seed data' : ''}.`);
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error('Database setup failed:', error.message);
  process.exitCode = 1;
});

const { after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const db = require('../config/db');

const testDirectory = __dirname;

fs.readdirSync(testDirectory)
  .filter((file) => file.endsWith('.test.js') && file !== 'index.test.js')
  .sort()
  .forEach((file) => require(path.join(testDirectory, file)));

after(async () => {
  await db.close();
});

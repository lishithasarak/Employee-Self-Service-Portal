const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const validateProductionConfig = () => {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const required = [
    'JWT_SECRET',
    'FRONTEND_URL',
    'CORS_ORIGIN',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
  ];
  const missing = required.filter((key) => !String(process.env[key] || '').trim());

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }

};

validateProductionConfig();

app.listen(PORT, () => {
  console.log(`ESS backend running on http://localhost:${PORT}`);
});

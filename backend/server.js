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
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET',
  ];
  const missing = required.filter((key) => !String(process.env[key] || '').trim());

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }

  if (String(process.env.STORAGE_PROVIDER || '').toLowerCase() !== 's3') {
    throw new Error('STORAGE_PROVIDER must be set to s3 in production.');
  }
};

validateProductionConfig();

app.listen(PORT, () => {
  console.log(`ESS backend running on http://localhost:${PORT}`);
});

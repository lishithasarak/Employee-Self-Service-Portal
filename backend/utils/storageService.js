const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Configured = Boolean(
  process.env.AWS_REGION
  && process.env.AWS_ACCESS_KEY_ID
  && process.env.AWS_SECRET_ACCESS_KEY
  && process.env.AWS_S3_BUCKET
);
const requestedProvider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
const provider = requestedProvider === 's3' && s3Configured ? 's3' : 'local';
const bucket = process.env.AWS_S3_BUCKET;
const localRoot = path.join(__dirname, '..', 'uploads');
const s3 = provider === 's3' ? new S3Client({ region: process.env.AWS_REGION, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } }) : null;
const safeName = (name) => String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
const isS3Reference = (reference) => String(reference || '').startsWith('s3://');
const s3Key = (reference) => String(reference).slice(`s3://${bucket}/`.length);

const validateS3 = () => {
  if (!bucket || !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) throw Object.assign(new Error('S3 storage is not fully configured.'), { statusCode: 500 });
};

const save = async ({ folder, originalName, buffer, contentType }) => {
  const fileName = `${Date.now()}-${crypto.randomUUID()}-${safeName(originalName)}`;
  if (provider !== 's3') { const directory = path.join(localRoot, folder); await fs.mkdir(directory, { recursive: true }); await fs.writeFile(path.join(directory, fileName), buffer); return `/uploads/${folder}/${fileName}`; }
  validateS3(); const key = `${folder}/${fileName}`; await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType })); return `s3://${bucket}/${key}`;
};

const getDownloadUrl = async (reference) => {
  if (!isS3Reference(reference)) return reference;
  validateS3(); return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: s3Key(reference) }), { expiresIn: 300 });
};

const remove = async (reference) => {
  if (!reference) return;
  if (isS3Reference(reference)) { validateS3(); await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key(reference) })); return; }
  if (String(reference).startsWith('/uploads/')) await fs.unlink(path.join(__dirname, '..', reference)).catch((error) => { if (error.code !== 'ENOENT') throw error; });
};

module.exports = { save, getDownloadUrl, remove, isS3Reference };

const crypto = require('node:crypto');

const requestLogger = (req, res, next) => {
  const startedAt = Date.now();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    console.log(JSON.stringify({
      level: res.statusCode >= 500 ? 'error' : 'info', event: 'http_request',
      requestId, method: req.method, path: req.path, statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    }));
  });
  next();
};

module.exports = { requestLogger };

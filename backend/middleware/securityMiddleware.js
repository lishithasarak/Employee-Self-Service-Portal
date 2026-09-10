const rateLimitStore = new Map();

const getClientKey = (req) => {
  const forwardedIps = req.headers['x-forwarded-for'];

  if (typeof forwardedIps === 'string' && forwardedIps.trim()) {
    return forwardedIps.split(',')[0].trim();
  }

  return req.ip || 'unknown-client';
};

const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 60,
  message = 'Too many requests. Please try again later.',
} = {}) => {
  return (req, res, next) => {
    const key = getClientKey(req);
    const now = Date.now();
    const current = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > current.resetAt) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }

    current.count += 1;
    rateLimitStore.set(key, current);

    if (current.count > max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', '0');
      return res.status(429).json({ message });
    }

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - current.count)));
    next();
  };
};

const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.removeHeader('X-Powered-By');
  next();
};

module.exports = {
  createRateLimiter,
  securityHeaders,
};

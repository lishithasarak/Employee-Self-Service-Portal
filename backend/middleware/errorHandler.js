const errorHandler = (err, req, res, next) => {
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const message = statusCode >= 500 ? 'Internal server error.' : (err?.message || 'Request failed.');

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && statusCode < 500 ? { details: err?.message || undefined } : {}),
  });
};

module.exports = { errorHandler };

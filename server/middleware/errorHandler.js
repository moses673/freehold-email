/**
 * Error handling middleware for Express
 */

export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Default to 500 error
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err instanceof SyntaxError && err.status === 400) {
    status = 400;
    message = 'Invalid JSON';
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    status = 409;
    message = 'Constraint violation (possibly duplicate entry)';
  }

  res.status(status).json({
    error: message,
    status,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Not found middleware
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
}

export default {
  errorHandler,
  notFoundHandler,
};

/**
 * Central error handling.
 * - ApiError: a small helper so controllers can throw typed HTTP errors.
 * - notFound: 404 fallthrough for unmatched routes.
 * - errorHandler: the LAST middleware; converts thrown errors into JSON.
 *   Express 4 requires the 4-arg signature (err, req, res, next) to treat
 *   this as an error handler.
 */
export class ApiError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(err.details ? { details: err.details } : {}),
  });
}

/** Wrap an async controller so rejected promises reach errorHandler. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

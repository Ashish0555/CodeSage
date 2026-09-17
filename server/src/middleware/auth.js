import { verifyToken } from '../utils/token.js';
import { User } from '../models/User.js';
import { ApiError, asyncHandler } from './error.js';

/**
 * Auth middleware. Reads a Bearer token, verifies the JWT, loads the user,
 * and attaches it to req.user. Because JWTs are stateless, this does NOT hit
 * a session store — it only optionally loads the user record (useful for role
 * checks and up-to-date stats).
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Missing or malformed Authorization header');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'User no longer exists');

  req.user = user;
  next();
});

/** Gate a route to a specific role (e.g. admin-only KB ingestion). */
export const requireRole = (role) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      throw new ApiError(403, `Requires ${role} role`);
    }
    next();
  });

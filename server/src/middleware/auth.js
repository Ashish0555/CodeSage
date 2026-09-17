import { verifyToken } from '../utils/token.js';
import { prisma } from '../infrastructure/database/prisma.js';
import { ApiError, asyncHandler } from './error.js';

function toSafeUser(user) {
  return {
    ...user,
    id: user.id,
    _id: user.id,
    stats: user.stats ?? {},
  };
}

/**
 * Auth middleware. Reads a Bearer token, verifies the JWT, loads the user,
 * and attaches it to req.user.
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

  const user = await prisma.user.findUnique({ where: { id: String(payload.sub) } });
  if (!user) throw new ApiError(401, 'User no longer exists');

  req.user = toSafeUser(user);
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

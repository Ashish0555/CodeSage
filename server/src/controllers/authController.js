import bcrypt from 'bcryptjs';
import { prisma } from '../infrastructure/database/prisma.js';
import { signToken } from '../utils/token.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { validate, registerSchema, loginSchema } from '../utils/validation.js';

function toSafeUser(user) {
  return {
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    stats: user.stats ?? {},
  };
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = validate(registerSchema, req.body);

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new ApiError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'user', stats: { solved: 0, attempts: 0, byTopic: {}, byDifficulty: { easy: 0, medium: 0, hard: 0 } } },
  });

  const token = signToken(user.id);
  res.status(201).json({ token, user: toSafeUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = validate(loginSchema, req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken(user.id);
  res.json({ token, user: toSafeUser(user) });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: toSafeUser(req.user) });
});

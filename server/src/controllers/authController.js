import { User } from '../models/User.js';
import { signToken } from '../utils/token.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { validate, registerSchema, loginSchema } from '../utils/validation.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = validate(registerSchema, req.body);

  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'Email already registered');

  const user = new User({ name, email });
  await user.setPassword(password);
  await user.save();

  const token = signToken(user._id);
  res.status(201).json({ token, user: user.toSafeJSON() });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = validate(loginSchema, req.body);

  // passwordHash has select:false, so explicitly include it here.
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken(user._id);
  res.json({ token, user: user.toSafeJSON() });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

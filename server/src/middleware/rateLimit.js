import rateLimit from 'express-rate-limit';

/**
 * Rate limiters. The AI + execution routes are expensive (Gemini quota, code
 * execution), so they get a tighter budget than plain reads. Keyed by user id
 * when authenticated, else by IP.
 *
 * NOTE: express-rate-limit's default store is in-memory and per-process.
 * With multiple server instances you'd swap in a shared store (e.g. Redis)
 * so the limit is global — a good scaling talking point.
 */
const keyByUserOrIp = (req) => (req.user ? String(req.user.id || req.user._id) : req.ip);

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15, // protects the Gemini free-tier daily quota from a single user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: 'Too many AI requests — please slow down.' },
});

export const execLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: 'Too many code runs — please wait a moment.' },
});

import { Router } from 'express';
import { hint, review, ask } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();

// All AI routes: auth + AI-specific rate limit (protects the Gemini quota).
router.post('/hint', requireAuth, aiLimiter, hint);
router.post('/review/:submissionId', requireAuth, aiLimiter, review);
router.post('/ask', requireAuth, aiLimiter, ask);

export default router;

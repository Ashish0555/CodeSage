import { Router } from 'express';
import { start, message, finish, getSession } from '../controllers/interviewController.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/', requireAuth, aiLimiter, start);
router.post('/:id/message', requireAuth, aiLimiter, message);
router.post('/:id/finish', requireAuth, aiLimiter, finish);
router.get('/:id', requireAuth, getSession);

export default router;

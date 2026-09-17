import { Router } from 'express';
import * as authRoutes from './auth.routes.js';
import problemRoutes from './problem.routes.js';
import submissionRoutes from './submission.routes.js';
import aiRoutes from './ai.routes.js';
import interviewRoutes from './interview.routes.js';
import meRoutes from './me.routes.js';
import adminRoutes from './admin.routes.js';
import { aiAvailable } from '../services/aiService.js';

const router = Router();

// Lightweight health/status — handy for uptime checks and demos.
router.get('/health', (req, res) => res.json({ ok: true, ai: aiAvailable(), ts: Date.now() }));

router.use('/auth', authRoutes.default);
router.use('/problems', problemRoutes);
router.use('/', submissionRoutes); // /run, /submissions
router.use('/ai', aiRoutes);
router.use('/interviews', interviewRoutes);
router.use('/me', meRoutes);
router.use('/admin', adminRoutes);

export default router;

import { Router } from 'express';
import { runCode, submitCode, listSubmissions, getSubmission } from '../controllers/submissionController.js';
import { requireAuth } from '../middleware/auth.js';
import { execLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Code execution is expensive + involves untrusted code => auth + tighter limit.
router.post('/run', requireAuth, execLimiter, runCode);
router.post('/submissions', requireAuth, execLimiter, submitCode);
router.get('/submissions', requireAuth, listSubmissions);
router.get('/submissions/:id', requireAuth, getSubmission);

export default router;

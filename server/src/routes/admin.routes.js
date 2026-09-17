import { Router } from 'express';
import { ingest } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Admin-only knowledge-base ingestion for the RAG tutor.
router.post('/kb/ingest', requireAuth, requireRole('admin'), ingest);

export default router;

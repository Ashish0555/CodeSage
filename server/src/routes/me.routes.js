import { Router } from 'express';
import { myStats } from '../controllers/statsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/stats', requireAuth, myStats);

export default router;

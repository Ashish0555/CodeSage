import { Router } from 'express';
import { listProblems, getProblem } from '../controllers/problemController.js';

const router = Router();

// Public: browsing the problem catalog doesn't require auth.
router.get('/', listProblems);
router.get('/:slug', getProblem);

export default router;

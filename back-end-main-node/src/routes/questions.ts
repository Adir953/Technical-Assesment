import { Router } from 'express';
import * as questionController from '../controllers/questionController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth(), questionController.listQuestions);
router.get('/:id', requireAuth(), questionController.getQuestion);
router.post('/', requireAuth('admin'), questionController.createQuestion);
router.post('/:id/run', requireAuth(), questionController.runQuestion);

export default router;

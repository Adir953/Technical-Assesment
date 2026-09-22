import { Router } from 'express';
import * as assessmentController from '../controllers/assessmentController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth(), assessmentController.listAssessments);
router.get('/:id', requireAuth(), assessmentController.getAssessment);
router.post('/', requireAuth('admin'), assessmentController.createAssessment);

export default router;

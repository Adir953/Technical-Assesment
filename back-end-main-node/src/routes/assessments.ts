import { Router } from 'express';
import * as assessmentController from '../controllers/assessmentController';

const router = Router();

router.get('/', assessmentController.listAssessments);
router.get('/:id', assessmentController.getAssessment);
router.post('/', assessmentController.createAssessment);

export default router;

import { Router } from 'express';
import * as submissionController from '../controllers/submissionController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Los intentos son siempre del estudiante de la sesión.
router.use(requireAuth('student'));

router.get('/', submissionController.listSubmissions);
router.post('/', submissionController.startAssessment);
router.get('/:id', submissionController.getSubmission);
router.post('/:id/questions', submissionController.submitSolution);
router.post('/:id/complete', submissionController.completeAssessment);

export default router;

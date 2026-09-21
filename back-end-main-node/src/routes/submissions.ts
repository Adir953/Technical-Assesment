import { Router } from 'express';
import * as submissionController from '../controllers/submissionController';

const router = Router();

router.get('/', submissionController.listSubmissions);
router.post('/', submissionController.startAssessment);
router.get('/:id', submissionController.getSubmission);
router.post('/:id/questions', submissionController.submitSolution);
router.post('/:id/complete', submissionController.completeAssessment);

export default router;

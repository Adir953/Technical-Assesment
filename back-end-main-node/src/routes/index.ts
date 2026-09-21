import { Router } from 'express';
import assessmentRoutes from './assessments';
import questionRoutes from './questions';
import submissionRoutes from './submissions';

const router = Router();

router.use('/assessments', assessmentRoutes);
router.use('/questions', questionRoutes);
router.use('/submissions', submissionRoutes);

export default router;

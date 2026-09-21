import { Router } from 'express';
import * as questionController from '../controllers/questionController';

const router = Router();

router.get('/', questionController.listQuestions);
router.get('/:id', questionController.getQuestion);
router.post('/', questionController.createQuestion);
router.post('/:id/run', questionController.runQuestion);

export default router;

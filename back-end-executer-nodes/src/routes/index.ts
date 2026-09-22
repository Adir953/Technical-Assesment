import { Router } from 'express';
import * as runController from '../controllers/runController';

const router = Router();

router.post('/run', runController.run);

export default router;

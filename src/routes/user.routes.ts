import { Router, IRouter } from 'express';
import { authenticate } from '../middleware/auth';
import { getMe, getRiskScore } from '../controllers/user.controller';

const router: IRouter = Router();
router.use(authenticate);
router.get('/me', getMe);
router.get('/me/risk-score', getRiskScore);
export default router;

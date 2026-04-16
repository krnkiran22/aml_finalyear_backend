import { Router, IRouter } from 'express';
import { authenticate } from '../middleware/auth';
import { submitIncome } from '../controllers/onboarding.controller';

const router: IRouter = Router();
router.use(authenticate);
router.post('/income', submitIncome);
export default router;

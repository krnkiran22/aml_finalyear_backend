import { Router, IRouter } from 'express';
import { authenticate } from '../middleware/auth';
import { getAlerts, resolveAlert } from '../controllers/alert.controller';

const router: IRouter = Router();
router.use(authenticate);
router.get('/', getAlerts);
router.patch('/:id/resolve', resolveAlert);
export default router;

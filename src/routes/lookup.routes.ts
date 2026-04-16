import { Router, IRouter } from 'express';
import { authenticate } from '../middleware/auth';
import { lookupWallet } from '../controllers/lookup.controller';

const router: IRouter = Router();
router.use(authenticate);
router.get('/:walletAddress', lookupWallet);
export default router;

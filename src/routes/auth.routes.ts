import { Router, IRouter } from 'express';
import { connectWallet } from '../controllers/auth.controller';

const router: IRouter = Router();
router.post('/connect-wallet', connectWallet);
export default router;

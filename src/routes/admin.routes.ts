import { Router, IRouter } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getStats,
  getUsers,
  getUserById,
  reviewKYC,
  getTransactions,
} from '../controllers/admin.controller';

const router: IRouter = Router();
router.use(authenticate, requireAdmin);
router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/kyc/:userId/review', reviewKYC);
router.get('/transactions', getTransactions);
export default router;

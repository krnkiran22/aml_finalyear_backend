import { Router, IRouter } from 'express';
import authRoutes from './auth.routes';
import kycRoutes from './kyc.routes';
import onboardingRoutes from './onboarding.routes';
import userRoutes from './user.routes';
import transactionRoutes from './transaction.routes';
import alertRoutes from './alert.routes';
import adminRoutes from './admin.routes';
import lookupRoutes from './lookup.routes';

const router: IRouter = Router();

router.use('/auth', authRoutes);
router.use('/kyc', kycRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/user', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/alerts', alertRoutes);
router.use('/admin', adminRoutes);
router.use('/lookup', lookupRoutes);

export default router;

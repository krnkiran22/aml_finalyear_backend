import { Router, IRouter } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';
import { uploadDocument, verifyDocument, getKYCStatus } from '../controllers/kyc.controller';

const router: IRouter = Router();
router.use(authenticate);
router.post('/upload', uploadMiddleware.single('file'), uploadDocument);
router.post('/verify', verifyDocument);
router.get('/status', getKYCStatus);
export default router;

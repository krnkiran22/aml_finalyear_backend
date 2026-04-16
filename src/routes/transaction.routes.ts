import { Router, IRouter } from 'express';
import { authenticate } from '../middleware/auth';
import { analyze, confirm, listTransactions } from '../controllers/transaction.controller';

const router: IRouter = Router();
router.use(authenticate);
router.post('/analyze', analyze);
router.patch('/:id/confirm', confirm);
router.get('/', listTransactions);
export default router;

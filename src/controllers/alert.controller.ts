import { Request, Response, NextFunction } from 'express';
import { alertRepository } from '../repositories/alert.repository';
import { AppError } from '../middleware/error';

export async function getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const [alerts, unreadCount] = await Promise.all([
      alertRepository.findByUserId(userId),
      alertRepository.countUnread(userId),
    ]);

    res.json({ alerts, unreadCount });
  } catch (err) {
    next(err);
  }
}

export async function resolveAlert(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const id = req.params['id'] as string;

    const alert = await alertRepository.findById(id);
    if (!alert) throw new AppError(404, 'Alert not found');
    if (alert.userId !== userId) throw new AppError(403, 'Access denied');

    await alertRepository.resolve(id, userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

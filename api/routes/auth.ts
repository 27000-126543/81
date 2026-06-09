import { Router, type Request, type Response } from 'express';
import { validateBody, loginSchema } from '../middleware/validator.js';
import { authService } from '../services/authService.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post(
  '/login',
  validateBody(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    const result = await authService.login(req.body);
    res.status(result.code === 200 ? 200 : result.code === 401 ? 401 : 400).json(result);
  },
);

router.post(
  '/logout',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await authService.logout();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.post(
  '/verify',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    res.status(200).json({
      code: 200,
      message: 'Token有效',
      data: {
        user: req.user,
      },
      timestamp: Date.now(),
    });
  },
);

export default router;

import { Router, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { requireRoles } from '../middleware/permission.js';
import { validateQuery, validateParams, validateBody, paginationSchema, idSchema } from '../middleware/validator.js';
import { returnService } from '../services/returnService.js';
import type { UserRole, ReturnLiability } from '../../shared/types.js';

const router = Router();

const viewRoles: UserRole[] = ['admin', 'operation_director', 'customs_officer', 'warehouse_manager', 'consumer'];
const editRoles: UserRole[] = ['admin', 'operation_director', 'warehouse_manager', 'consumer'];
const processRoles: UserRole[] = ['admin', 'operation_director', 'warehouse_manager'];

const returnQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  userId: z.coerce.number().int().min(1).optional(),
});

const returnCreateSchema = z.object({
  orderId: z.number().int().min(1),
  productId: z.number().int().min(1),
  quantity: z.number().int().min(1),
  reason: z.string().min(1),
});

const liabilitySchema = z.object({
  liability: z.enum(['customer', 'logistics', 'quality']),
});

const returnStatusSchema = z.object({
  status: z.string(),
});

router.get(
  '/',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(returnQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, status, userId } = req.query as any;
    const effectiveUserId = req.user?.role === 'consumer' ? req.user.id : userId;
    const result = returnService.getReturns(page, pageSize, status, effectiveUserId);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/:id',
  authMiddleware,
  requireRoles(...viewRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = returnService.getReturnById(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/',
  authMiddleware,
  requireRoles(...editRoles),
  validateBody(returnCreateSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = returnService.createReturn(req.body);
    res.status(result.code === 201 ? 201 : 400).json(result);
  },
);

router.post(
  '/:id/liability',
  authMiddleware,
  requireRoles(...processRoles),
  validateParams(idSchema),
  validateBody(liabilitySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { liability } = req.body;
    const result = returnService.determineLiability(id, liability as ReturnLiability);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/:id/refund',
  authMiddleware,
  requireRoles(...processRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = returnService.processRefund(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/:id/exchange',
  authMiddleware,
  requireRoles(...processRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = returnService.processExchange(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/:id/scrap',
  authMiddleware,
  requireRoles(...processRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = returnService.processScrap(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.put(
  '/:id/status',
  authMiddleware,
  requireRoles(...processRoles),
  validateParams(idSchema),
  validateBody(returnStatusSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { status } = req.body;
    const result = returnService.updateReturnStatus(id, status);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.put(
  '/:id/liability',
  authMiddleware,
  requireRoles(...processRoles),
  validateParams(idSchema),
  validateBody(liabilitySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { liability } = req.body;
    const result = returnService.determineLiability(id, liability as ReturnLiability);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

export default router;

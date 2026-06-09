import { Router, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { requireRoles } from '../middleware/permission.js';
import { validateQuery, validateParams, validateBody, paginationSchema, idSchema } from '../middleware/validator.js';
import { orderService } from '../services/orderService.js';
import type { UserRole } from '../../shared/types.js';

const router = Router();

const viewRoles: UserRole[] = ['admin', 'operation_director', 'customs_officer', 'warehouse_manager', 'consumer'];
const editRoles: UserRole[] = ['admin', 'operation_director', 'warehouse_manager'];

const orderQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  userId: z.coerce.number().int().min(1).optional(),
});

const fulfillmentSchema = z.object({
  warehouseId: z.number().int().min(1),
});

const orderStatusSchema = z.object({
  status: z.string(),
});

router.get(
  '/',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(orderQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, status, userId } = req.query as any;
    const effectiveUserId = req.user?.role === 'consumer' ? req.user.id : userId;
    const result = orderService.getOrderList(page, pageSize, status, effectiveUserId);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/my-orders',
  authMiddleware,
  requireRoles('consumer'),
  validateQuery(orderQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, status } = req.query as any;
    const userId = req.user!.id;
    const result = orderService.getOrderList(page, pageSize, status, userId);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/:id/fulfillment-recommendation',
  authMiddleware,
  requireRoles('admin', 'operation_director', 'warehouse_manager'),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = orderService.getFulfillmentRecommendation(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/:id/assign-warehouse',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(fulfillmentSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { warehouseId } = req.body;
    const result = orderService.confirmFulfillment(id, warehouseId);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/:id/confirm-fulfillment',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(fulfillmentSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { warehouseId } = req.body;
    const result = orderService.confirmFulfillment(id, warehouseId);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.get(
  '/:id/customs-documents',
  authMiddleware,
  requireRoles('admin', 'operation_director', 'customs_officer'),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = orderService.generateCustomsDocuments(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.put(
  '/:id/status',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(orderStatusSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { status } = req.body;
    const result = orderService.updateOrderStatus(id, status);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.get(
  '/:id',
  authMiddleware,
  requireRoles(...viewRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = orderService.getOrderById(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

export default router;

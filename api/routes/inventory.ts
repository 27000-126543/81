import { Router, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { requireRoles, requireWarehouseAccess } from '../middleware/permission.js';
import { validateQuery, validateParams, validateBody, paginationSchema, idSchema } from '../middleware/validator.js';
import { inventoryService } from '../services/inventoryService.js';
import type { UserRole } from '../../shared/types.js';

const router = Router();

const viewRoles: UserRole[] = ['admin', 'operation_director', 'customs_officer', 'warehouse_manager'];
const editRoles: UserRole[] = ['admin', 'operation_director', 'warehouse_manager'];

const inventoryQuerySchema = paginationSchema.extend({
  warehouseId: z.coerce.number().int().min(1).optional(),
  productId: z.coerce.number().int().min(1).optional(),
});

const transferOrderQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
});

const transferOrderCreateSchema = z.object({
  sourceWarehouseId: z.number().int().min(1),
  targetWarehouseId: z.number().int().min(1),
  transportMode: z.enum(['sea', 'air', 'rail']),
  items: z.array(z.object({
    productId: z.number().int().min(1),
    quantity: z.number().int().min(1),
  })).min(1),
});

const transferOrderStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'escalated']),
  approverId: z.number().int().min(1),
});

const approverSchema = z.object({
  approverId: z.number().int().min(1).optional(),
});

const rejectSchema = z.object({
  reason: z.string().optional(),
});

router.get(
  '/',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(inventoryQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, warehouseId, productId } = req.query as any;
    const result = inventoryService.getInventoryList(page, pageSize, warehouseId, productId);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/alerts',
  authMiddleware,
  requireRoles(...viewRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { type, severity } = req.query as any;
    const result = inventoryService.getInventoryAlerts(type, severity);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/transfer-suggestions',
  authMiddleware,
  requireRoles(...viewRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = inventoryService.getTransferSuggestions();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/transfers',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(transferOrderQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, status } = req.query as any;
    const result = inventoryService.getTransferOrders(page, pageSize, status);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.post(
  '/transfers',
  authMiddleware,
  requireRoles(...editRoles),
  requireWarehouseAccess,
  validateBody(transferOrderCreateSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = inventoryService.createTransferOrder(req.body);
    res.status(result.code === 201 ? 201 : 400).json(result);
  },
);

router.get(
  '/transfers/:id',
  authMiddleware,
  requireRoles(...viewRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = inventoryService.getTransferOrderById(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.put(
  '/transfers/:id/approve',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(approverSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const approverId = req.body.approverId || req.user!.id;
    const result = inventoryService.updateTransferOrderStatus(id, 'approved', approverId);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.put(
  '/transfers/:id/reject',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(rejectSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const approverId = req.user!.id;
    const result = inventoryService.updateTransferOrderStatus(id, 'rejected', approverId);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/transfers/:id/execute',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = inventoryService.executeTransfer(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.get(
  '/transfer-orders',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(transferOrderQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, status } = req.query as any;
    const result = inventoryService.getTransferOrders(page, pageSize, status);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.post(
  '/transfer-orders',
  authMiddleware,
  requireRoles(...editRoles),
  requireWarehouseAccess,
  validateBody(transferOrderCreateSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = inventoryService.createTransferOrder(req.body);
    res.status(result.code === 201 ? 201 : 400).json(result);
  },
);

router.put(
  '/transfer-orders/:id/status',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(transferOrderStatusSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { status, approverId } = req.body;
    const result = inventoryService.updateTransferOrderStatus(id, status, approverId);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/transfer-orders/:id/execute',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = inventoryService.executeTransfer(id);
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
    const result = inventoryService.getInventoryById(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

export default router;

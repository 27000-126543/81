import { Router, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { requireRoles } from '../middleware/permission.js';
import { validateQuery, validateParams, validateBody, paginationSchema, idSchema } from '../middleware/validator.js';
import { logisticsService } from '../services/logisticsService.js';
import type { UserRole } from '../../shared/types.js';

const router = Router();

const viewRoles: UserRole[] = ['admin', 'operation_director', 'customs_officer', 'warehouse_manager', 'consumer'];
const editRoles: UserRole[] = ['admin', 'operation_director', 'customs_officer', 'warehouse_manager'];

const trackingQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  transportMode: z.string().optional(),
  orderId: z.coerce.number().int().min(1).optional(),
});

const exceptionQuerySchema = paginationSchema.extend({
  type: z.string().optional(),
  status: z.string().optional(),
});

const compensationQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
});

const exceptionCreateSchema = z.object({
  logisticsTrackingId: z.number().int().min(1),
  type: z.enum(['delay', 'damage', 'lost']),
  description: z.string().min(1),
});

const exceptionStatusSchema = z.object({
  status: z.string(),
});

const compensationApproveSchema = z.object({
  approverId: z.number().int().min(1),
});

const compensationCreateSchema = z.object({
  policyNo: z.string().optional(),
  compensationType: z.string().optional(),
  breakdown: z.array(z.object({
    item: z.string(),
    amount: z.number(),
    description: z.string(),
  })).optional(),
});

router.get(
  '/trackings',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(trackingQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, status, transportMode, orderId } = req.query as any;
    if (orderId) {
      const result = logisticsService.getTrackingByOrderId(orderId);
      res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
      return;
    }
    const result = logisticsService.getTrackings(page, pageSize, status, transportMode);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/trackings/:id',
  authMiddleware,
  requireRoles(...viewRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = logisticsService.getTrackingById(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.get(
  '/exceptions',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(exceptionQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, type, status } = req.query as any;
    const result = logisticsService.getExceptions(page, pageSize, type, status);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/exceptions/:id',
  authMiddleware,
  requireRoles(...viewRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = logisticsService.getExceptionById(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/exceptions',
  authMiddleware,
  requireRoles(...editRoles),
  validateBody(exceptionCreateSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = logisticsService.createException(req.body);
    res.status(result.code === 201 ? 201 : 400).json(result);
  },
);

router.put(
  '/exceptions/:id/status',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(exceptionStatusSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { status } = req.body;
    const result = logisticsService.updateExceptionStatus(id, status);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.get(
  '/exceptions/:id/compensation',
  authMiddleware,
  requireRoles(...viewRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = logisticsService.calculateCompensation(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/exceptions/:id/compensation',
  authMiddleware,
  requireRoles('admin', 'operation_director'),
  validateParams(idSchema),
  validateBody(compensationApproveSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { approverId } = req.body;
    const result = logisticsService.createCompensation(id, approverId);
    res.status(result.code === 201 ? 201 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.get(
  '/compensations',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(compensationQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, status } = req.query as any;
    const result = logisticsService.getCompensations(page, pageSize, status);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.post(
  '/compensations/:id/approve',
  authMiddleware,
  requireRoles('admin', 'operation_director'),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const approverId = req.user!.id;
    const result = logisticsService.approveCompensation(id, approverId);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.put(
  '/exceptions/:id/compensation',
  authMiddleware,
  requireRoles('admin', 'operation_director'),
  validateParams(idSchema),
  validateBody(compensationCreateSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const approverId = req.user!.id;
    const result = logisticsService.createCompensation(id, approverId, req.body);
    res.status(result.code === 201 ? 201 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.put(
  '/compensations/:id/approve',
  authMiddleware,
  requireRoles('admin', 'operation_director'),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const approverId = req.user!.id;
    const result = logisticsService.approveCompensation(id, approverId);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

export default router;

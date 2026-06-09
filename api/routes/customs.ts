import { Router, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { requireRoles } from '../middleware/permission.js';
import { validateQuery, validateParams, validateBody, paginationSchema, idSchema } from '../middleware/validator.js';
import { customsService } from '../services/customsService.js';
import type { UserRole } from '../../shared/types.js';

const router = Router();

const viewRoles: UserRole[] = ['admin', 'operation_director', 'customs_officer', 'warehouse_manager'];
const editRoles: UserRole[] = ['admin', 'operation_director', 'customs_officer'];

const declarationQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  port: z.string().optional(),
});

const workOrderQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  priority: z.string().optional(),
});

const workOrderCreateSchema = z.object({
  customsDeclarationId: z.number().int().min(1),
  type: z.enum(['inspection', 'detention', 'tax_dispute']),
  priority: z.enum(['normal', 'high', 'urgent']),
  description: z.string().min(1),
});

const workOrderApproveSchema = z.object({
  level: z.enum(['1', '2']),
  comment: z.string().min(1),
});

const declarationStatusSchema = z.object({
  status: z.enum(['pending', 'declared', 'inspecting', 'detained', 'cleared', 'rejected']),
});

router.get(
  '/declarations',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(declarationQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, status, port } = req.query as any;
    const result = customsService.getDeclarations(page, pageSize, status, port);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/declarations/:id',
  authMiddleware,
  requireRoles(...viewRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = customsService.getDeclarationById(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.get(
  '/declarations/:id/trajectory',
  authMiddleware,
  requireRoles(...viewRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = customsService.getDeclarationTrajectory(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.put(
  '/declarations/:id/status',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(declarationStatusSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { status } = req.body;
    const result = customsService.updateDeclarationStatus(id, status);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.get(
  '/work-orders',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(workOrderQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, status, priority } = req.query as any;
    const result = customsService.getWorkOrders(page, pageSize, status, priority);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/work-orders/:id',
  authMiddleware,
  requireRoles(...viewRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = customsService.getWorkOrderById(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/work-orders',
  authMiddleware,
  requireRoles(...editRoles),
  validateBody(workOrderCreateSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = customsService.createWorkOrder(req.body);
    res.status(result.code === 201 ? 201 : 400).json(result);
  },
);

router.post(
  '/work-orders/:id/approve',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(workOrderApproveSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { level, comment } = req.body;
    const approverId = req.user!.id;
    const result = customsService.approveWorkOrder(id, parseInt(level), approverId, comment);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/work-orders/:id/reject',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(workOrderApproveSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { level, comment } = req.body;
    const approverId = req.user!.id;
    const result = customsService.rejectWorkOrder(id, parseInt(level), approverId, comment);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/work-orders/:id/escalate',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = customsService.escalateWorkOrder(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.put(
  '/work-orders/:id/approve',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(workOrderApproveSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { level, comment } = req.body;
    const approverId = req.user!.id;
    const result = customsService.approveWorkOrder(id, parseInt(level), approverId, comment);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.put(
  '/work-orders/:id/reject',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(workOrderApproveSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { level, comment } = req.body;
    const approverId = req.user!.id;
    const result = customsService.rejectWorkOrder(id, parseInt(level), approverId, comment);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.put(
  '/work-orders/:id/escalate',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = customsService.escalateWorkOrder(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

export default router;

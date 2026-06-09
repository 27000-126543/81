import { Router, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { requireRoles } from '../middleware/permission.js';
import { validateQuery, validateParams, validateBody, paginationSchema, idSchema } from '../middleware/validator.js';
import { systemService } from '../services/systemService.js';
import type { UserRole } from '../../shared/types.js';

const router = Router();

const viewRoles: UserRole[] = ['admin'];
const editRoles: UserRole[] = ['admin'];

const userQuerySchema = paginationSchema.extend({
  role: z.string().optional(),
});

const userCreateSchema = z.object({
  username: z.string().min(1),
  realName: z.string().min(1),
  role: z.enum(['consumer', 'warehouse_manager', 'customs_officer', 'operation_director', 'admin']),
  warehouseId: z.number().int().min(1).optional(),
});

const userUpdateSchema = z.object({
  realName: z.string().min(1).optional(),
  role: z.enum(['consumer', 'warehouse_manager', 'customs_officer', 'operation_director', 'admin']).optional(),
  warehouseId: z.number().int().min(1).optional(),
});

const ruleUpdateSchema = z.object({
  ruleValue: z.string().min(1),
  description: z.string().min(1),
});

const approvalFlowUpdateSchema = z.object({
  thresholdAmount: z.number().min(0).optional(),
  level1Role: z.enum(['consumer', 'warehouse_manager', 'customs_officer', 'operation_director', 'admin']).optional(),
  level2Role: z.enum(['consumer', 'warehouse_manager', 'customs_officer', 'operation_director', 'admin']).optional(),
  escalationHours: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

router.get(
  '/users',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(userQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, role } = req.query as any;
    const result = systemService.getUsers(page, pageSize, role);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/users/:id',
  authMiddleware,
  requireRoles(...viewRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = systemService.getUserById(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.post(
  '/users',
  authMiddleware,
  requireRoles(...editRoles),
  validateBody(userCreateSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = systemService.createUser(req.body);
    res.status(result.code === 201 ? 201 : 400).json(result);
  },
);

router.put(
  '/users/:id',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(userUpdateSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = systemService.updateUser(id, req.body);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.delete(
  '/users/:id',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = systemService.deleteUser(id);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.get(
  '/rules',
  authMiddleware,
  requireRoles(...viewRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = systemService.getSystemRules();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.put(
  '/rules/:id',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(ruleUpdateSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const { ruleValue, description } = req.body;
    const result = systemService.updateSystemRule(id, ruleValue, description);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.get(
  '/approval-flows',
  authMiddleware,
  requireRoles(...viewRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = systemService.getApprovalFlows();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.put(
  '/approval-flows/:id',
  authMiddleware,
  requireRoles(...editRoles),
  validateParams(idSchema),
  validateBody(approvalFlowUpdateSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as any;
    const result = systemService.updateApprovalFlow(id, req.body);
    res.status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400).json(result);
  },
);

router.get(
  '/warehouses',
  authMiddleware,
  requireRoles('admin', 'operation_director', 'warehouse_manager'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = systemService.getWarehouses();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

export default router;

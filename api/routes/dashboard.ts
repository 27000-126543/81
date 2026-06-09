import { Router, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { requireRoles } from '../middleware/permission.js';
import { dashboardService } from '../services/dashboardService.js';
import { inventoryService } from '../services/inventoryService.js';
import type { UserRole } from '../../shared/types.js';

const router = Router();

const dashboardRoles: UserRole[] = ['admin', 'operation_director', 'customs_officer', 'warehouse_manager'];

router.get(
  '/realtime',
  authMiddleware,
  requireRoles(...dashboardRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = dashboardService.getRealtimeData();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/kpi',
  authMiddleware,
  requireRoles(...dashboardRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = dashboardService.getKPI();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/turnover',
  authMiddleware,
  requireRoles(...dashboardRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = dashboardService.getWarehouseTurnover();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/clearance-time',
  authMiddleware,
  requireRoles(...dashboardRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = dashboardService.getPortClearanceTime();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/sales-trend',
  authMiddleware,
  requireRoles(...dashboardRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = dashboardService.getSalesTrend();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/exception-map',
  authMiddleware,
  requireRoles(...dashboardRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = dashboardService.getLogisticsExceptionMap();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/warehouse-turnover',
  authMiddleware,
  requireRoles(...dashboardRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = dashboardService.getWarehouseTurnover();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/port-clearance',
  authMiddleware,
  requireRoles(...dashboardRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = dashboardService.getPortClearanceTime();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/logistics-exceptions',
  authMiddleware,
  requireRoles(...dashboardRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = dashboardService.getLogisticsExceptionMap();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/inventory-alerts',
  authMiddleware,
  requireRoles(...dashboardRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = inventoryService.getInventoryAlerts();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/all',
  authMiddleware,
  requireRoles(...dashboardRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const kpiResult = dashboardService.getKPI();
    const turnoverResult = dashboardService.getWarehouseTurnover();
    const clearanceResult = dashboardService.getPortClearanceTime();
    const salesResult = dashboardService.getSalesTrend();
    const exceptionsResult = dashboardService.getLogisticsExceptionMap();
    const alertsResult = inventoryService.getInventoryAlerts();

    const result = {
      code: 200,
      message: '获取所有大屏数据成功',
      data: {
        kpi: kpiResult.data,
        warehouseTurnover: turnoverResult.data,
        portClearance: clearanceResult.data,
        salesTrend: salesResult.data,
        logisticsExceptions: exceptionsResult.data,
        inventoryAlerts: alertsResult.data,
      },
      timestamp: Date.now(),
    };

    res.status(200).json(result);
  },
);

export default router;

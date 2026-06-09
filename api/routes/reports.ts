import { Router, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { requireRoles } from '../middleware/permission.js';
import { validateQuery, validateParams } from '../middleware/validator.js';
import { reportService } from '../services/reportService.js';
import type { UserRole } from '../../shared/types.js';

const router = Router();

const viewRoles: UserRole[] = ['admin', 'operation_director', 'customs_officer', 'warehouse_manager'];
const exportRoles: UserRole[] = ['admin', 'operation_director'];

const metricsQuerySchema = z.object({
  period: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
});

const reportQuerySchema = z.object({
  period: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
  warehouseId: z.coerce.number().int().min(1).optional(),
  category: z.string().optional(),
  port: z.string().optional(),
  carrier: z.string().optional(),
  format: z.enum(['xlsx', 'pdf']).optional(),
});

const exportTypeSchema = z.object({
  type: z.enum(['supply-chain', 'inventory', 'orders', 'customs', 'logistics']),
});

function parseDateRange(params: any): { startDate: string; endDate: string } {
  if (params.period && typeof params.period === 'string') {
    const periodMatch = params.period.match(/(\d{4})[-_]?(\d{2})/);
    if (periodMatch) {
      const year = periodMatch[1];
      const month = periodMatch[2];
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      return {
        startDate: `${year}-${month}-01`,
        endDate: `${year}-${month}-${lastDay}`,
      };
    }
  }
  if (params.year && params.month) {
    const year = String(params.year);
    const month = String(params.month).padStart(2, '0');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    return {
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-${lastDay}`,
    };
  }
  const today = new Date().toISOString().split('T')[0];
  return {
    startDate: params.startDate || '2024-01-01',
    endDate: params.endDate || today,
  };
}

router.get(
  '/supply-chain',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(metricsQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { startDate, endDate } = parseDateRange(req.query);
    const result = reportService.getSupplyChainMetrics(startDate, endDate);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/supply-chain-metrics',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(metricsQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { startDate, endDate } = parseDateRange(req.query);
    const result = reportService.getSupplyChainMetrics(startDate, endDate);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/inventory',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(reportQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { warehouseId, category } = req.query as any;
    const result = reportService.getInventoryReport(warehouseId, category);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/orders',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(reportQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { period, warehouseId } = req.query as any;
    const result = reportService.getOrderReport(period, warehouseId);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/customs',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(reportQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { period, port } = req.query as any;
    const result = reportService.getCustomsReport(period, port);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/logistics',
  authMiddleware,
  requireRoles(...viewRoles),
  validateQuery(reportQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { period, carrier } = req.query as any;
    const result = reportService.getLogisticsReport(period, carrier);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/supply-chain/export',
  authMiddleware,
  requireRoles(...exportRoles),
  validateQuery(metricsQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { startDate, endDate } = req.query as any;
    const result = reportService.exportSupplyChainReport(startDate, endDate);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/inventory/export',
  authMiddleware,
  requireRoles(...exportRoles),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = reportService.exportInventoryReport();
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/orders/export',
  authMiddleware,
  requireRoles(...exportRoles),
  validateQuery(metricsQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { startDate, endDate } = req.query as any;
    const result = reportService.exportOrdersReport(startDate, endDate);
    res.status(result.code === 200 ? 200 : 400).json(result);
  },
);

router.get(
  '/export/:type',
  authMiddleware,
  requireRoles(...exportRoles),
  validateParams(exportTypeSchema),
  validateQuery(reportQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { type } = req.params as any;
      const { format = 'xlsx' } = req.query as any;
      
      const result = await reportService.exportReport(type, format, req.query);
      
      if (!result) {
        res.setHeader('Content-Type', 'application/json');
        res.status(400).json({
          code: 400,
          message: '不支持的报表类型或生成失败',
          data: null,
          timestamp: Date.now(),
        });
        return;
      }

      const { buffer, filename, mimeType } = result;

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      
      res.status(200).send(buffer);
    } catch (error) {
      console.error('Export route error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        code: 500,
        message: '服务器错误，导出失败',
        data: null,
        timestamp: Date.now(),
      });
    }
  },
);

router.get(
  '/download/:filename',
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { filename } = req.params;
    const filepath = `/tmp/${filename}`;
    res.download(filepath, filename, (err) => {
      if (err) {
        res.status(404).json({
          code: 404,
          message: '文件不存在',
          data: null,
          timestamp: Date.now(),
        });
      }
    });
  },
);

export default router;

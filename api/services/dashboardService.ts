import { db } from '../db/database.js';
import type {
  ApiResponse, DashboardKPI, WarehouseTurnover, PortClearanceTime, SalesTrendItem, LogisticsExceptionPoint,
} from '../../shared/types.js';

class DashboardService {
  getRealtimeData(): ApiResponse<{
    kpi: DashboardKPI;
    turnover: WarehouseTurnover[];
    clearanceTime: PortClearanceTime[];
    salesTrend: SalesTrendItem[];
    exceptionMap: LogisticsExceptionPoint[];
  }> {
    const kpi = db.getDashboardKPI();
    const turnover = db.getWarehouseTurnover();
    const clearanceTime = db.getPortClearanceTime();
    const salesTrend = db.getSalesTrend();
    const exceptionMap = db.getLogisticsExceptionMap();

    return {
      code: 200,
      message: '获取实时数据成功',
      data: {
        kpi,
        turnover,
        clearanceTime,
        salesTrend,
        exceptionMap,
      },
      timestamp: Date.now(),
    };
  }

  getKPI(): ApiResponse<DashboardKPI> {
    return {
      code: 200,
      message: '获取KPI数据成功',
      data: db.getDashboardKPI(),
      timestamp: Date.now(),
    };
  }

  getWarehouseTurnover(): ApiResponse<WarehouseTurnover[]> {
    return {
      code: 200,
      message: '获取周转率数据成功',
      data: db.getWarehouseTurnover(),
      timestamp: Date.now(),
    };
  }

  getPortClearanceTime(): ApiResponse<PortClearanceTime[]> {
    return {
      code: 200,
      message: '获取通关时效数据成功',
      data: db.getPortClearanceTime(),
      timestamp: Date.now(),
    };
  }

  getSalesTrend(): ApiResponse<SalesTrendItem[]> {
    return {
      code: 200,
      message: '获取销售趋势数据成功',
      data: db.getSalesTrend(),
      timestamp: Date.now(),
    };
  }

  getLogisticsExceptionMap(): ApiResponse<LogisticsExceptionPoint[]> {
    return {
      code: 200,
      message: '获取异常分布数据成功',
      data: db.getLogisticsExceptionMap(),
      timestamp: Date.now(),
    };
  }
}

export const dashboardService = new DashboardService();

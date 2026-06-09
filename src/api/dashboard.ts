import { get } from './index';
import type {
  DashboardKPI,
  WarehouseTurnover,
  PortClearanceTime,
  SalesTrendItem,
  LogisticsExceptionPoint,
  InventoryAlert,
} from '../types';

export const getDashboardKPI = async (): Promise<DashboardKPI> => {
  const response = await get<DashboardKPI>('/dashboard/kpi');
  return response.data;
};

export const getWarehouseTurnover = async (): Promise<WarehouseTurnover[]> => {
  const response = await get<WarehouseTurnover[]>('/dashboard/warehouse-turnover');
  return response.data;
};

export const getPortClearanceTime = async (): Promise<PortClearanceTime[]> => {
  const response = await get<PortClearanceTime[]>('/dashboard/port-clearance');
  return response.data;
};

export const getSalesTrend = async (days?: number): Promise<SalesTrendItem[]> => {
  const response = await get<SalesTrendItem[]>('/dashboard/sales-trend', { days });
  return response.data;
};

export const getLogisticsExceptions = async (): Promise<LogisticsExceptionPoint[]> => {
  const response = await get<LogisticsExceptionPoint[]>('/dashboard/logistics-exceptions');
  return response.data;
};

export const getInventoryAlerts = async (): Promise<InventoryAlert[]> => {
  const response = await get<InventoryAlert[]>('/dashboard/inventory-alerts');
  return response.data;
};

export const getAllDashboardData = async (): Promise<{
  kpi: DashboardKPI;
  warehouseTurnover: WarehouseTurnover[];
  portClearance: PortClearanceTime[];
  salesTrend: SalesTrendItem[];
  logisticsExceptions: LogisticsExceptionPoint[];
  inventoryAlerts: InventoryAlert[];
}> => {
  const response = await get<{
    kpi: DashboardKPI;
    warehouseTurnover: WarehouseTurnover[];
    portClearance: PortClearanceTime[];
    salesTrend: SalesTrendItem[];
    logisticsExceptions: LogisticsExceptionPoint[];
    inventoryAlerts: InventoryAlert[];
  }>('/dashboard/all');
  return response.data;
};

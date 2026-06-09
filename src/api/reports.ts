import { get } from './index';
import api from './index';
import type { SupplyChainMetrics } from '../types';

export const getSupplyChainMetrics = async (
  params?: { period?: string; startDate?: string; endDate?: string }
): Promise<SupplyChainMetrics[]> => {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const queryParams = {
    startDate: params?.startDate || thirtyDaysAgo,
    endDate: params?.endDate || today,
  };
  
  const response = await get<SupplyChainMetrics[]>('/reports/supply-chain-metrics', queryParams);
  return response.data;
};

export const getInventoryReport = async (
  params?: { warehouseId?: number; category?: string }
): Promise<Array<{
  productId: number;
  sku: string;
  productName: string;
  warehouseName: string;
  quantity: number;
  value: number;
  turnoverRate: number;
}>> => {
  const response = await get<Array<{
    productId: number;
    sku: string;
    productName: string;
    warehouseName: string;
    quantity: number;
    value: number;
    turnoverRate: number;
  }>>('/reports/inventory', params);
  return response.data;
};

export const getOrderReport = async (
  params?: { period?: string; warehouseId?: number }
): Promise<Array<{
  date: string;
  totalOrders: number;
  fulfilledOrders: number;
  fulfillmentRate: number;
  totalAmount: number;
}>> => {
  const response = await get<Array<{
    date: string;
    totalOrders: number;
    fulfilledOrders: number;
    fulfillmentRate: number;
    totalAmount: number;
  }>>('/reports/orders', params);
  return response.data;
};

export const getCustomsReport = async (
  params?: { period?: string; port?: string }
): Promise<Array<{
  port: string;
  totalDeclarations: number;
  clearedCount: number;
  clearanceRate: number;
  avgClearanceHours: number;
  totalTax: number;
}>> => {
  const response = await get<Array<{
    port: string;
    totalDeclarations: number;
    clearedCount: number;
    clearanceRate: number;
    avgClearanceHours: number;
    totalTax: number;
  }>>('/reports/customs', params);
  return response.data;
};

export const getLogisticsReport = async (
  params?: { period?: string; carrier?: string }
): Promise<Array<{
  carrier: string;
  totalShipments: number;
  onTimeDelivery: number;
  onTimeRate: number;
  avgDeliveryDays: number;
  exceptionCount: number;
  exceptionRate: number;
}>> => {
  const response = await get<Array<{
    carrier: string;
    totalShipments: number;
    onTimeDelivery: number;
    onTimeRate: number;
    avgDeliveryDays: number;
    exceptionCount: number;
    exceptionRate: number;
  }>>('/reports/logistics', params);
  return response.data;
};

export const exportReport = async (
  reportType: string,
  format: 'xlsx' | 'pdf',
  params?: Record<string, unknown>
): Promise<Blob> => {
  const response = await api.get(`/reports/export/${reportType}`, {
    params: {
      format,
      ...params,
    },
    responseType: 'blob',
  });
  return response.data;
};

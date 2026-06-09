import { get, post, put } from './index';
import type {
  PaginatedResponse,
  Order,
  FulfillmentRecommendation,
  CustomsDocument,
} from '../types';

interface OrderQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  orderNo?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export const getOrderList = async (
  params: OrderQueryParams
): Promise<PaginatedResponse<Order>> => {
  const response = await get<PaginatedResponse<Order>>('/orders', params);
  return response.data;
};

export const getOrderById = async (id: number): Promise<Order> => {
  const response = await get<Order>(`/orders/${id}`);
  return response.data;
};

export const getFulfillmentRecommendation = async (
  orderId: number
): Promise<FulfillmentRecommendation> => {
  const response = await get<FulfillmentRecommendation>(`/orders/${orderId}/fulfillment-recommendation`);
  return response.data;
};

export const assignWarehouse = async (
  orderId: number,
  warehouseId: number
): Promise<Order> => {
  const response = await post<Order>(`/orders/${orderId}/assign-warehouse`, { warehouseId });
  return response.data;
};

export const updateOrderStatus = async (
  id: number,
  status: string
): Promise<Order> => {
  const response = await put<Order>(`/orders/${id}/status`, { status });
  return response.data;
};

export const getConsumerOrders = async (
  params?: { page?: number; pageSize?: number; status?: string }
): Promise<PaginatedResponse<Order>> => {
  const response = await get<PaginatedResponse<Order>>('/orders/my-orders', params);
  return response.data;
};

export const generateCustomsDocuments = async (
  orderId: number
): Promise<CustomsDocument[]> => {
  const response = await get<CustomsDocument[]>(`/orders/${orderId}/customs-documents`);
  return response.data;
};

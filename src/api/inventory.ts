import { get, post, put, del } from './index';
import type {
  PaginatedResponse,
  Inventory,
  TransferOrder,
  TransferSuggestion,
  InventoryAlert,
} from '../types';

interface InventoryQueryParams {
  page?: number;
  pageSize?: number;
  warehouseId?: number;
  productId?: number;
  sku?: string;
  [key: string]: unknown;
}

export const getInventoryList = async (
  params: InventoryQueryParams
): Promise<PaginatedResponse<Inventory>> => {
  const response = await get<PaginatedResponse<Inventory>>('/inventory', params);
  return response.data;
};

export const getInventoryById = async (id: number): Promise<Inventory> => {
  const response = await get<Inventory>(`/inventory/${id}`);
  return response.data;
};

export const getInventoryAlerts = async (
  params?: { type?: string; severity?: string }
): Promise<InventoryAlert[]> => {
  const response = await get<InventoryAlert[]>('/inventory/alerts', params);
  return response.data;
};

export const getTransferSuggestions = async (): Promise<TransferSuggestion[]> => {
  const response = await get<TransferSuggestion[]>('/inventory/transfer-suggestions');
  return response.data;
};

export const createTransferOrder = async (
  data: Omit<TransferOrder, 'id' | 'createdAt' | 'status'>
): Promise<TransferOrder> => {
  const response = await post<TransferOrder>('/inventory/transfers', data);
  return response.data;
};

export const getTransferOrders = async (
  params?: { page?: number; pageSize?: number; status?: string }
): Promise<PaginatedResponse<TransferOrder>> => {
  const response = await get<PaginatedResponse<TransferOrder>>('/inventory/transfers', params);
  return response.data;
};

export const getTransferOrderById = async (id: number): Promise<TransferOrder> => {
  const response = await get<TransferOrder>(`/inventory/transfers/${id}`);
  return response.data;
};

export const approveTransferOrder = async (id: number): Promise<TransferOrder> => {
  const response = await put<TransferOrder>(`/inventory/transfers/${id}/approve`);
  return response.data;
};

export const rejectTransferOrder = async (id: number, reason: string): Promise<TransferOrder> => {
  const response = await put<TransferOrder>(`/inventory/transfers/${id}/reject`, { reason });
  return response.data;
};

export const executeTransferOrder = async (id: number): Promise<TransferOrder> => {
  const response = await post<TransferOrder>(`/inventory/transfers/${id}/execute`);
  return response.data;
};

export const updateInventory = async (
  id: number,
  data: Partial<Inventory>
): Promise<Inventory> => {
  const response = await put<Inventory>(`/inventory/${id}`, data);
  return response.data;
};

export const deleteInventory = async (id: number): Promise<void> => {
  await del<void>(`/inventory/${id}`);
};

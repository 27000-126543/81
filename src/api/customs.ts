import { get, post, put } from './index';
import type {
  PaginatedResponse,
  CustomsDeclaration,
  CustomsTrajectory,
  WorkOrder,
} from '../types';

interface DeclarationQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  declarationNo?: string;
  port?: string;
  [key: string]: unknown;
}

interface WorkOrderQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  priority?: string;
  type?: string;
  [key: string]: unknown;
}

export const getCustomsDeclarations = async (
  params: DeclarationQueryParams
): Promise<PaginatedResponse<CustomsDeclaration>> => {
  const response = await get<PaginatedResponse<CustomsDeclaration>>('/customs/declarations', params);
  return response.data;
};

export const getCustomsDeclarationById = async (id: number): Promise<CustomsDeclaration> => {
  const response = await get<CustomsDeclaration>(`/customs/declarations/${id}`);
  return response.data;
};

export const getCustomsTrajectory = async (
  declarationId: number
): Promise<CustomsTrajectory[]> => {
  const response = await get<CustomsTrajectory[]>(`/customs/declarations/${declarationId}/trajectory`);
  return response.data;
};

export const updateDeclarationStatus = async (
  id: number,
  status: string
): Promise<CustomsDeclaration> => {
  const response = await put<CustomsDeclaration>(`/customs/declarations/${id}/status`, { status });
  return response.data;
};

export const getWorkOrders = async (
  params: WorkOrderQueryParams
): Promise<PaginatedResponse<WorkOrder>> => {
  const response = await get<PaginatedResponse<WorkOrder>>('/customs/work-orders', params);
  return response.data;
};

export const getWorkOrderById = async (id: number): Promise<WorkOrder> => {
  const response = await get<WorkOrder>(`/customs/work-orders/${id}`);
  return response.data;
};

export const createWorkOrder = async (
  data: Omit<WorkOrder, 'id' | 'createdAt' | 'status' | 'currentApprovalLevel'>
): Promise<WorkOrder> => {
  const response = await post<WorkOrder>('/customs/work-orders', data);
  return response.data;
};

export const approveWorkOrder = async (
  id: number,
  level: number,
  comment: string
): Promise<WorkOrder> => {
  const response = await put<WorkOrder>(`/customs/work-orders/${id}/approve`, { 
    level: String(level), 
    comment: comment || '同意' 
  });
  return response.data;
};

export const rejectWorkOrder = async (
  id: number,
  level: number,
  comment: string
): Promise<WorkOrder> => {
  const response = await put<WorkOrder>(`/customs/work-orders/${id}/reject`, { 
    level: String(level), 
    comment: comment || '驳回' 
  });
  return response.data;
};

export const escalateWorkOrder = async (id: number): Promise<WorkOrder> => {
  const response = await put<WorkOrder>(`/customs/work-orders/${id}/escalate`);
  return response.data;
};

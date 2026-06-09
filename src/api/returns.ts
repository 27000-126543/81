import { get, post, put } from './index';
import type {
  PaginatedResponse,
  ReturnRecord,
} from '../types';

interface ReturnQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  liability?: string;
  returnNo?: string;
  [key: string]: unknown;
}

export const getReturnList = async (
  params: ReturnQueryParams
): Promise<PaginatedResponse<ReturnRecord>> => {
  const response = await get<PaginatedResponse<ReturnRecord>>('/returns', params);
  return response.data;
};

export const getReturnById = async (id: number): Promise<ReturnRecord> => {
  const response = await get<ReturnRecord>(`/returns/${id}`);
  return response.data;
};

export const createReturn = async (
  data: Omit<ReturnRecord, 'id' | 'createdAt' | 'status'>
): Promise<ReturnRecord> => {
  const response = await post<ReturnRecord>('/returns', data);
  return response.data;
};

export const updateReturnLiability = async (
  id: number,
  liability: string,
  reason?: string
): Promise<ReturnRecord> => {
  const response = await post<ReturnRecord>(`/returns/${id}/liability`, { liability, reason });
  return response.data;
};

export const updateReturnStatus = async (
  id: number,
  status: string
): Promise<ReturnRecord> => {
  const response = await put<ReturnRecord>(`/returns/${id}/status`, { status });
  return response.data;
};

export const processRefund = async (
  returnId: number
): Promise<ReturnRecord> => {
  const response = await post<ReturnRecord>(`/returns/${returnId}/refund`);
  return response.data;
};

export const processExchange = async (
  returnId: number
): Promise<ReturnRecord> => {
  const response = await post<ReturnRecord>(`/returns/${returnId}/exchange`);
  return response.data;
};

export const processScrap = async (
  returnId: number
): Promise<ReturnRecord> => {
  const response = await post<ReturnRecord>(`/returns/${returnId}/scrap`);
  return response.data;
};

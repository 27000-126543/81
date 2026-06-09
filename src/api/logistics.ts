import { get, put } from './index';
import type {
  PaginatedResponse,
  LogisticsTracking,
  LogisticsException,
  Compensation,
} from '../types';

interface TrackingQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  trackingNo?: string;
  orderNo?: string;
  [key: string]: unknown;
}

interface ExceptionQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  [key: string]: unknown;
}

export const getLogisticsTrackingList = async (
  params: TrackingQueryParams
): Promise<PaginatedResponse<LogisticsTracking>> => {
  const response = await get<PaginatedResponse<LogisticsTracking>>('/logistics/tracking', params);
  return response.data;
};

export const getLogisticsTrackingById = async (id: number): Promise<LogisticsTracking> => {
  const response = await get<LogisticsTracking>(`/logistics/tracking/${id}`);
  return response.data;
};

export const getLogisticsTrackingByOrderId = async (
  orderId: number
): Promise<LogisticsTracking> => {
  const response = await get<LogisticsTracking>(`/logistics/tracking/order/${orderId}`);
  return response.data;
};

export const updateLogisticsStatus = async (
  id: number,
  status: string,
  location: string,
  description: string
): Promise<LogisticsTracking> => {
  const response = await put<LogisticsTracking>(`/logistics/tracking/${id}/status`, {
    status,
    location,
    description,
  });
  return response.data;
};

export const getLogisticsExceptions = async (
  params: ExceptionQueryParams
): Promise<PaginatedResponse<LogisticsException>> => {
  const response = await get<PaginatedResponse<LogisticsException>>('/logistics/exceptions', params);
  return response.data;
};

export const getLogisticsExceptionById = async (id: number): Promise<LogisticsException> => {
  const response = await get<LogisticsException>(`/logistics/exceptions/${id}`);
  return response.data;
};

export const handleLogisticsException = async (
  id: number,
  status: string,
  resolution: string
): Promise<LogisticsException> => {
  const response = await put<LogisticsException>(`/logistics/exceptions/${id}/status`, {
    status,
    resolution,
  });
  return response.data;
};

export const calculateCompensation = async (
  exceptionId: number
): Promise<Compensation> => {
  const response = await get<Compensation>(`/logistics/exceptions/${exceptionId}/compensation`);
  return response.data;
};

export const applyCompensation = async (
  exceptionId: number,
  data: {
    policyNo?: string;
    compensationType?: string;
    breakdown?: Array<{ item: string; amount: number; description: string }>;
  }
): Promise<LogisticsException> => {
  const response = await put<LogisticsException>(
    `/logistics/exceptions/${exceptionId}/compensation`,
    data
  );
  return response.data;
};

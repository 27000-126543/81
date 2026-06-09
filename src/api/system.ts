import { get, post, put, del } from './index';
import type {
  PaginatedResponse,
  User,
  ApprovalFlow,
  SystemRule,
} from '../types';

interface UserQueryParams {
  page?: number;
  pageSize?: number;
  role?: string;
  username?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

export const getUserList = async (
  params: UserQueryParams
): Promise<PaginatedResponse<User>> => {
  const response = await get<PaginatedResponse<User>>('/system/users', params);
  return response.data;
};

export const getUserById = async (id: number): Promise<User> => {
  const response = await get<User>(`/system/users/${id}`);
  return response.data;
};

export const createUser = async (
  data: Omit<User, 'id' | 'createdAt'> & { password: string }
): Promise<User> => {
  const response = await post<User>('/system/users', data);
  return response.data;
};

export const updateUser = async (
  id: number,
  data: Partial<User> & { password?: string }
): Promise<User> => {
  const response = await put<User>(`/system/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: number): Promise<void> => {
  await del<void>(`/system/users/${id}`);
};

export const getApprovalFlows = async (): Promise<ApprovalFlow[]> => {
  const response = await get<ApprovalFlow[]>('/system/approval-flows');
  return response.data;
};

export const createApprovalFlow = async (
  data: Omit<ApprovalFlow, 'id'>
): Promise<ApprovalFlow> => {
  const response = await post<ApprovalFlow>('/system/approval-flows', data);
  return response.data;
};

export const updateApprovalFlow = async (
  id: number,
  data: Partial<ApprovalFlow>
): Promise<ApprovalFlow> => {
  const response = await put<ApprovalFlow>(`/system/approval-flows/${id}`, data);
  return response.data;
};

export const deleteApprovalFlow = async (id: number): Promise<void> => {
  await del<void>(`/system/approval-flows/${id}`);
};

export const getSystemRules = async (): Promise<SystemRule[]> => {
  const response = await get<SystemRule[]>('/system/rules');
  return response.data;
};

export const updateSystemRule = async (
  id: number,
  ruleValue: string,
  description?: string
): Promise<SystemRule> => {
  const response = await put<SystemRule>(`/system/rules/${id}`, { ruleValue, description });
  return response.data;
};

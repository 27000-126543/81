import { post } from './index';
import type { LoginRequest, LoginResponse, User } from '../types';

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await post<LoginResponse>('/auth/login', data);
  return response.data;
};

export const logout = async (): Promise<void> => {
  await post<void>('/auth/logout');
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await post<User>('/auth/me');
  return response.data;
};

export const changePassword = async (data: {
  oldPassword: string;
  newPassword: string;
}): Promise<void> => {
  await post<void>('/auth/change-password', data);
};

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(new Error('登录已过期，请重新登录'));
      }

      if (status === 403) {
        return Promise.reject(new Error('没有权限访问该资源'));
      }

      if (status === 404) {
        return Promise.reject(new Error('请求的资源不存在'));
      }

      if (status >= 500) {
        return Promise.reject(new Error('服务器错误，请稍后重试'));
      }

      if (data && data.message) {
        return Promise.reject(new Error(data.message));
      }
    } else if (error.request) {
      return Promise.reject(new Error('网络错误，请检查网络连接'));
    } else {
      return Promise.reject(new Error('请求失败，请重试'));
    }

    return Promise.reject(error);
  }
);

export default api;

export const request = async <T>(
  config: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await api.request<ApiResponse<T>>(config);
  return response.data;
};

export const get = async <T>(
  url: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  return request<T>({
    method: 'GET',
    url,
    params,
    ...config,
  });
};

export const post = async <T>(
  url: string,
  data?: unknown
): Promise<ApiResponse<T>> => {
  return request<T>({
    method: 'POST',
    url,
    data,
  });
};

export const put = async <T>(
  url: string,
  data?: unknown
): Promise<ApiResponse<T>> => {
  return request<T>({
    method: 'PUT',
    url,
    data,
  });
};

export const del = async <T>(
  url: string,
  params?: Record<string, unknown>
): Promise<ApiResponse<T>> => {
  return request<T>({
    method: 'DELETE',
    url,
    params,
  });
};

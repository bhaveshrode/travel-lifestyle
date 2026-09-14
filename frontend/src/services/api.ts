import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse } from '@/types';

function resolveApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (!configured) {
    return '/api/v1';
  }

  try {
    const url = new URL(configured, window.location.origin);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return '/api/v1';
    }
    return configured;
  } catch {
    return configured.startsWith('/') ? configured : '/api/v1';
  }
}

const API_URL = resolveApiUrl();

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const requestUrl = error.config?.url || '';
        const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
        if (error.response?.status === 401 && !isAuthRequest) {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const response = await this.post<{ accessToken: string }>(
                '/auth/refresh',
                { refreshToken },
                false
              );
              localStorage.setItem('accessToken', response.data.accessToken);
              // Retry original request
              if (error.config) {
                error.config.headers.Authorization = `Bearer ${response.data.accessToken}`;
                return this.client(error.config);
              }
            } catch {
              // Refresh failed, clear tokens
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
            }
          } else {
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async getBlob(url: string, config?: AxiosRequestConfig): Promise<Blob> {
    const response = await this.client.get<Blob>(url, { ...config, responseType: 'blob' });
    return response.data;
  }

  async post<T>(url: string, data?: any, useAuth = true): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, {
      headers: useAuth ? undefined : {},
    });
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

export const api = new ApiClient();
export default api;

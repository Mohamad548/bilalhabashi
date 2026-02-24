import axios, { type AxiosInstance } from 'axios';
import { STORAGE_KEYS } from '@/utils/constants';
import { getClientApiBase } from './apiConfig';

function getApiBaseURL(): string {
  return getClientApiBase();
}

export const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    config.baseURL = getApiBaseURL();
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url?.includes?.('/api/auth/login');
    if (
      err.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !isLoginRequest
    ) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

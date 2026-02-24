import axios, { type AxiosInstance } from 'axios';
import { STORAGE_KEYS } from '@/utils/constants';

const API_PORT = process.env.NEXT_PUBLIC_API_PORT ? Number(process.env.NEXT_PUBLIC_API_PORT) : 3001;

function getApiBaseURL(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${API_PORT}`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || `http://localhost:${API_PORT}`;
}

export const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || `http://localhost:${API_PORT}`,
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

import { api } from '@/lib/axios';
import { STORAGE_KEYS } from '@/utils/constants';
import type { User } from '@/types';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

const LOGIN_ERROR_MESSAGE = 'نام کاربری یا رمز عبور اشتباه است.';

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>('/api/auth/login', payload);
  if (data.success && data.token && data.user) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
      document.cookie = `${STORAGE_KEYS.TOKEN}=${encodeURIComponent(data.token)}; path=/; max-age=86400; SameSite=Lax`;
    }
  }
    return data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
    if (status === 401) {
      return { success: false, message: msg || LOGIN_ERROR_MESSAGE };
    }
    return {
      success: false,
      message: msg || 'خطا در ارتباط با سرور. دوباره تلاش کنید.',
    };
  }
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    document.cookie = `${STORAGE_KEYS.TOKEN}=; path=/; max-age=0`;
    window.location.href = '/login';
  }
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function setStoredUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

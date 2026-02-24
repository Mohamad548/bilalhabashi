/** آدرس بک‌اند روی Render */
export const PRODUCTION_API_URL = 'https://bilalhabashi-backend.onrender.com';

const API_PORT = process.env.NEXT_PUBLIC_API_PORT ? Number(process.env.NEXT_PUBLIC_API_PORT) : 3001;

/** آدرس پایه API برای استفاده در کلاینت (مثلاً در useEffect) */
export function getClientApiBase(): string {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || `http://localhost:${API_PORT}`;
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://localhost:${API_PORT}`;
  }
  return PRODUCTION_API_URL;
}

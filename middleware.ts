import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOGIN_PATH = '/login';
const TOKEN_KEY = 'sanduq_token';

function getToken(request: NextRequest): string | null {
  return request.cookies.get(TOKEN_KEY)?.value ?? null;
}

export function middleware(request: NextRequest) {
  const token = getToken(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    if (!token) {
      const loginUrl = new URL(LOGIN_PATH, request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === LOGIN_PATH && token) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/login'],
};

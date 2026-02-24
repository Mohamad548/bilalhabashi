'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/layout';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) router.replace('/login');
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-indigo-900/95 to-slate-900">
        <div className="rounded-2xl bg-white/10 px-6 py-4 backdrop-blur-xl border border-white/20">
          <span className="text-sm text-white/90">در حال بارگذاری...</span>
        </div>
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}

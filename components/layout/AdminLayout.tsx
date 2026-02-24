'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { APP_HEADER_TITLE } from '@/utils/constants';
import { IconMenu } from '@/components/icons';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-indigo-900/95 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.2),transparent)]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-slate-500/10 blur-3xl" />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="relative flex-1 md:mr-56 min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 border-b border-white/20 bg-white/10 backdrop-blur-xl px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-xl hover:bg-white/10 text-white/80"
            aria-label="منو"
          >
            <IconMenu />
          </button>
          <h1 className="text-sm font-semibold text-white truncate flex-1 text-center md:text-right">
            {APP_HEADER_TITLE}
          </h1>
          <span className="w-10 md:hidden" aria-hidden />
        </header>
        <div className="flex-1 p-3 pb-20 md:pb-8">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}

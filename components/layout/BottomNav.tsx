'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconDashboard,
  IconReport,
  IconMembers,
  IconPayments,
  IconLoans,
  IconDeposit,
  IconTelegram,
  IconSettings,
} from '@/components/icons';

const navItems = [
  { href: '/admin', label: 'داشبورد', Icon: IconDashboard },
  { href: '/admin/report', label: 'گزارش', Icon: IconReport },
  { href: '/admin/members', label: 'اعضا', Icon: IconMembers },
  { href: '/admin/payments', label: 'پرداخت', Icon: IconPayments },
  { href: '/admin/loans', label: 'وام', Icon: IconLoans },
  { href: '/admin/deposits', label: 'سپرده', Icon: IconDeposit },
  { href: '/admin/telegram', label: 'تلگرام', Icon: IconTelegram },
  { href: '/admin/settings', label: 'تنظیمات', Icon: IconSettings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/20 bg-white/10 backdrop-blur-xl safe-area-pb"
      aria-label="دسترسی سریع"
    >
      <div className="flex items-center justify-around min-h-[56px] px-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex flex-col items-center justify-center gap-0.5 py-2 px-2 min-w-[56px] rounded-lg transition-colors',
                isActive
                  ? 'text-white bg-white/20'
                  : 'text-white/70 hover:text-white hover:bg-white/10',
              ].join(' ')}
            >
              <Icon />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

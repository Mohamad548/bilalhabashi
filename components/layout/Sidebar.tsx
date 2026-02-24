'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { APP_HEADER_TITLE } from '@/utils/constants';
import { Button, Modal } from '@/components/ui';
import { IconDashboard, IconMembers, IconPayments, IconLoans, IconDeposit, IconFund, IconReport, IconSettings, IconTelegram, IconRequest, IconClose } from '@/components/icons';

const navItems = [
  { href: '/admin', label: 'داشبورد', Icon: IconDashboard },
  { href: '/admin/report', label: 'گزارش', Icon: IconReport },
  { href: '/admin/members', label: 'اعضا', Icon: IconMembers },
  { href: '/admin/payments', label: 'پرداخت‌ها', Icon: IconPayments },
  { href: '/admin/loans', label: 'وام‌ها', Icon: IconLoans },
  { href: '/admin/requests', label: 'درخواست‌ها', Icon: IconRequest },
  { href: '/admin/deposits', label: 'سپرده', Icon: IconDeposit },
  { href: '/admin/fund', label: 'صندوق', Icon: IconFund },
  { href: '/admin/telegram', label: 'تلگرام', Icon: IconTelegram },
  { href: '/admin/settings', label: 'تنظیمات', Icon: IconSettings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const handleLogoutClick = () => setLogoutModalOpen(true);
  const handleLogoutConfirm = () => {
    setLogoutModalOpen(false);
    onClose();
    logout();
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={[
          'fixed top-0 right-0 z-50 h-full w-56 max-w-[80vw]',
          'rounded-l-2xl border-l border-white/20 bg-white/10 backdrop-blur-xl',
          'flex flex-col shadow-2xl transition-transform duration-200 ease-out md:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div className="p-3 border-b border-white/20 flex items-center justify-between">
          <span className="text-xs font-semibold text-white truncate max-w-[10rem]">{APP_HEADER_TITLE}</span>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/80"
            aria-label="بستن منو"
          >
            <IconClose />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={[
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white',
                ].join(' ')}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/20">
          <p className="text-xs text-white/70 truncate mb-2">{user?.name}</p>
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={handleLogoutClick}
            className="text-white/90 hover:bg-white/10 hover:text-white border border-white/20"
          >
            خروج
          </Button>
        </div>
      </aside>

      <Modal
        open={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        title="تأیید خروج"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLogoutModalOpen(false)}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              انصراف
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleLogoutConfirm}
            >
              خروج
            </Button>
          </>
        }
      >
        <p className="text-white/90">آیا از خروج از حساب کاربری اطمینان دارید؟</p>
      </Modal>
    </>
  );
}

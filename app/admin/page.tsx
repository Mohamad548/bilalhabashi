'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/axios';
import { Card } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import {
  IconReport,
  IconMembers,
  IconPayments,
  IconLoans,
  IconDeposit,
  IconFund,
} from '@/components/icons';
import type { Member, Payment, Loan } from '@/types';

const quickLinks = [
  { href: '/admin/report', label: 'گزارش', Icon: IconReport },
  { href: '/admin/members', label: 'اعضا', Icon: IconMembers },
  { href: '/admin/payments', label: 'پرداخت‌ها', Icon: IconPayments },
  { href: '/admin/loans', label: 'وام‌ها', Icon: IconLoans },
  { href: '/admin/deposits', label: 'سپرده', Icon: IconDeposit },
  { href: '/admin/fund', label: 'صندوق', Icon: IconFund },
];

export default function AdminDashboardPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setFetchError(null);
    Promise.allSettled([
      api.get<Member[]>('/api/members'),
      api.get<Payment[]>('/api/payments'),
      api.get<Loan[]>('/api/loans'),
    ])
      .then(([m, p, l]) => {
        if (m.status === 'fulfilled') setMembers(Array.isArray(m.value?.data) ? m.value.data : []);
        else setMembers([]);
        if (p.status === 'fulfilled') setPayments(Array.isArray(p.value?.data) ? p.value.data : []);
        else setPayments([]);
        if (l.status === 'fulfilled') setLoans(Array.isArray(l.value?.data) ? l.value.data : []);
        else setLoans([]);
        const failed = [m, p, l].filter((r) => r.status === 'rejected');
        if (failed.length) setFetchError('برخی داده‌ها بارگذاری نشد. مطمئن شوید سرور API (پورت ۳۰۰۱) روشن است.');
      })
      .finally(() => setLoading(false));
  }, []);

  const totalDeposits = members.reduce((s, m) => s + (m.deposit ?? 0), 0);
  const totalLoanBalance = members.reduce((s, m) => s + (m.loanBalance ?? 0), 0);
  /** جمع مانده نهایی = جمع موجودی سپرده اعضا − جمع مانده وام‌های قابل وصول */
  const fundNetBalance = totalDeposits - totalLoanBalance;
  const totalRepayments = (payments || [])
    .filter((p) => p.type === 'repayment')
    .reduce((s, p) => s + p.amount, 0);
  const activeLoansCount = loans.filter((l) => l.status === 'active').length;
  const activeMembersCount = members.filter((m) => m.status === 'active').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-4">
          <p className="text-sm text-white/80">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="rounded-xl bg-amber-500/20 border border-amber-400/40 px-4 py-3 text-sm text-amber-200">
          {fetchError}
        </div>
      )}
      <div>
        <h1 className="text-lg font-semibold text-white">داشبورد</h1>
        <p className="text-xs text-white/50 mt-0.5">دسترسی سریع و خلاصه گزارش</p>
      </div>

      {/* خلاصه کوتاه از گزارش */}
      <Card variant="glass" className="border-white/20">
        <h2 className="text-sm font-medium text-white/90 mb-3 pb-2 border-b border-white/10">
          خلاصه گزارش
        </h2>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-white/50">تعداد اعضا</p>
              <p className="text-base font-semibold text-white tabular-nums">{members.length}</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-white/50">وام‌های فعال</p>
              <p className="text-base font-semibold text-white tabular-nums">{activeLoansCount}</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-white/50">اعضای فعال</p>
              <p className="text-base font-semibold text-white tabular-nums">{activeMembersCount}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-white/50">جمع بازپرداخت‌ها</p>
              <p className="text-base font-semibold text-white tabular-nums">{formatCurrency(totalRepayments)}</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-white/50">جمع مانده وام‌ها</p>
              <p className="text-base font-semibold text-amber-200 tabular-nums">{formatCurrency(totalLoanBalance)}</p>
            </div>
          </div>
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 p-3">
            <p className="text-xs text-white/50">جمع مانده نهایی صندوق</p>
            <p className="text-base font-semibold text-emerald-200 tabular-nums">{formatCurrency(fundNetBalance)}</p>
          </div>
        </div>
        <Link
          href="/admin/report"
          className="inline-block mt-3 text-xs text-white/70 hover:text-white underline"
        >
          مشاهده گزارش کامل ←
        </Link>
      </Card>

      {/* دسترسی سریع */}
      <Card variant="glass" className="border-white/20">
        <h2 className="text-sm font-medium text-white/90 mb-3 pb-2 border-b border-white/10">
          دسترسی سریع
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {quickLinks.map((item) => {
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/90 hover:text-white transition-colors"
              >
                <Icon />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

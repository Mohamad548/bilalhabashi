'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Card } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import type { Member, Payment, Loan } from '@/types';

export default function AdminReportPage() {
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

  const totalDeposits = (members || []).reduce((s, m) => s + (m.deposit ?? 0), 0);
  const totalLoanBalance = (members || []).reduce((s, m) => s + (m.loanBalance ?? 0), 0);
  const totalContributions = (payments || [])
    .filter((p) => p.type === 'contribution')
    .reduce((s, p) => s + p.amount, 0);
  const totalRepayments = (payments || [])
    .filter((p) => p.type === 'repayment')
    .reduce((s, p) => s + p.amount, 0);
  const activeLoansCount = (loans || []).filter((l) => l.status === 'active').length;
  const activeMembersCount = (members || []).filter((m) => m.status === 'active').length;
  /** جمع آنلاین صندوق = جمع موجودی سپرده اعضا − جمع مانده وام‌های قابل وصول = جمع مانده نهایی */
  const fundOnlineTotal = totalDeposits - totalLoanBalance;

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
      <header>
        <h1 className="text-lg font-semibold text-white">گزارش</h1>
        <p className="text-xs text-white/50 mt-0.5">گزارش کامل وضعیت و گردش مالی صندوق قرض‌الحسنه</p>
      </header>

      <Card variant="glass" className="border-white/20">
        <h2 className="text-sm font-medium text-white/90 mb-3 pb-2 border-b border-white/10">خلاصه وضعیت صندوق</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <span className="text-xs text-white/50">جمع موجودی سپرده اعضا</span>
            <span className="text-base font-semibold text-white tabular-nums">{formatCurrency(totalDeposits)}</span>
            <span className="text-xs text-white/40">بدهی صندوق به اعضا</span>
          </div>
          <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <span className="text-xs text-white/50">جمع مانده وام‌های قابل وصول</span>
            <span className="text-base font-semibold text-amber-200 tabular-nums">{formatCurrency(totalLoanBalance)}</span>
            <span className="text-xs text-white/40">طلب صندوق از اعضا</span>
          </div>
          <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-3 py-2">
            <span className="text-xs text-white/50">جمع آنلاین صندوق</span>
            <span className="text-base font-semibold text-emerald-200 tabular-nums">{formatCurrency(fundOnlineTotal)}</span>
            <span className="text-xs text-white/40">جمع مانده نهایی (سپرده − مانده وام)</span>
          </div>
        </div>
      </Card>

      <Card variant="glass" className="border-white/20">
        <h2 className="text-sm font-medium text-white/90 mb-4 pb-2 border-b border-white/10">آمار عملیاتی</h2>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className="text-2xl font-bold text-white tabular-nums">{(members || []).length}</p>
            <p className="text-xs text-white/60 mt-0.5">تعداد اعضا</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className="text-2xl font-bold text-white tabular-nums">{activeMembersCount}</p>
            <p className="text-xs text-white/60 mt-0.5">اعضای فعال</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className="text-2xl font-bold text-white tabular-nums">{(loans || []).length}</p>
            <p className="text-xs text-white/60 mt-0.5">تعداد وام‌ها</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className="text-2xl font-bold text-white tabular-nums">{activeLoansCount}</p>
            <p className="text-xs text-white/60 mt-0.5">وام‌های فعال</p>
          </div>
        </div>
      </Card>

      <Card variant="glass" className="border-white/20">
        <h2 className="text-sm font-medium text-white/90 mb-4 pb-2 border-b border-white/10">گردش مالی</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <span className="text-sm text-white/70">جمع واریزهای سپرده</span>
            <span className="text-sm font-medium text-white tabular-nums">{formatCurrency(totalContributions)}</span>
          </div>
          <div className="flex justify-between items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <span className="text-sm text-white/70">جمع بازپرداخت‌های وام</span>
            <span className="text-sm font-medium text-white tabular-nums">{formatCurrency(totalRepayments)}</span>
          </div>
        </div>
        <p className="text-xs text-white/40 mt-3">ارقام بر اساس رکورد پرداخت‌ها است.</p>
      </Card>
    </div>
  );
}

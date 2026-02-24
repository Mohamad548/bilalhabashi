'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Card } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import type { Payment, Loan, FundLogEntry } from '@/types';

export default function FundPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [fundLog, setFundLog] = useState<FundLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Payment[]>('/api/payments'),
      api.get<Loan[]>('/api/loans'),
      api.get<FundLogEntry[]>('/api/fundLog').catch(() => ({ data: [] })),
    ])
      .then(([p, l, f]) => {
        setPayments(p.data);
        setLoans(l.data);
        setFundLog(Array.isArray(f.data) ? f.data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalIn = payments
    .filter((p) => p.type === 'contribution')
    .reduce((s, p) => s + p.amount, 0);
  const totalRepayment = payments
    .filter((p) => p.type === 'repayment')
    .reduce((s, p) => s + p.amount, 0);
  const totalLoansOut = loans
    .filter((l) => l.status === 'active')
    .reduce((s, l) => s + l.amount, 0);
  const balance = totalIn + totalRepayment - totalLoansOut;

  if (loading) return <p className="text-xs text-slate-500">در حال بارگذاری...</p>;

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold text-slate-800">صندوق</h1>
      <Card title="خلاصه گردش مالی">
        <ul className="text-xs space-y-1.5">
          <li className="flex justify-between">
            <span className="text-slate-600">جمع واریز (سهم)</span>
            <span className="font-medium">{formatCurrency(totalIn)}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-slate-600">بازپرداخت‌ها</span>
            <span className="font-medium">−{formatCurrency(totalRepayment)}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-slate-600">وام‌های پرداخت‌شده (فعال)</span>
            <span className="font-medium">−{formatCurrency(totalLoansOut)}</span>
          </li>
          <li className="flex justify-between pt-1 border-t border-slate-100">
            <span className="text-slate-800 font-medium">موجودی تقریبی صندوق</span>
            <span className="font-semibold">{formatCurrency(balance)}</span>
          </li>
        </ul>
      </Card>
      <Card title="توضیح">
        <p className="text-xs text-slate-600 leading-relaxed">
          مبالغ بر اساس واریزها و وام‌های ثبت‌شده محاسبه شده است. برای گزارش حقوقی و حسابداری دقیق،
          توصیه می‌شود صورت‌حساب دوره‌ای با امضا اعضا نگهداری شود.
        </p>
      </Card>
    </div>
  );
}

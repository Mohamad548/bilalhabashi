'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { Card } from '@/components/ui';
import { formatCurrency, formatDateShort } from '@/utils/format';
import type { Payment, Member } from '@/types';

export default function PaymentDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [payment, setPayment] = useState<Payment | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<Payment>(`/api/payments/${id}`)
      .then((res) => {
        setPayment(res.data);
        return Promise.all([
          api.get<Member>(`/api/members/${res.data.memberId}`),
          api.get<Payment[]>('/api/payments'),
        ]);
      })
      .then(([memberRes, paymentsRes]) => {
        setMember(memberRes.data);
        const memberId = memberRes.data?.id;
        const list = (paymentsRes.data || []).filter((p) => p.memberId === memberId);
        setAllPayments(
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      })
      .catch(() => {
        setPayment(null);
        setMember(null);
        setAllPayments([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-white/80">در حال بارگذاری...</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-white/70">پرداخت یافت نشد.</p>
        <Link
          href="/admin/payments"
          className="inline-block text-sm text-white/90 hover:text-white underline"
        >
          بازگشت به لیست پرداخت‌ها
        </Link>
      </div>
    );
  }

  const typeLabel = payment.type === 'contribution' ? 'سپرده / واریز' : 'بازپرداخت';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/payments"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 transition-colors"
            aria-label="بازگشت به لیست پرداخت‌ها"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-semibold text-white">جزئیات پرداخت</h1>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
            payment.type === 'contribution'
              ? 'bg-emerald-500/90 text-white'
              : 'bg-slate-500/90 text-white'
          }`}
        >
          {typeLabel}
        </span>
      </div>

      <Card variant="glass">
        <h2 className="text-sm font-medium text-white/90 mb-3">اطلاعات پرداخت</h2>
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-white/60">عضو:</span>
            <span className="mr-2 text-white font-medium">{member?.fullName ?? '—'}</span>
          </div>
          <div>
            <span className="text-white/60">شماره تماس:</span>
            <span className="mr-2 text-white">{member?.phone ?? '—'}</span>
          </div>
          <div>
            <span className="text-white/60">نوع:</span>
            <span className="mr-2 text-white">{typeLabel}</span>
          </div>
          <div>
            <span className="text-white/60">مبلغ:</span>
            <span className="mr-2 text-white font-medium">{formatCurrency(payment.amount)}</span>
          </div>
          <div>
            <span className="text-white/60">تاریخ:</span>
            <span className="mr-2 text-white">{formatDateShort(payment.date)}</span>
          </div>
          {payment.note && (
            <div>
              <span className="text-white/60">توضیح:</span>
              <span className="mr-2 text-white/90">{payment.note}</span>
            </div>
          )}
        </div>
      </Card>

      {/* لیست تمام پرداخت‌های این عضو */}
      <Card variant="glass">
        <h2 className="text-sm font-medium text-white/90 mb-3">تمام پرداخت‌های این عضو</h2>
        {allPayments.length === 0 ? (
          <p className="text-xs text-white/50 py-4">پرداخت دیگری ثبت نشده است.</p>
        ) : (
          <div className="space-y-2">
            {allPayments.map((p) => (
              <div
                key={p.id}
                className={`flex flex-wrap justify-between items-center gap-2 py-2 border-b border-white/10 last:border-0 ${p.id === payment.id ? 'bg-white/5 rounded-lg -mx-1 px-2' : ''}`}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      p.type === 'contribution' ? 'bg-emerald-500/80 text-white' : 'bg-slate-500/80 text-white'
                    }`}
                  >
                    {p.type === 'contribution' ? 'سپرده / واریز' : 'بازپرداخت'}
                  </span>
                  <span className="text-xs text-white/70">{formatDateShort(p.date)}</span>
                  {p.note && (
                    <span className="text-xs text-white/50"> — {p.note}</span>
                  )}
                </div>
                <span className="text-sm font-medium text-white">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

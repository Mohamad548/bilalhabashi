'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { Card, Modal } from '@/components/ui';
import { formatCurrency, formatDateShort, addMonthsToDate } from '@/utils/format';
import type { Loan, Member, Payment } from '@/types';

export default function LoanDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [loan, setLoan] = useState<Loan | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiBase, setApiBase] = useState('');
  const [receiptImageModal, setReceiptImageModal] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<Loan>(`/api/loans/${id}`)
      .then((res) => {
        setLoan(res.data);
        return api.get<Member>(`/api/members/${res.data.memberId}`);
      })
      .then((memberRes) => setMember(memberRes.data))
      .catch(() => {
        setLoan(null);
        setMember(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setApiBase(process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:3001`);
  }, []);

  useEffect(() => {
    if (!loan?.memberId) return;
    api
      .get<Payment[]>('/api/payments')
      .then((res) => {
        const list = (res.data || []).filter((p) => p.memberId === loan.memberId);
        setPayments(
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      })
      .catch(() => setPayments([]));
  }, [loan?.memberId]);

  /** اولین سررسید: یک ماه بعد از اعطا؛ آخرین سررسید: بعد از تعداد ماه بازپرداخت */
  const firstDueDate = loan ? addMonthsToDate(loan.date, 1) : '';
  const lastDueDate = loan ? addMonthsToDate(loan.date, loan.dueMonths ?? 0) : '';
  const monthlyInstallment = loan && (loan.dueMonths ?? 0) > 0 ? Math.floor(loan.amount / (loan.dueMonths ?? 1)) : 0;
  const repayments = payments.filter((p) => p.type === 'repayment');
  const totalRepaid = repayments.reduce((s, p) => s + p.amount, 0);
  /** مانده نهایی: از عضو اگر موجود باشد، وگرنه از تفاضل وام و جمع بازپرداخت */
  const loanAmount = loan?.amount ?? 0;
  const remainingBalance =
    typeof member?.loanBalance === 'number' ? member.loanBalance : Math.max(0, loanAmount - totalRepaid);
  const hasDepositDeduction = repayments.some((p) => p.note?.includes('برداشت از سپرده'));

  /** لیست اقساط به تعداد ماه وام: هر ردیف = یک ماه، با تاریخ سررسید و وضعیت پرداخت */
  const dueMonthsCount = loan?.dueMonths ?? 0;
  const installmentSchedule =
    dueMonthsCount > 0
      ? Array.from({ length: dueMonthsCount }, (_, i) => {
          const monthNum = i + 1;
          const dueDateForMonth = addMonthsToDate(loan!.date, monthNum);
          const paidThreshold = monthNum * monthlyInstallment;
          const isPaid = totalRepaid >= paidThreshold;
          return { monthNum, dueDateForMonth, isPaid };
        })
      : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-white/80">در حال بارگذاری...</p>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-white/70">وام یافت نشد.</p>
        <Link
          href="/admin/loans"
          className="inline-block text-sm text-white/90 hover:text-white underline"
        >
          بازگشت به لیست وام‌ها
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/loans"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 transition-colors"
            aria-label="بازگشت به لیست وام‌ها"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-semibold text-white">جزئیات وام</h1>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
            loan.status === 'active' ? 'bg-amber-500/90 text-white' : 'bg-slate-500/90 text-white'
          }`}
        >
          {loan.status === 'active' ? 'فعال' : 'تسویه‌شده'}
        </span>
      </div>

      {/* اطلاعات وام */}
      <Card variant="glass">
        <h2 className="text-sm font-medium text-white/90 mb-3">اطلاعات وام</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-white/60">عضو:</span>
            <span className="mr-2 text-white">{member?.fullName ?? '—'}</span>
          </div>
          <div>
            <span className="text-white/60">شماره تماس:</span>
            <span className="mr-2 text-white">{member?.phone ?? '—'}</span>
          </div>
          <div>
            <span className="text-white/60">مبلغ وام:</span>
            <span className="mr-2 text-white font-medium">{formatCurrency(loan.amount)}</span>
          </div>
          <div>
            <span className="text-white/60">تاریخ اعطا:</span>
            <span className="mr-2 text-white">{formatDateShort(loan.date)}</span>
          </div>
          <div>
            <span className="text-white/60">مدت بازپرداخت:</span>
            <span className="mr-2 text-white">{loan.dueMonths} ماه</span>
          </div>
          <div>
            <span className="text-white/60">قسط ماهانه:</span>
            <span className="mr-2 text-white font-medium">{formatCurrency(monthlyInstallment)}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-white/60">تاریخ سررسید:</span>
            <span className="mr-2 text-white font-medium">
              ماهانه — اولین سررسید: {formatDateShort(firstDueDate)}، آخرین سررسید: {formatDateShort(lastDueDate)}
            </span>
          </div>
        </div>
        {loan.note && (
          <p className="text-xs text-white/50 mt-3 pt-3 border-t border-white/10">{loan.note}</p>
        )}
      </Card>

      {/* ریز حساب */}
      <Card variant="glass">
        <h2 className="text-sm font-medium text-white/90 mb-3">ریز حساب</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-white/70">مبلغ وام</span>
            <span className="text-white font-medium">{formatCurrency(loan.amount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70">جمع بازپرداخت‌های ثبت‌شده</span>
            <span className="text-white">{formatCurrency(totalRepaid)}</span>
          </div>
          {hasDepositDeduction && (
            <p className="text-xs text-white/50 pt-1">
              بخشی از بازپرداخت‌ها از سپرده واریز شده و از مانده وام کسر شده است.
            </p>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <span className="text-white/80 font-medium">مانده نهایی</span>
            <span className="text-white font-medium">{formatCurrency(remainingBalance)}</span>
          </div>
        </div>
      </Card>

      {/* پرداخت‌های قسط این عضو: لیست به تعداد ماه وام با تاریخ سررسید و وضعیت */}
      <Card variant="glass">
        <h2 className="text-sm font-medium text-white/90 mb-3">پرداخت‌های قسط این عضو</h2>
        {installmentSchedule.length === 0 ? (
          <p className="text-xs text-white/50 py-4">مدت بازپرداخت مشخص نیست.</p>
        ) : (
          <div className="space-y-0">
            <div className="grid grid-cols-4 gap-2 py-2 px-2 rounded-t-lg bg-white/5 border-b border-white/10 text-xs text-white/60 font-medium">
              <span>ماه</span>
              <span>تاریخ سررسید</span>
              <span>مبلغ</span>
              <span className="text-left">وضعیت</span>
            </div>
            {installmentSchedule.map(({ monthNum, dueDateForMonth, isPaid }) => (
              <div
                key={monthNum}
                className="grid grid-cols-4 gap-2 py-2.5 px-2 border-b border-white/10 last:border-0 items-center text-sm"
              >
                <span className="text-white/90">ماه {monthNum}</span>
                <span className="text-white/80 tabular-nums">{formatDateShort(dueDateForMonth)}</span>
                <span className="text-white/80 tabular-nums">{formatCurrency(monthlyInstallment)}</span>
                <span className="text-left">
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      پرداخت‌شده
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-400/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      پرداخت‌نشده
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
        {repayments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-white/50 mb-2">ثبت بازپرداخت‌ها (ریز وام):</p>
            <div className="space-y-1.5">
              {repayments.map((p) => {
                const isFromDeposit = p.note?.includes('برداشت از سپرده');
                const sameDateExcess = payments.find(
                  (x) =>
                    x.type === 'contribution' &&
                    x.date === p.date &&
                    (x.note?.includes('مازاد وام به سپرده') ?? false)
                );
                const hasReceipt = !!p.receiptImagePath;
                const receiptPath = p.receiptImagePath;
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap justify-between items-center gap-2 py-1.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {hasReceipt && apiBase && receiptPath && (
                        <button
                          type="button"
                          onClick={() => setReceiptImageModal(receiptPath)}
                          className="shrink-0 w-8 h-8 rounded overflow-hidden border border-white/20 bg-black/20 hover:ring-2 hover:ring-white/40 focus:outline-none focus:ring-2 focus:ring-white/50"
                          aria-label="مشاهده رسید"
                        >
                          <img
                            src={`${apiBase}/uploads/${receiptPath}`}
                            alt="رسید"
                            className="w-full h-full object-contain"
                          />
                        </button>
                      )}
                      <span className="text-white/70">
                        {formatDateShort(p.date)}
                        {isFromDeposit && ' — برداشت از سپرده'}
                      </span>
                      {sameDateExcess && (
                        <span className="text-emerald-400/90">
                          مازاد به سپرده: {formatCurrency(sameDateExcess.amount)}
                        </span>
                      )}
                    </div>
                    <span className="text-white font-medium">{formatCurrency(p.amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* مودال بزرگنمایی عکس رسید */}
      <Modal
        open={!!receiptImageModal}
        onClose={() => setReceiptImageModal(null)}
        title="رسید پرداخت"
        size="lg"
        closeOnOverlayClick
        footer={null}
      >
        {receiptImageModal && apiBase && (
          <div className="flex justify-center bg-black/30 rounded-xl p-2 min-h-[200px]">
            <img
              src={`${apiBase}/uploads/${receiptImageModal}`}
              alt="رسید"
              className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

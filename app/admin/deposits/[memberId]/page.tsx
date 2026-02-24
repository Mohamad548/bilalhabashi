'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { api } from '@/lib/axios';
import { Card, Button, Input, Modal, FormattedNumberInput } from '@/components/ui';
import { formatCurrency, formatDateShort } from '@/utils/format';
import type { Payment, Member, FundLogEntry } from '@/types';

/** آیا این واریز سپرده از مازاد بازپرداخت (بقیقه) است؟ */
function isExcessFromRepayment(p: Payment): boolean {
  return !!(p.type === 'contribution' && p.note?.includes('مازاد وام به سپرده'));
}

/** تاریخ امروز به صورت YYYY-MM-DD برای ثبت پرداخت */
function getTodayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNum(v: string): number {
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

export default function DepositDetailPage() {
  const params = useParams();
  const memberId = typeof params?.memberId === 'string' ? params.memberId : '';
  const [member, setMember] = useState<Member | null>(null);
  const [deposits, setDeposits] = useState<Payment[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  /** انتخاب نوع برداشت: کسر از وام | واریز به حساب */
  const [withdrawType, setWithdrawType] = useState<'deduct_loan' | 'transfer'>('transfer');
  const [deductLoanAmount, setDeductLoanAmount] = useState('');
  const [transferCard, setTransferCard] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiBase, setApiBase] = useState('');
  const [receiptImageModal, setReceiptImageModal] = useState<string | null>(null);

  function loadMember() {
    if (!memberId) return;
    return api.get<Member>(`/api/members/${memberId}`).then((res) => setMember(res.data)).catch(() => setMember(null));
  }

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<Member>(`/api/members/${memberId}`)
      .then((res) => setMember(res.data))
      .catch(() => setMember(null))
      .finally(() => setLoading(false));
  }, [memberId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setApiBase(process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:3001`);
  }, []);

  useEffect(() => {
    if (!memberId) return;
    api
      .get<Payment[]>('/api/payments')
      .then((res) => {
        const all = (res.data || []).filter((p) => p.memberId === memberId);
        setAllPayments(all);
        const list = all.filter((p) => p.type === 'contribution');
        setDeposits(
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      })
      .catch(() => {
        setDeposits([]);
        setAllPayments([]);
      });
  }, [memberId]);

  const totalDeposits = deposits.reduce((sum, p) => sum + p.amount, 0);
  const depositBalance = member?.deposit ?? 0;
  const loanBalance = member?.loanBalance ?? 0;
  const hasLoan = loanBalance > 0;

  function openWithdrawModal() {
    setWithdrawError('');
    setWithdrawType(hasLoan ? 'deduct_loan' : 'transfer');
    setDeductLoanAmount('');
    setTransferCard('');
    setTransferAmount('');
    setWithdrawModalOpen(true);
  }

  /** حداکثر مبلغ برای کسر از وام = کمترین مقدار بین موجودی سپرده و مانده وام */
  const maxDeductAmount = Math.min(depositBalance, loanBalance);

  function handleWithdrawSubmit() {
    setWithdrawError('');
    if (withdrawType === 'deduct_loan') {
      const amount = toNum(deductLoanAmount);
      if (amount <= 0) {
        setWithdrawError('مبلغ را وارد کنید.');
        return;
      }
      if (amount > depositBalance) {
        setWithdrawError(`مبلغ نمی‌تواند بیشتر از موجودی سپرده (${formatCurrency(depositBalance)}) باشد.`);
        return;
      }
      if (amount > loanBalance) {
        setWithdrawError(`مبلغ نمی‌تواند بیشتر از مانده وام (${formatCurrency(loanBalance)}) باشد.`);
        return;
      }
      setSubmitting(true);
      const newDeposit = depositBalance - amount;
      const newLoanBalance = loanBalance - amount;
      const now = new Date().toISOString();
      const dateStr = getTodayDateStr();
      api
        .patch<Member>(`/api/members/${memberId}`, {
          ...member,
          deposit: newDeposit,
          loanBalance: newLoanBalance,
        })
        .then(() =>
          api.post<Payment>('/api/payments', {
            memberId,
            amount,
            date: dateStr,
            type: 'repayment',
            note: 'برداشت از سپرده — کسر از وام',
            createdAt: now,
          })
        )
        .then(() => {
          toast.success('مبلغ از سپرده و مانده وام کسر شد و در ریز اقساط ثبت شد.');
          setWithdrawModalOpen(false);
          loadMember();
        })
        .catch(() => toast.error('خطا در ثبت.'))
        .finally(() => setSubmitting(false));
      return;
    }
    // واریز به حساب
    const amount = toNum(transferAmount);
    if (amount <= 0) {
      setWithdrawError('مبلغ واریز را وارد کنید.');
      return;
    }
    if (amount > depositBalance) {
      setWithdrawError(`مبلغ نمی‌تواند بیشتر از موجودی سپرده (${formatCurrency(depositBalance)}) باشد.`);
      return;
    }
    if (!transferCard.trim()) {
      setWithdrawError('شماره کارت واریزی را وارد کنید.');
      return;
    }
    setSubmitting(true);
    const newDeposit = depositBalance - amount;
    api
      .patch<Member>(`/api/members/${memberId}`, {
        ...member,
        deposit: newDeposit,
      })
      .then(() => {
        const now = new Date().toISOString();
        const dateStr = now.slice(0, 10);
        return api
          .post<FundLogEntry>('/api/fundLog', {
            type: 'out',
            amount,
            memberId,
            refType: 'withdrawal_transfer',
            refId: undefined,
            date: dateStr,
            note: `واریز به حساب - کارت: ${transferCard.trim()} - مبلغ: ${amount}`,
            createdAt: now,
          })
          .then(() => {});
      })
      .then(() => {
        toast.success('برداشت از سپرده و ثبت واریز به حساب انجام شد.');
        setWithdrawModalOpen(false);
        loadMember();
      })
      .catch(() => toast.error('خطا در ثبت برداشت.'))
      .finally(() => setSubmitting(false));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-white/80">در حال بارگذاری...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-white/70">عضو یافت نشد.</p>
        <Link
          href="/admin/deposits"
          className="inline-block text-sm text-white/90 hover:text-white underline"
        >
          بازگشت به لیست سپرده‌ها
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/deposits"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 transition-colors"
            aria-label="بازگشت به لیست سپرده‌ها"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-semibold text-white">جزئیات سپرده</h1>
        </div>
      </div>

      {/* اطلاعات عضو */}
      <Card variant="glass">
        <h2 className="text-sm font-medium text-white/90 mb-3">اطلاعات عضو</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-white/60">نام:</span>
            <span className="mr-2 text-white">{member.fullName}</span>
          </div>
          <div>
            <span className="text-white/60">شماره تماس:</span>
            <span className="mr-2 text-white">{member.phone}</span>
          </div>
          <div>
            <span className="text-white/60">سپرده ماهانه (قراردادی):</span>
            <span className="mr-2 text-white font-medium">{formatCurrency(member.monthlyAmount)}</span>
          </div>
        </div>
      </Card>

      {/* موجودی سپرده */}
      <Card variant="glass">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h2 className="text-sm font-medium text-white/90 mb-2">موجودی سپرده</h2>
            <p className="text-lg font-semibold text-white">{formatCurrency(depositBalance)}</p>
            <p className="text-xs text-white/50 mt-1">
              جمع واریزها: {formatCurrency(totalDeposits)} — {deposits.length} مورد واریز
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={openWithdrawModal}
            disabled={depositBalance <= 0}
            className="shrink-0 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white disabled:opacity-50"
          >
            برداشت از سپرده
          </Button>
        </div>
      </Card>

      {/* مودال برداشت از سپرده */}
      <Modal
        open={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        title="برداشت از سپرده"
        size="lg"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setWithdrawModalOpen(false)}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleWithdrawSubmit}
              loading={submitting}
              className="rounded-xl bg-white/25 hover:bg-white/35 border border-white/30 text-white"
            >
              ثبت برداشت
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {withdrawError && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-3 py-2">{withdrawError}</p>
          )}
          <div className="space-y-3">
            <span className="block text-xs text-white/80 mb-2">نوع برداشت:</span>
            <div className="flex flex-wrap gap-4">
              {hasLoan && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="withdrawType"
                    checked={withdrawType === 'deduct_loan'}
                    onChange={() => setWithdrawType('deduct_loan')}
                    className="border-white/30 bg-white/10 text-white focus:ring-white/40"
                  />
                  <span className="text-sm text-white/90">کسر از وام</span>
                </label>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="withdrawType"
                  checked={withdrawType === 'transfer'}
                  onChange={() => setWithdrawType('transfer')}
                  className="border-white/30 bg-white/10 text-white focus:ring-white/40"
                />
                <span className="text-sm text-white/90">واریز به حساب</span>
              </label>
            </div>

            {withdrawType === 'deduct_loan' && hasLoan && (
              <div className="mr-6 mt-3">
                <FormattedNumberInput
                  label="مبلغ (تومان)"
                  value={deductLoanAmount}
                  onChange={setDeductLoanAmount}
                  placeholder="۰"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                  labelClassName="text-white/80"
                />
                <p className="text-xs text-white/50 mt-1">
                  این مبلغ از موجودی سپرده و از مانده وام کسر می‌شود. حداکثر: {formatCurrency(maxDeductAmount)} (کمترین بین سپرده و مانده وام)
                </p>
              </div>
            )}

            {withdrawType === 'transfer' && (
              <div className="mr-6 mt-3 space-y-2">
                <FormattedNumberInput
                  label="مبلغ واریز (تومان)"
                  value={transferAmount}
                  onChange={setTransferAmount}
                  placeholder="۰"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                  labelClassName="text-white/80"
                />
                <p className="text-xs text-white/50">حداکثر: {formatCurrency(depositBalance)}</p>
                <Input
                  label="شماره کارت واریزی"
                  value={transferCard}
                  onChange={(e) => setTransferCard(e.target.value)}
                  placeholder="مثال: ۶۰۳۷۹۹۷۳۰۰۰۰۰۰۰۰"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                  labelClassName="text-white/80"
                />
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* لیست پرداخت‌های ماهانه (سپرده‌ها) */}
      <Card variant="glass">
        <h2 className="text-sm font-medium text-white/90 mb-3">پرداخت‌های ماهانه (واریزها)</h2>
        {deposits.length === 0 ? (
          <p className="text-xs text-white/50 py-4">هنوز واریزی ثبت نشده است.</p>
        ) : (
          <div className="space-y-2">
            {deposits.map((p, index) => {
              const pairedRepayment = allPayments.find(
                (x) => x.type === 'repayment' && x.date === p.date
              );
              const isExcess = isExcessFromRepayment(p);
              const hasReceipt = !!p.receiptImagePath;
              const receiptPath = p.receiptImagePath;
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap justify-between items-center gap-2 py-2 border-b border-white/10 last:border-0"
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
                    <span className="text-xs text-white/50 w-6">{deposits.length - index}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-white/20 text-white/90">
                      سپرده
                    </span>
                    {isExcess && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/80 text-white">
                        بقیقه (مازاد وام به سپرده)
                      </span>
                    )}
                    <span className="text-xs text-white/70">
                      {formatDateShort(p.date)}
                      {p.note && !isExcess ? ` — ${p.note}` : ''}
                    </span>
                    {pairedRepayment && (
                      <span className="text-xs text-white/50">
                        ({formatCurrency(pairedRepayment.amount)} — کسر از وام)
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">{formatCurrency(p.amount)}</span>
                </div>
              );
            })}
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

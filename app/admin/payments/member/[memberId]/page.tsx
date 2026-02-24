'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { Card, Button, Input, Modal, FormattedNumberInput, DatePickerShamsi } from '@/components/ui';
import { formatCurrency, formatDateShort } from '@/utils/format';
import type { Payment, Member } from '@/types';

/** یک ردیف نمایش: یا یک پرداخت تکی یا یک واریز ترکیبی (سپرده + قسط هم‌تاریخ) */
type DisplayRow =
  | { kind: 'single'; payment: Payment }
  | {
      kind: 'combined';
      date: string;
      totalAmount: number;
      repaymentAmount: number;
      contributionAmount: number;
      note?: string;
      receiptImagePath?: string;
      /** بخش سپرده از مازاد وام به سپرده (بقیقه) است */
      isExcessContribution?: boolean;
    };

export default function MemberPaymentsDetailPage() {
  const params = useParams();
  const memberId = typeof params?.memberId === 'string' ? params.memberId : '';
  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', date: '', type: 'contribution' as 'contribution' | 'repayment', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [receiptImageModal, setReceiptImageModal] = useState<string | null>(null);
  const [apiBase, setApiBase] = useState('');

  const openEditModal = (p: Payment) => {
    setEditingPayment(p);
    setEditForm({
      amount: String(p.amount),
      date: p.date,
      type: p.type,
      note: p.note ?? '',
    });
  };

  const closeEditModal = () => {
    setEditingPayment(null);
    setSubmitting(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    const amount = Number(editForm.amount.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) return;
    setSubmitting(true);
    api
      .patch<Payment>(`/api/payments/${editingPayment.id}`, {
        amount,
        date: editForm.date,
        type: editForm.type,
        note: editForm.note.trim() || undefined,
      })
      .then((res) => {
        setPayments((prev) =>
          prev.map((p) => (p.id === editingPayment.id ? { ...res.data, createdAt: p.createdAt } : p)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
        closeEditModal();
      })
      .catch(() => {})
      .finally(() => setSubmitting(false));
  };

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
        const list = (res.data || []).filter((p) => p.memberId === memberId);
        setPayments(
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      })
      .catch(() => setPayments([]));
  }, [memberId]);

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  /** پرداخت‌های هم‌تاریخ سپرده+قسط را یک واریز نمایش می‌دهیم؛ بقیه هر کدام یک ردیف */
  const displayRows = useMemo(() => {
    const byDate = new Map<string, Payment[]>();
    for (const p of payments) {
      const list = byDate.get(p.date) ?? [];
      list.push(p);
      byDate.set(p.date, list);
    }
    const rows: DisplayRow[] = [];
    const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
    for (const date of dates) {
      const sameDate = byDate.get(date) ?? [];
      const repayment = sameDate.find((x) => x.type === 'repayment');
      const contribution = sameDate.find((x) => x.type === 'contribution');
      if (repayment && contribution && repayment.id !== contribution.id) {
        rows.push({
          kind: 'combined',
          date,
          totalAmount: repayment.amount + contribution.amount,
          repaymentAmount: repayment.amount,
          contributionAmount: contribution.amount,
          note: repayment.note || contribution.note,
          receiptImagePath: repayment.receiptImagePath || contribution.receiptImagePath,
          isExcessContribution: contribution.note?.includes('مازاد وام به سپرده') ?? false,
        });
      } else {
        for (const p of sameDate) {
          rows.push({ kind: 'single', payment: p });
        }
      }
    }
    return rows.sort((a, b) => {
      const dateA = a.kind === 'single' ? a.payment.date : a.date;
      const dateB = b.kind === 'single' ? b.payment.date : b.date;
      return dateB.localeCompare(dateA);
    });
  }, [payments]);

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
          href="/admin/payments"
          className="inline-block text-sm text-white/90 hover:text-white underline"
        >
          بازگشت به لیست پرداخت‌ها
        </Link>
      </div>
    );
  }

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
          <h1 className="text-base font-semibold text-white">ریز پرداخت‌ها</h1>
        </div>
      </div>

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
        </div>
      </Card>

      <Card variant="glass">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-medium text-white/90">تمام پرداخت‌ها</h2>
          <span className="text-xs text-white/70">
            جمع {formatCurrency(totalAmount)} — {displayRows.length} واریز
          </span>
        </div>
        {displayRows.length === 0 ? (
          <p className="text-xs text-white/50 py-4">پرداختی ثبت نشده است.</p>
        ) : (
          <div className="space-y-2">
            {displayRows.map((row, index) => {
              if (row.kind === 'combined') {
                const combinedReceiptPath = row.receiptImagePath;
                return (
                  <div
                    key={`combined-${row.date}-${index}`}
                    className="flex flex-wrap justify-between items-center gap-2 py-2 border-b border-white/10 last:border-0"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {combinedReceiptPath && apiBase && (
                        <button
                          type="button"
                          onClick={() => setReceiptImageModal(combinedReceiptPath)}
                          className="shrink-0 w-8 h-8 rounded overflow-hidden border border-white/20 bg-black/20 hover:ring-2 hover:ring-white/40 focus:outline-none focus:ring-2 focus:ring-white/50"
                          aria-label="مشاهده رسید"
                        >
                          <img
                            src={`${apiBase}/uploads/${combinedReceiptPath}`}
                            alt="رسید"
                            className="w-full h-full object-contain"
                          />
                        </button>
                      )}
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-white/25 text-white">
                        سپرده و قسط
                      </span>
                      {row.isExcessContribution && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/80 text-white">
                          مازاد به سپرده
                        </span>
                      )}
                      <span className="text-xs text-white/70">{formatDateShort(row.date)}</span>
                      <span className="text-xs text-white/50">
                        ({formatCurrency(row.repaymentAmount)} قسط، {formatCurrency(row.contributionAmount)} سپرده
                        {row.isExcessContribution ? ' — بقیقه' : ''})
                      </span>
                    </div>
                    <span className="text-sm font-medium text-white">{formatCurrency(row.totalAmount)}</span>
                  </div>
                );
              }
              const p = row.payment;
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
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        p.type === 'contribution' ? 'bg-emerald-500/80 text-white' : 'bg-slate-500/80 text-white'
                      }`}
                    >
                      {p.type === 'contribution' ? 'سپرده / واریز' : 'بازپرداخت'}
                    </span>
                    {p.type === 'contribution' && p.note?.includes('مازاد وام به سپرده') && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/80 text-white">
                        مازاد به سپرده
                      </span>
                    )}
                    <span className="text-xs text-white/70">{formatDateShort(p.date)}</span>
                    {p.note && (
                      <span className="text-xs text-white/50"> — {p.note}</span>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mr-1 text-xs bg-white/15 hover:bg-white/25 text-white/90 border-white/20"
                      onClick={() => openEditModal(p)}
                    >
                      ویرایش
                    </Button>
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

      <Modal
        open={!!editingPayment}
        onClose={closeEditModal}
        title="ویرایش پرداخت"
        size="lg"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={closeEditModal}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              form="edit-payment-form"
              loading={submitting}
              className="rounded-xl bg-white/25 hover:bg-white/35 border border-white/30 text-white"
            >
              ذخیره
            </Button>
          </>
        }
      >
        <form
          id="edit-payment-form"
          onSubmit={handleEditSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          noValidate
        >
          <FormattedNumberInput
            label="مبلغ (تومان)"
            value={editForm.amount}
            onChange={(v) => setEditForm((prev) => ({ ...prev, amount: v }))}
            placeholder="۰"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
            labelClassName="text-white/80"
          />
          <DatePickerShamsi
            label="تاریخ پرداخت"
            value={editForm.date}
            onChange={(v) => setEditForm((prev) => ({ ...prev, date: v }))}
            placeholder="انتخاب تاریخ"
          />
          <div className="sm:col-span-2">
            <label className="block text-xs text-white/80 mb-1.5">نوع واریزی</label>
            <select
              value={editForm.type}
              onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value as 'contribution' | 'repayment' }))}
              className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <option value="contribution" className="bg-slate-800 text-white">سپرده / واریز</option>
              <option value="repayment" className="bg-slate-800 text-white">بازپرداخت</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Input
              label="توضیح (اختیاری)"
              value={editForm.note}
              onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="مثال: سهم ماه فروردین"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
              labelClassName="text-white/80"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

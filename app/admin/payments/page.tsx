'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { api } from '@/lib/axios';
import { getClientApiBase } from '@/lib/apiConfig';
import { Card, Button, Input, Modal, FormattedNumberInput, DatePickerShamsi, MemberSearchSelect } from '@/components/ui';
import { formatCurrency, formatDateShort } from '@/utils/format';
import type { Payment, Member, Loan, ReceiptSubmission } from '@/types';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
function toEnglishDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (c) => String(PERSIAN_DIGITS.indexOf(c)));
}
function normalizeSearch(str: string): string {
  return toEnglishDigits(str).replace(/\s+/g, ' ').trim();
}

type PaymentTypeOption = 'contribution' | 'repayment' | 'contribution_repayment';

interface PaymentFormData {
  memberId: string;
  amount: string;
  date: string;
  type: PaymentTypeOption;
  note: string;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    memberId: string;
    memberName: string;
    date: string;
    note?: string;
    installment: number;
    contributionAmount: number;
  } | null>(null);
  const [overRepayModalOpen, setOverRepayModalOpen] = useState(false);
  const [pendingOverRepay, setPendingOverRepay] = useState<{
    memberId: string;
    amount: number;
    date: string;
    note?: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'contribution' | 'repayment'>('all');
  const [receiptSubmissions, setReceiptSubmissions] = useState<ReceiptSubmission[]>([]);
  const [approveReceiptId, setApproveReceiptId] = useState<string | null>(null);
  const [approveAmount, setApproveAmount] = useState('');
  const [approveDate, setApproveDate] = useState('');
  const [approveType, setApproveType] = useState<PaymentTypeOption>('contribution');
  const [approving, setApproving] = useState(false);
  const [rejectReceiptId, setRejectReceiptId] = useState<string | null>(null);
  const [rejectMessage, setRejectMessage] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [approveOverRepayModalOpen, setApproveOverRepayModalOpen] = useState(false);
  /** مودال تأیید «سپرده / قسط ماهانه» برای تایید رسید */
  const [approveInstallmentModalOpen, setApproveInstallmentModalOpen] = useState(false);
  const [approvePendingInstallment, setApprovePendingInstallment] = useState<{
    memberName: string;
    installment: number;
    contributionAmount: number;
  } | null>(null);
  /** آدرس پایه API برای لود عکس رسید — در کلاینت از host فعلی گرفته می‌شود تا روی موبایل (از طریق IP شبکه) درست کار کند */
  const [apiBase, setApiBase] = useState('');
  const [receiptImageModal, setReceiptImageModal] = useState<{ imagePath: string; memberName: string } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    defaultValues: { type: 'contribution', note: '' },
  });

  function loadData() {
    setLoading(true);
    Promise.all([
      api.get<Payment[]>('/api/payments'),
      api.get<Member[]>('/api/members'),
      api.get<Loan[]>('/api/loans'),
      api.get<ReceiptSubmission[]>('/api/receiptSubmissions').catch(() => ({ data: [] })),
    ])
      .then(([pRes, mRes, lRes, rRes]) => {
        setPayments(pRes.data);
        setMembers(mRes.data);
        setLoans(lRes.data || []);
        setReceiptSubmissions(Array.isArray(rRes.data) ? rRes.data : []);
      })
      .catch(() => toast.error('خطا در بارگذاری داده‌ها.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setApiBase(getClientApiBase());
  }, []);

  useEffect(() => {
    if (addModalOpen) {
      reset({
        memberId: '',
        amount: '',
        date: '',
        type: 'contribution',
        note: '',
      });
    }
  }, [addModalOpen, reset]);

  function toNum(v: string) {
    const n = Number(v);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  }

  function onAddPayment(data: PaymentFormData) {
    const amount = toNum(data.amount);
    if (amount <= 0) {
      toast.error('مبلغ را وارد کنید.');
      return;
    }
    if (!data.memberId?.trim()) {
      toast.error('عضو را انتخاب کنید.');
      return;
    }
    if (!data.date?.trim()) {
      toast.error('تاریخ را انتخاب کنید.');
      return;
    }
    const memberId = data.memberId.trim();
    const activeLoans = (loans || []).filter((l) => l.memberId === memberId && l.status === 'active');
    const firstLoan = activeLoans[0];
    const installment = firstLoan
      ? Math.floor(firstLoan.amount / Math.max(1, firstLoan.dueMonths))
      : 0;

    if (data.type === 'contribution') {
      if (activeLoans.length > 0) {
        if (amount > installment && installment > 0) {
          toast.error('باید نوع را «سپرده / قسط ماهانه» انتخاب کنید.');
          return;
        }
        toast.error('این شخص وام تسویه‌نشده دارد. نوع را عوض کنید.');
        return;
      }
    } else if (data.type === 'repayment') {
      if (activeLoans.length === 0) {
        toast.error('نمی‌توانید این نوع را انتخاب کنید؛ این شخص هیچ وام ثبت‌شده‌ای ندارد.');
        return;
      }
      if (amount > installment && installment > 0) {
        setPendingOverRepay({
          memberId,
          amount,
          date: data.date.trim(),
          note: data.note?.trim() || undefined,
        });
        setOverRepayModalOpen(true);
        return;
      }
      if (amount < installment && installment > 0) {
        toast.warning(
          `مبلغ قسط ماهانه این شخص ${formatCurrency(installment)} بوده ولی ${formatCurrency(amount)} ثبت می‌شود.`
        );
      }
    } else if (data.type === 'contribution_repayment') {
      if (activeLoans.length === 0) {
        toast.error('این شخص هیچ وام ثبت‌شده‌ای ندارد.');
        return;
      }
      if (amount < installment) {
        toast.error('این روش را نمی‌توانید انتخاب کنید؛ مبلغ کمتر از قسط ماهانه است.');
        return;
      }
      const contributionAmount = amount - installment;
      const memberName = members.find((m) => m.id === memberId)?.fullName || 'این شخص';
      setPendingPayment({
        memberId,
        memberName,
        date: data.date.trim(),
        note: data.note?.trim() || undefined,
        installment,
        contributionAmount,
      });
      setConfirmModalOpen(true);
      return;
    }

    setSubmitting(true);
    const date = data.date.trim();
    const note = data.note?.trim() || undefined;
    const createdAt = new Date().toISOString();

    const paymentType = data.type === 'contribution' ? 'contribution' : 'repayment';
    api
      .post<Payment>('/api/payments', {
        memberId,
        amount,
        date,
        type: paymentType,
        note,
        createdAt,
      })
      .then(() =>
        api.get<Member>(`/api/members/${memberId}`).then((mRes) => {
          const m = mRes.data;
          if (paymentType === 'contribution') {
            return api.patch(`/api/members/${memberId}`, {
              ...m,
              deposit: (m.deposit ?? 0) + amount,
            });
          }
          return api.patch(`/api/members/${memberId}`, {
            ...m,
            loanBalance: Math.max(0, (m.loanBalance ?? 0) - amount),
          });
        })
      )
      .then(() => {
        toast.success('پرداخت با موفقیت ثبت شد.');
        setAddModalOpen(false);
        loadData();
      })
      .catch(() => toast.error('خطا در ثبت پرداخت.'))
      .finally(() => setSubmitting(false));
  }

  function confirmPendingPayment() {
    if (!pendingPayment) return;
    setSubmitting(true);
    const { memberId, date, note, installment, contributionAmount } = pendingPayment;
    const createdAt = new Date().toISOString();
    api
      .post<Payment>('/api/payments', {
        memberId,
        amount: installment,
        date,
        type: 'repayment',
        note: note ? `قسط — ${note}` : 'قسط ماهانه',
        createdAt,
      })
      .then(() =>
        api.get<Member>(`/api/members/${memberId}`).then((mRes) =>
          api.patch(`/api/members/${memberId}`, {
            ...mRes.data,
            loanBalance: Math.max(0, (mRes.data.loanBalance ?? 0) - installment),
          })
        )
      )
      .then(() => {
        if (contributionAmount <= 0) {
          toast.success('قسط با موفقیت ثبت شد.');
          setConfirmModalOpen(false);
          setPendingPayment(null);
          setAddModalOpen(false);
          loadData();
          setSubmitting(false);
          return;
        }
        return api
          .post<Payment>('/api/payments', {
            memberId,
            amount: contributionAmount,
            date,
            type: 'contribution',
            note: note ? `سپرده — ${note}` : 'سپرده',
            createdAt: new Date().toISOString(),
          })
          .then(() =>
            api.get<Member>(`/api/members/${memberId}`).then((mRes) =>
              api.patch(`/api/members/${memberId}`, {
                ...mRes.data,
                deposit: (mRes.data.deposit ?? 0) + contributionAmount,
              })
            )
          )
          .then(() => {
            toast.success('قسط و سپرده با موفقیت ثبت شد.');
            setConfirmModalOpen(false);
            setPendingPayment(null);
            setAddModalOpen(false);
            loadData();
          });
      })
      .catch(() => toast.error('خطا در ثبت پرداخت.'))
      .finally(() => setSubmitting(false));
  }

  function confirmOverRepay() {
    if (!pendingOverRepay) return;
    const member = members.find((m) => m.id === pendingOverRepay.memberId);
    const loanBalance = member?.loanBalance ?? 0;
    const repaymentAmount = Math.min(pendingOverRepay.amount, loanBalance);
    const contributionAmount = pendingOverRepay.amount - repaymentAmount;

    setSubmitting(true);
    const { memberId, amount, date, note } = pendingOverRepay;
    const createdAt = new Date().toISOString();

    const doRepayment = (): Promise<void> =>
      repaymentAmount > 0
        ? api
            .post<Payment>('/api/payments', {
              memberId,
              amount: repaymentAmount,
              date,
              type: 'repayment',
              note: note ? `بازپرداخت — ${note}` : (contributionAmount > 0 ? 'بازپرداخت وام (مازاد به سپرده)' : 'بازپرداخت'),
              createdAt,
            })
            .then(() => {})
        : Promise.resolve();

    const doContribution = (): Promise<void> =>
      contributionAmount > 0
        ? api
            .post<Payment>('/api/payments', {
              memberId,
              amount: contributionAmount,
              date,
              type: 'contribution',
              note: note ? `مازاد وام به سپرده — ${note}` : 'مازاد وام به سپرده',
              createdAt: new Date().toISOString(),
            })
            .then(() => {})
        : Promise.resolve();

    doRepayment()
      .then(() => doContribution())
      .then(() =>
        api.get<Member>(`/api/members/${memberId}`).then((mRes) => {
          const m = mRes.data;
          return api.patch(`/api/members/${memberId}`, {
            ...m,
            loanBalance: Math.max(0, (m.loanBalance ?? 0) - repaymentAmount),
            deposit: (m.deposit ?? 0) + contributionAmount,
          });
        })
      )
      .then(() => {
        toast.success(
          contributionAmount > 0
            ? `بازپرداخت ${repaymentAmount.toLocaleString('fa-IR')} و مازاد ${contributionAmount.toLocaleString('fa-IR')} به سپرده ثبت شد.`
            : 'پرداخت با موفقیت ثبت شد.'
        );
        setOverRepayModalOpen(false);
        setPendingOverRepay(null);
        setAddModalOpen(false);
        loadData();
      })
      .catch(() => toast.error('خطا در ثبت پرداخت.'))
      .finally(() => setSubmitting(false));
  }

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.fullName || '—';

  const filteredPayments = useMemo(() => {
    let list = payments;
    if (typeFilter !== 'all') list = list.filter((p) => p.type === typeFilter);
    const q = normalizeSearch(searchQuery);
    if (!q) {
      return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const filtered = list.filter((p) => {
      const name = getMemberName(p.memberId);
      const nameMatch = normalizeSearch(name).includes(q);
      const dateMatch = normalizeSearch(p.date).includes(q);
      const typeText = p.type === 'contribution' ? 'سپرده واریز' : 'بازپرداخت';
      const typeMatch = normalizeSearch(typeText).includes(q);
      const noteMatch = p.note && normalizeSearch(p.note).includes(q);
      const numQuery = q.replace(/\D/g, '');
      const amountMatch = numQuery.length > 0 && String(p.amount).includes(numQuery);
      return nameMatch || dateMatch || typeMatch || noteMatch || amountMatch;
    });
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [payments, searchQuery, typeFilter, members]);

  /** یک کارت به‌ازای هر عضو (گروه‌بندی بر اساس memberId) */
  const pendingReceipts = useMemo(
    () => (receiptSubmissions || []).filter((r) => r.status === 'pending'),
    [receiptSubmissions]
  );

  const canSubmitApproveReceipt = approveReceiptId && toNum(approveAmount) > 0 && approveDate.trim().length > 0;

  function handleApproveReceipt() {
    if (!approveReceiptId || !canSubmitApproveReceipt) return;
    const amount = toNum(approveAmount);
    setApproving(true);
    api
      .post(`/api/receipt-submissions/${approveReceiptId}/approve`, {
        amount,
        date: approveDate.trim(),
        type: approveType === 'contribution_repayment' ? 'contribution_repayment' : approveType,
      })
      .then(() => {
        toast.success('پرداخت ثبت شد و پیام به عضو و گروه ادمین ارسال شد.');
        setApproveReceiptId(null);
        setApproveAmount('');
        setApproveDate('');
        setApproveType('contribution');
        setApproveOverRepayModalOpen(false);
        setApproveInstallmentModalOpen(false);
        setApprovePendingInstallment(null);
        loadData();
      })
      .catch((err) => {
        const msg = err?.response?.data?.message;
        toast.error(msg && typeof msg === 'string' ? msg : 'خطا در تایید رسید.');
      })
      .finally(() => setApproving(false));
  }

  /** اعتبارسنجی مانند مودال ثبت پرداخت جدید؛ در صورت نیاز مودال تأیید نمایش می‌دهد */
  function submitApproveReceiptClick() {
    if (!approveReceiptId || !canSubmitApproveReceipt) return;
    const amount = toNum(approveAmount);
    const rec = receiptSubmissions.find((r) => r.id === approveReceiptId);
    if (!rec) return;
    const memberId = rec.memberId;
    const activeLoans = (loans || []).filter((l) => l.memberId === memberId && l.status === 'active');
    const firstLoan = activeLoans[0];
    const installment = firstLoan ? Math.floor(firstLoan.amount / Math.max(1, firstLoan.dueMonths)) : 0;

    if (approveType === 'contribution') {
      if (activeLoans.length > 0) {
        if (amount > installment && installment > 0) {
          toast.error('باید نوع را «سپرده / قسط ماهانه» انتخاب کنید.');
          return;
        }
        toast.error('این شخص وام تسویه‌نشده دارد. نوع را عوض کنید.');
        return;
      }
    } else if (approveType === 'repayment') {
      if (activeLoans.length === 0) {
        toast.error('نمی‌توانید این نوع را انتخاب کنید؛ این شخص هیچ وام ثبت‌شده‌ای ندارد.');
        return;
      }
      if (amount > installment && installment > 0) {
        setApproveOverRepayModalOpen(true);
        return;
      }
      if (amount < installment && installment > 0) {
        toast.warning(
          `مبلغ قسط ماهانه این شخص ${formatCurrency(installment)} بوده ولی ${formatCurrency(amount)} ثبت می‌شود.`
        );
      }
    } else if (approveType === 'contribution_repayment') {
      if (activeLoans.length === 0) {
        toast.error('این شخص هیچ وام ثبت‌شده‌ای ندارد.');
        return;
      }
      if (amount < installment) {
        toast.error('این روش را نمی‌توانید انتخاب کنید؛ مبلغ کمتر از قسط ماهانه است.');
        return;
      }
      const memberName = getMemberName(memberId);
      setApprovePendingInstallment({
        memberName,
        installment,
        contributionAmount: amount - installment,
      });
      setApproveInstallmentModalOpen(true);
      return;
    }
    handleApproveReceipt();
  }

  function handleRejectReceipt() {
    if (!rejectReceiptId) return;
    setRejecting(true);
    const message = rejectMessage.trim() || 'رسید شما تأیید نشد. در صورت نیاز مجدداً ارسال کنید.';
    api
      .post(`/api/receipt-submissions/${rejectReceiptId}/reject`, { message })
      .then(() => {
        toast.success('رسید رد شد و پیام به عضو ارسال شد.');
        setRejectReceiptId(null);
        setRejectMessage('');
        loadData();
      })
      .catch(() => toast.error('خطا در رد رسید.'))
      .finally(() => setRejecting(false));
  }

  const paymentsByMember = useMemo(() => {
    const map = new Map<string, { memberId: string; memberName: string; payments: Payment[] }>();
    for (const p of filteredPayments) {
      const existing = map.get(p.memberId);
      const name = getMemberName(p.memberId);
      if (existing) {
        existing.payments.push(p);
      } else {
        map.set(p.memberId, { memberId: p.memberId, memberName: name, payments: [p] });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const aLatest = a.payments[0]?.createdAt ?? '';
      const bLatest = b.payments[0]?.createdAt ?? '';
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });
  }, [filteredPayments, members]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-white">پرداخت‌ها</h1>
        <Button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white"
        >
          ثبت پرداخت
        </Button>
      </div>

      {/* جستجو و فیلتر */}
      <div className="flex flex-wrap items-stretch gap-2">
        <div className="flex-1 min-w-[200px] rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-white/60 shrink-0" aria-hidden>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام، مبلغ، تاریخ، نوع..."
              className="w-full min-w-0 bg-transparent text-white placeholder:text-white/50 text-sm py-1.5 focus:outline-none"
              aria-label="جستجو در پرداخت‌ها"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="shrink-0 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="پاک کردن جستجو"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 overflow-hidden">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'contribution' | 'repayment')}
            className="h-full min-h-[42px] bg-transparent text-white text-sm px-4 py-2 pr-8 focus:outline-none focus:ring-0 appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.6)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 0.5rem center', backgroundSize: '1.25rem' }}
            aria-label="فیلتر نوع پرداخت"
          >
            <option value="all" className="bg-slate-800 text-white">همه</option>
            <option value="contribution" className="bg-slate-800 text-white">سپرده / واریز</option>
            <option value="repayment" className="bg-slate-800 text-white">بازپرداخت</option>
          </select>
        </div>
      </div>

      {/* رسیدهای در انتظار تایید (پرداخت شخصی از ربات) */}
      {pendingReceipts.length > 0 && (
        <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 overflow-hidden">
          <h2 className="text-sm font-medium text-white/90 px-4 py-3 border-b border-white/10">
            رسیدهای در انتظار تایید
          </h2>
          <p className="text-xs text-white/60 px-4 py-1">
            اعضا از طریق ربات تلگرام (پرداخت شخصی) رسید فرستاده‌اند. عکس را ببینید و در صورت تایید، مبلغ را وارد کرده و تایید کنید.
          </p>
          <div className="p-3 space-y-2">
            {pendingReceipts.map((rec) => (
              <Card key={rec.id} variant="glass" className="overflow-hidden py-2 px-3">
                <div className="flex flex-row items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => apiBase && setReceiptImageModal({ imagePath: rec.imagePath, memberName: rec.memberName })}
                    className="shrink-0 rounded-lg overflow-hidden border border-white/20 bg-black/20 w-12 h-12 cursor-pointer hover:ring-2 hover:ring-white/40 transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
                    aria-label={`بزرگنمایی رسید ${rec.memberName}`}
                  >
                    {apiBase && (
                      <img
                        src={`${apiBase}/uploads/${rec.imagePath}`}
                        alt={`رسید ${rec.memberName}`}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </button>
                  <div className="min-w-0 flex-1 flex flex-row items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{rec.memberName}</span>
                    <span className="text-xs text-white/60">
                      ارسال: {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('fa-IR') : '—'}
                    </span>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setRejectReceiptId(rec.id)}
                      className="rounded-xl bg-red-500/90 hover:bg-red-500 text-white border-0"
                    >
                      رد
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setApproveReceiptId(rec.id);
                        setApproveAmount('');
                        setApproveDate('');
                        setApproveType('contribution');
                      }}
                      className="rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-white border-0"
                    >
                      تایید
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-medium text-white/90">لیست پرداخت‌ها</h2>
          <span className="text-xs text-white/70">
            {loading ? '—' : `${paymentsByMember.length} عضو`}
          </span>
        </div>
        {loading ? (
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-4 inline-block">
            <p className="text-sm text-white/80">در حال بارگذاری...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paymentsByMember.map(({ memberId, memberName, payments: memberPayments }) => {
              const total = memberPayments.reduce((s, p) => s + p.amount, 0);
              const latest = memberPayments[0];
              return (
                <Card
                  key={memberId}
                  variant="glass"
                  onClick={() => router.push(`/admin/payments/member/${memberId}`)}
                >
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium text-white">{memberName}</p>
                      <p className="text-xs text-white/60">
                        {memberPayments.length} مورد پرداخت — جمع {formatCurrency(total)}
                        {latest && ` — آخرین: ${formatDateShort(latest.date)}`}
                      </p>
                    </div>
                    <span className="text-xs text-white/80 shrink-0">جزئیات</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        {!loading && payments.length === 0 && (
          <p className="text-sm text-white/60 text-center py-6">پرداختی ثبت نشده است.</p>
        )}
        {!loading && payments.length > 0 && paymentsByMember.length === 0 && (
          <p className="text-sm text-white/60 text-center py-6">نتیجه‌ای برای جستجو یافت نشد.</p>
        )}
      </div>

      {/* مودال ثبت پرداخت */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="ثبت پرداخت جدید"
        size="lg"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAddModalOpen(false)}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              form="payment-form"
              loading={submitting}
              className="rounded-xl bg-white/25 hover:bg-white/35 border border-white/30 text-white"
            >
              ثبت پرداخت
            </Button>
          </>
        }
      >
        <form
          id="payment-form"
          onSubmit={handleSubmit(onAddPayment)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          noValidate
        >
          <div className="sm:col-span-2">
            <Controller
              name="memberId"
              control={control}
              rules={{ required: 'عضو را انتخاب کنید.' }}
              render={({ field }) => (
                <MemberSearchSelect
                  label="عضو"
                  value={field.value}
                  onChange={field.onChange}
                  members={members}
                  placeholder="جستجو نام یا شماره تماس عضو..."
                  labelClassName="text-white/80"
                  error={errors.memberId?.message}
                />
              )}
            />
          </div>
          <Controller
            name="amount"
            control={control}
            rules={{ required: 'مبلغ را وارد کنید.' }}
            render={({ field }) => (
              <FormattedNumberInput
                label="مبلغ (تومان)"
                value={field.value}
                onChange={field.onChange}
                placeholder="۰"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                labelClassName="text-white/80"
                error={errors.amount?.message}
              />
            )}
          />
          <Controller
            name="date"
            control={control}
            rules={{ required: 'تاریخ را انتخاب کنید.' }}
            render={({ field }) => (
              <DatePickerShamsi
                label="تاریخ پرداخت"
                value={field.value}
                onChange={field.onChange}
                placeholder="انتخاب تاریخ"
                error={errors.date?.message}
              />
            )}
          />
          <div className="sm:col-span-2">
            <label className="block text-xs text-white/80 mb-1.5">نوع واریزی</label>
            <select
              {...register('type')}
              className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <option value="contribution" className="bg-slate-800 text-white">سپرده</option>
              <option value="repayment" className="bg-slate-800 text-white">قسط ماهانه</option>
              <option value="contribution_repayment" className="bg-slate-800 text-white">سپرده / قسط ماهانه</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Input
              label="توضیح (اختیاری)"
              {...register('note')}
              placeholder="مثال: سهم ماه فروردین"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
              labelClassName="text-white/80"
            />
          </div>
        </form>
      </Modal>

      {/* مودال تأیید سپرده / قسط ماهانه */}
      <Modal
        open={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setPendingPayment(null);
        }}
        title="تأیید ثبت قسط و سپرده"
        size="sm"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setConfirmModalOpen(false);
                setPendingPayment(null);
              }}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirmPendingPayment}
              loading={submitting}
              className="rounded-xl bg-white/25 hover:bg-white/35 border border-white/30 text-white"
            >
              تایید
            </Button>
          </>
        }
      >
        {pendingPayment && (
          <div className="space-y-3 text-sm text-white/90">
            <p>
              قسط ماهانه این فرد <strong className="text-white">{formatCurrency(pendingPayment.installment)}</strong> است.
            </p>
            <p>
              مبلغ <strong className="text-white">{formatCurrency(pendingPayment.contributionAmount)}</strong> به عنوان سپرده برای <strong className="text-white">{pendingPayment.memberName}</strong> ثبت خواهد شد.
            </p>
            <div className="rounded-xl border border-white/20 bg-white/5 px-3 py-3 text-sm text-white/90">
              <p className="font-medium text-white/95 mb-1">جزئیات وام و سپرده</p>
              <p>
                این تاریخ پرداخت <strong className="text-white">{formatCurrency(pendingPayment.installment + pendingPayment.contributionAmount)}</strong> پرداخت شده که{' '}
                <strong className="text-white">{formatCurrency(pendingPayment.contributionAmount)}</strong> برای سپرده ذخیره شده و{' '}
                <strong className="text-white">{formatCurrency(pendingPayment.installment)}</strong> از مبلغ وام کسر شده است.
              </p>
            </div>
            <p className="text-white/70">آیا تایید می‌کنید؟</p>
          </div>
        )}
      </Modal>

      {/* مودال تأیید: مبلغ بیشتر از قسط — کسر همه از وام */}
      <Modal
        open={overRepayModalOpen}
        onClose={() => {
          setOverRepayModalOpen(false);
          setPendingOverRepay(null);
        }}
        title="تأیید کسر از وام"
        size="sm"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setOverRepayModalOpen(false);
                setPendingOverRepay(null);
              }}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              لغو
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirmOverRepay}
              loading={submitting}
              className="rounded-xl bg-white/25 hover:bg-white/35 border border-white/30 text-white"
            >
              تایید
            </Button>
          </>
        }
      >
        {pendingOverRepay && (() => {
          const member = members.find((m) => m.id === pendingOverRepay.memberId);
          const loanBalance = member?.loanBalance ?? 0;
          const repaymentAmount = Math.min(pendingOverRepay.amount, loanBalance);
          const contributionAmount = pendingOverRepay.amount - repaymentAmount;
          return (
            <div className="space-y-3 text-sm text-white/90">
              <p>
                این مبلغ (<strong className="text-white">{formatCurrency(pendingOverRepay.amount)}</strong>) بیشتر از قسط ماهانه است.
              </p>
              <div className="rounded-xl border border-white/20 bg-white/5 px-3 py-3 text-sm text-white/90">
                <p className="font-medium text-white/95 mb-1">جزئیات</p>
                <p>
                  <strong className="text-white">{formatCurrency(repaymentAmount)}</strong> از وام کسر می‌شود.
                  {contributionAmount > 0 && (
                    <> مازاد <strong className="text-white">{formatCurrency(contributionAmount)}</strong> به سپرده عضو اضافه می‌شود.</>
                  )}
                </p>
              </div>
              <p className="text-white/70">آیا تایید می‌کنید؟ در غیر این صورت گزینه «سپرده / قسط ماهانه» را انتخاب کنید.</p>
            </div>
          );
        })()}
      </Modal>

      {/* مودال بزرگنمایی عکس رسید */}
      <Modal
        open={!!receiptImageModal}
        onClose={() => setReceiptImageModal(null)}
        title={receiptImageModal ? `رسید — ${receiptImageModal.memberName}` : ''}
        size="lg"
        closeOnOverlayClick
        footer={null}
      >
        {receiptImageModal && apiBase && (
          <div className="flex justify-center items-start bg-black/30 rounded-xl p-2 min-h-[200px]">
            <img
              src={`${apiBase}/uploads/${receiptImageModal.imagePath}`}
              alt={`رسید ${receiptImageModal.memberName}`}
              className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
            />
          </div>
        )}
      </Modal>

      {/* مودال تایید رسید — فرم مانند ثبت پرداخت جدید */}
      <Modal
        open={!!approveReceiptId}
        onClose={() => {
          setApproveReceiptId(null);
          setApproveAmount('');
          setApproveDate('');
          setApproveType('contribution');
        }}
        title="ثبت پرداخت (تایید رسید)"
        size="sm"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setApproveReceiptId(null);
                setApproveAmount('');
                setApproveDate('');
                setApproveType('contribution');
              }}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={submitApproveReceiptClick}
              loading={approving}
              disabled={!canSubmitApproveReceipt}
              className="rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ثبت پرداخت و ارسال پیام
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-white/90">
          {/* عکس رسید بالا مودال */}
          {approveReceiptId && apiBase && (() => {
            const rec = receiptSubmissions.find((r) => r.id === approveReceiptId);
            return rec ? (
              <div className="flex justify-center rounded-xl overflow-hidden border border-white/20 bg-black/20 max-h-40">
                <img
                  src={`${apiBase}/uploads/${rec.imagePath}`}
                  alt={`رسید ${rec.memberName}`}
                  className="max-w-full max-h-40 w-auto h-auto object-contain"
                />
              </div>
            ) : null;
          })()}
          <p className="text-white/80">مبلغ، تاریخ و نوع واریز را وارد کنید. پس از ثبت، به عضو در تلگرام و به گروه ادمین پیام ارسال می‌شود.</p>
          <div>
            <label className="block text-xs text-white/80 mb-1.5">مبلغ (تومان) <span className="text-red-400">*</span></label>
            <FormattedNumberInput
              value={approveAmount}
              onChange={setApproveAmount}
              placeholder="۰"
              className="w-full rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <DatePickerShamsi
              label="تاریخ پرداخت"
              value={approveDate}
              onChange={setApproveDate}
              placeholder="انتخاب تاریخ"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-white/80 mb-1.5">نوع واریزی</label>
            <select
              value={approveType}
              onChange={(e) => setApproveType(e.target.value as PaymentTypeOption)}
              className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <option value="contribution" className="bg-slate-800 text-white">سپرده</option>
              <option value="repayment" className="bg-slate-800 text-white">قسط ماهانه</option>
              <option value="contribution_repayment" className="bg-slate-800 text-white">سپرده / قسط ماهانه</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* مودال تأیید: مبلغ بازپرداخت بیشتر از قسط — همه از وام، مازاد به سپرده (تایید رسید) */}
      <Modal
        open={approveOverRepayModalOpen}
        onClose={() => setApproveOverRepayModalOpen(false)}
        title="تأیید کسر از وام (تایید رسید)"
        size="sm"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setApproveOverRepayModalOpen(false)}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setApproveOverRepayModalOpen(false);
                handleApproveReceipt();
              }}
              loading={approving}
              className="rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-white border-0"
            >
              تایید و ثبت پرداخت
            </Button>
          </>
        }
      >
        <p className="text-sm text-white/90">
          این مبلغ بیشتر از قسط ماهانه است. همه مبلغ از وام کسر می‌شود. در صورت بیشتر بودن از مانده وام، مازاد به سپرده عضو اضافه می‌شود. تایید می‌کنید؟
        </p>
      </Modal>

      {/* مودال تأیید سپرده / قسط ماهانه (تایید رسید) */}
      <Modal
        open={approveInstallmentModalOpen}
        onClose={() => {
          setApproveInstallmentModalOpen(false);
          setApprovePendingInstallment(null);
        }}
        title="تأیید ثبت قسط و سپرده (تایید رسید)"
        size="sm"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setApproveInstallmentModalOpen(false);
                setApprovePendingInstallment(null);
              }}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setApproveInstallmentModalOpen(false);
                setApprovePendingInstallment(null);
                handleApproveReceipt();
              }}
              loading={approving}
              className="rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-white border-0"
            >
              تایید و ثبت پرداخت
            </Button>
          </>
        }
      >
        {approvePendingInstallment && (
          <div className="space-y-3 text-sm text-white/90">
            <p>
              قسط ماهانه <strong className="text-white">{formatCurrency(approvePendingInstallment.installment)}</strong> و مبلغ{' '}
              <strong className="text-white">{formatCurrency(approvePendingInstallment.contributionAmount)}</strong> به عنوان سپرده برای{' '}
              <strong className="text-white">{approvePendingInstallment.memberName}</strong> ثبت خواهد شد.
            </p>
            <div className="rounded-xl border border-white/20 bg-white/5 px-3 py-3 text-sm text-white/90">
              <p className="font-medium text-white/95 mb-1">جزئیات وام و سپرده</p>
              <p>
                این تاریخ پرداخت مجموعاً <strong className="text-white">{formatCurrency(approvePendingInstallment.installment + approvePendingInstallment.contributionAmount)}</strong> ثبت می‌شود که{' '}
                <strong className="text-white">{formatCurrency(approvePendingInstallment.contributionAmount)}</strong> برای سپرده و{' '}
                <strong className="text-white">{formatCurrency(approvePendingInstallment.installment)}</strong> از مبلغ وام کسر می‌شود.
              </p>
            </div>
            <p className="text-white/70">آیا تایید می‌کنید؟</p>
          </div>
        )}
      </Modal>

      {/* مودال رد رسید — پیام برای عضو */}
      <Modal
        open={!!rejectReceiptId}
        onClose={() => {
          setRejectReceiptId(null);
          setRejectMessage('');
        }}
        title="رد رسید و ارسال پیام به عضو"
        size="sm"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setRejectReceiptId(null);
                setRejectMessage('');
              }}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRejectReceipt}
              loading={rejecting}
              className="rounded-xl bg-red-500/90 hover:bg-red-500 text-white border-0"
            >
              رد و ارسال پیام
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-white/90">
          <p className="text-white/80">این پیام از طریق ربات تلگرام برای عضو ارسال می‌شود (مثلاً در صورت اشتباه بودن رسید).</p>
          <div>
            <label className="block text-xs text-white/80 mb-1.5">متن پیام به عضو (اختیاری)</label>
            <textarea
              value={rejectMessage}
              onChange={(e) => setRejectMessage(e.target.value)}
              placeholder="مثال: رسید ارسالی قابل تأیید نبود. لطفاً تصویر واضح‌تر ارسال کنید."
              rows={3}
              className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/40 placeholder:text-white/50 resize-y"
            />
            <p className="text-xs text-white/50 mt-1">در صورت خالی گذاشتن، پیام پیش‌فرض ارسال می‌شود.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

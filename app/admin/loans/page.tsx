'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { api } from '@/lib/axios';
import { Card, Button, Input, Modal, FormattedNumberInput, DatePickerShamsi, MemberSearchSelect } from '@/components/ui';
import { formatCurrency, formatDateShort, addMonthsToDate } from '@/utils/format';
import type { Loan, Member, LoanRequest } from '@/types';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
function toEnglishDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (c) => String(PERSIAN_DIGITS.indexOf(c)));
}
function normalizeSearch(str: string): string {
  return toEnglishDigits(str).replace(/\s+/g, ' ').trim();
}

interface LoanFormData {
  memberId: string;
  amount: string;
  date: string;
  dueMonths: string;
  note: string;
}

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [loanSearchQuery, setLoanSearchQuery] = useState('');
  const [waitingSearchQuery, setWaitingSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'settled'>('all');
  const [activeTab, setActiveTab] = useState<'waiting' | 'loans'>('waiting');

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LoanFormData>({
    defaultValues: { note: '', dueMonths: '12' },
  });

  const watchedAmount = watch('amount');
  const watchedDueMonths = watch('dueMonths');
  const monthlyInstallment =
    toNum(watchedAmount) > 0 && toNum(watchedDueMonths) >= 1
      ? Math.floor(toNum(watchedAmount) / Math.max(1, toNum(watchedDueMonths)))
      : 0;

  function loadData() {
    setLoading(true);
    Promise.all([
      api.get<Loan[]>('/api/loans'),
      api.get<Member[]>('/api/members'),
      api.get<LoanRequest[]>('/api/loanRequests'),
    ])
      .then(([lRes, mRes, lrRes]) => {
        setLoans(lRes.data);
        setMembers(mRes.data);
        setLoanRequests(lrRes.data);
      })
      .catch(() => toast.error('خطا در بارگذاری داده‌ها.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (addModalOpen) {
      reset({
        memberId: '',
        amount: '',
        date: '',
        dueMonths: '12',
        note: '',
      });
    }
  }, [addModalOpen, reset]);

  function toNum(v: string) {
    const n = Number(v);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  }

  function onAddLoan(data: LoanFormData) {
    const amount = toNum(data.amount);
    const dueMonths = toNum(data.dueMonths) || 1;
    if (amount <= 0) {
      toast.error('مبلغ وام را وارد کنید.');
      return;
    }
    if (amount > loanCeiling) {
      toast.error(`مبلغ وام نمی‌تواند بیشتر از سقف قابل اعطا (${formatCurrency(loanCeiling)}) باشد.`);
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
    const hasActive = loans.some(
      (l) => l.memberId === memberId && (l.status === 'active' || l.status == null)
    );
    if (hasActive) {
      toast.error('این عضو وام فعال دارد. تا تسویه وام قبلی امکان ثبت وام جدید نیست.');
      return;
    }
    setSubmitting(true);
    api
      .post<Loan>('/api/loans', {
        memberId,
        amount,
        date: data.date.trim(),
        dueMonths: dueMonths < 1 ? 1 : dueMonths,
        status: 'active',
        note: data.note?.trim() || undefined,
        createdAt: new Date().toISOString(),
      })
      .then(() =>
        api.get<Member>(`/api/members/${memberId}`).then((mRes) => {
          const m = mRes.data;
          return api.patch(`/api/members/${memberId}`, {
            ...m,
            loanAmount: (m.loanAmount ?? 0) + amount,
            loanBalance: (m.loanBalance ?? 0) + amount,
          });
        })
      )
      .then(() => {
        toast.success('وام با موفقیت ثبت شد.');
        setAddModalOpen(false);
        loadData();
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        const msg = err.response?.data?.message;
        toast.error(msg || 'خطا در ثبت وام.');
      })
      .finally(() => setSubmitting(false));
  }

  function markSettled(loan: Loan) {
    if (loan.status === 'settled') return;
    setSettlingId(loan.id);
    api
      .patch<Loan>(`/api/loans/${loan.id}`, { ...loan, status: 'settled' })
      .then(() => {
        toast.success('وام به‌عنوان تسویه‌شده ثبت شد.');
        loadData();
      })
      .catch(() => toast.error('خطا در به‌روزرسانی وام.'))
      .finally(() => setSettlingId(null));
  }

  const getMemberName = (id: string) =>
    members.find((m) => String(m.id) === String(id))?.fullName || '—';

  /** مجموع سپرده کل اعضا و سقف وام قابل اعطا (مجموع سپرده − مجموع مانده وام) */
  const { totalDeposits, loanCeiling } = useMemo(() => {
    const totalDep = members.reduce((s, m) => s + (m.deposit ?? 0), 0);
    const totalOutstanding = members.reduce((s, m) => s + (m.loanBalance ?? 0), 0);
    return {
      totalDeposits: totalDep,
      loanCeiling: Math.max(0, totalDep - totalOutstanding),
    };
  }, [members]);

  const filteredLoans = useMemo(() => {
    let list = loans;
    if (statusFilter !== 'all') list = list.filter((l) => l.status === statusFilter);
    const q = normalizeSearch(loanSearchQuery);
    if (!q) {
      return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const filtered = list.filter((l) => {
      const name = getMemberName(l.memberId);
      const nameMatch = normalizeSearch(name).includes(q);
      const dateMatch = normalizeSearch(l.date).includes(q);
      const statusText = l.status === 'active' ? 'فعال' : 'تسویه';
      const statusMatch = normalizeSearch(statusText).includes(q);
      const numQuery = q.replace(/\D/g, '');
      const amountMatch = numQuery.length > 0 && String(l.amount).includes(numQuery);
      const dueMatch = numQuery.length > 0 && String(l.dueMonths).includes(numQuery);
      return nameMatch || dateMatch || statusMatch || amountMatch || dueMatch;
    });
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [loans, loanSearchQuery, statusFilter, members]);

  /** درخواست‌های وام تأیید‌شده (در انتظار اعطا) به‌همراه اطلاعات عضو متناظر */
  const waitingLoans = useMemo(() => {
    const approved = (loanRequests || []).filter((r) => r.status === 'approved');
    return approved.map((r) => {
      const member =
        members.find((m) => m.telegramChatId && String(m.telegramChatId) === String(r.telegramChatId)) || null;
      const hasActiveLoan =
        member != null &&
        loans.some((l) => l.memberId === member.id && (l.status === 'active' || l.status == null));
      return { request: r, member, hasActiveLoan };
    });
  }, [loanRequests, members, loans]);

  const filteredWaitingLoans = useMemo(() => {
    const q = normalizeSearch(waitingSearchQuery);
    if (!q) return waitingLoans;
    return waitingLoans.filter(({ request, member }) => {
      const name = member?.fullName || '';
      const userName = request.userName || '';
      const chatId = request.telegramChatId || '';
      const nameMatch = normalizeSearch(name).includes(q);
      const userNameMatch = normalizeSearch(userName).includes(q);
      const chatMatch = normalizeSearch(String(chatId)).includes(q);
      return nameMatch || userNameMatch || chatMatch;
    });
  }, [waitingLoans, waitingSearchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-white">وام‌ها</h1>
        <Button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white"
        >
          ثبت وام
        </Button>
      </div>

      {/* تب‌ها: درخواست‌های تأیید شده / لیست وام‌ها */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-1 flex gap-1 text-xs text-white/80">
        <button
          type="button"
          onClick={() => setActiveTab('waiting')}
          className={`flex-1 rounded-xl px-3 py-2 transition-colors ${
            activeTab === 'waiting' ? 'bg-white/20 text-white' : 'hover:bg-white/10'
          }`}
        >
          در انتظار وام
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('loans')}
          className={`flex-1 rounded-xl px-3 py-2 transition-colors ${
            activeTab === 'loans' ? 'bg-white/20 text-white' : 'hover:bg-white/10'
          }`}
        >
          وام‌های ثبت‌شده
        </button>
      </div>

      {activeTab === 'waiting' ? (
        <div>
          <div className="flex flex-wrap items-stretch gap-2 mb-3">
            <div className="flex-1 min-w-[200px] rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="text-white/60 shrink-0" aria-hidden>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={waitingSearchQuery}
                  onChange={(e) => setWaitingSearchQuery(e.target.value)}
                  placeholder="جستجو بر اساس نام، یوزرنیم یا Chat ID..."
                  className="w-full min-w-0 bg-transparent text-white placeholder:text-white/50 text-sm py-1.5 focus:outline-none"
                  aria-label="جستجو در درخواست‌های تأیید شده"
                />
                {waitingSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setWaitingSearchQuery('')}
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
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-medium text-white/90">درخواست‌های تایید‌شده در انتظار اعطای وام</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/70">
                {loading ? '—' : `${filteredWaitingLoans.length} نفر`}
              </span>
              <Button
                type="button"
                size="sm"
                className="rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs px-3 py-1.5"
                onClick={async () => {
                  try {
                    await api.post('/api/loanRequests/broadcastWaiting');
                    toast.success('لیست افراد در انتظار وام به تلگرام ارسال شد.');
                  } catch (e) {
                    toast.error('خطا در ارسال لیست به تلگرام.');
                  }
                }}
              >
                انتشار در تلگرام
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-4 inline-block">
              <p className="text-sm text-white/80">در حال بارگذاری...</p>
            </div>
          ) : filteredWaitingLoans.length === 0 ? (
            <p className="text-sm text-white/60 text-center py-6">
              درخواستی در وضعیت «تأیید شده و در انتظار اعطای وام» یافت نشد.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredWaitingLoans.map(({ request, member, hasActiveLoan }) => (
                <Card key={request.id} variant="glass">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium text-white truncate">
                        {member?.fullName || request.userName || 'بدون نام'}
                      </p>
                      <p className="text-xs text-white/70">
                        Chat ID: {request.telegramChatId || '—'}
                        {request.userName ? ` · @${request.userName}` : ''}
                      </p>
                      <p className="text-xs text-white/60">
                        ثبت درخواست: {request.createdAt ? formatDateShort(String(request.createdAt).split('T')[0]) : '—'}
                      </p>
                      {hasActiveLoan ? (
                        <p className="text-xs text-amber-300 mt-0.5">
                          این عضو در حال حاضر وام فعال دارد.
                        </p>
                      ) : (
                        <p className="text-xs text-emerald-300 mt-0.5">
                          در انتظار ثبت وام برای این درخواست.
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* جستجو و فیلتر لیست وام‌ها */}
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
                  value={loanSearchQuery}
                  onChange={(e) => setLoanSearchQuery(e.target.value)}
                  placeholder="جستجو بر اساس نام، مبلغ، تاریخ، وضعیت..."
                  className="w-full min-w-0 bg-transparent text-white placeholder:text-white/50 text-sm py-1.5 focus:outline-none"
                  aria-label="جستجو در وام‌ها"
                />
                {loanSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setLoanSearchQuery('')}
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'settled')}
                className="h-full min-h-[42px] bg-transparent text-white text-sm px-4 py-2 pr-8 focus:outline-none focus:ring-0 appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.6)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 0.5rem center', backgroundSize: '1.25rem' }}
                aria-label="فیلتر وضعیت وام"
              >
                <option value="all" className="bg-slate-800 text-white">همه</option>
                <option value="active" className="bg-slate-800 text-white">فعال</option>
                <option value="settled" className="bg-slate-800 text-white">تسویه</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-medium text-white/90">لیست وام‌ها</h2>
              <span className="text-xs text-white/70">
                {loading ? '—' : `${filteredLoans.length} مورد`}
              </span>
            </div>
            {loading ? (
              <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-4 inline-block">
                <p className="text-sm text-white/80">در حال بارگذاری...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLoans.map((l) => (
                  <Card key={l.id} variant="glass" onClick={() => router.push(`/admin/loans/${l.id}`)}>
                    <div className="flex flex-wrap justify-between items-center gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-medium text-white block truncate">
                          {getMemberName(l.memberId)}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/70">
                          <span>تاریخ: {formatDateShort(l.date)}</span>
                          <span className="text-white/50">|</span>
                          <span>{l.dueMonths} ماهه</span>
                          <span className="text-white/50">|</span>
                          <span>سررسید: ماهانه تا {formatDateShort(addMonthsToDate(l.date, l.dueMonths))}</span>
                        </div>
                        {l.note && (
                          <p className="text-xs text-white/50 mt-0.5">{l.note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium text-white">
                          {formatCurrency(l.amount)}
                        </span>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                            l.status === 'active'
                              ? 'bg-amber-500/90 text-white'
                              : 'bg-slate-500/90 text-white'
                          }`}
                        >
                          {l.status === 'active' ? 'فعال' : 'تسویه'}
                        </span>
                        <span className="text-xs text-white/80">جزئیات</span>
                        {l.status === 'active' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              markSettled(l);
                            }}
                            disabled={settlingId === l.id}
                            className="bg-white/15 text-white border-white/30 hover:bg-white/25 text-xs"
                          >
                            {settlingId === l.id ? 'در حال ثبت…' : 'تسویه'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {!loading && loans.length === 0 && (
              <p className="text-sm text-white/60 text-center py-6">وامی ثبت نشده است.</p>
            )}
            {!loading && loans.length > 0 && filteredLoans.length === 0 && (
              <p className="text-sm text-white/60 text-center py-6">نتیجه‌ای برای جستجو یافت نشد.</p>
            )}
          </div>
        </div>
      )}

      {/* مودال ثبت وام */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="ثبت وام جدید"
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
              form="loan-form"
              loading={submitting}
              className="rounded-xl bg-white/25 hover:bg-white/35 border border-white/30 text-white"
            >
              ثبت وام
            </Button>
          </>
        }
      >
        <form
          id="loan-form"
          onSubmit={handleSubmit(onAddLoan)}
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
                  members={members.filter(
                    (m) =>
                      m.status === 'active' &&
                      !loans.some(
                        (l) =>
                          l.memberId === m.id && (l.status === 'active' || l.status == null)
                      )
                  )}
                  placeholder="جستجو نام یا شماره تماس عضو (فقط اعضای بدون وام فعال)..."
                  labelClassName="text-white/80"
                  error={errors.memberId?.message}
                />
              )}
            />
          </div>
          <div className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 mb-1">
            <p className="text-xs text-white/70">مجموع سپرده اعضا</p>
            <p className="text-sm font-medium text-white">{formatCurrency(totalDeposits)}</p>
            <p className="text-xs text-white/60 mt-0.5">سقف وام قابل اعطا (با کسر مانده وام‌های فعلی)</p>
            <p className="text-sm font-medium text-emerald-300">{formatCurrency(loanCeiling)}</p>
          </div>
          <Controller
            name="amount"
            control={control}
            rules={{
              required: 'مبلغ وام را وارد کنید.',
              validate: (v) => {
                const n = toNum(v);
                if (n <= 0) return true;
                return n <= loanCeiling || `حداکثر ${formatCurrency(loanCeiling)} مجاز است.`;
              },
            }}
            render={({ field }) => (
              <FormattedNumberInput
                label="مبلغ وام (تومان)"
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
                label="تاریخ اعطای وام"
                value={field.value}
                onChange={field.onChange}
                placeholder="انتخاب تاریخ"
                error={errors.date?.message}
              />
            )}
          />
          <Controller
            name="dueMonths"
            control={control}
            rules={{ required: 'مدت بازپرداخت را وارد کنید.' }}
            render={({ field }) => (
              <FormattedNumberInput
                label="مدت بازپرداخت (ماه)"
                value={field.value}
                onChange={field.onChange}
                placeholder="۱۲"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                labelClassName="text-white/80"
                error={errors.dueMonths?.message}
              />
            )}
          />
          <div className="sm:col-span-2 rounded-xl border border-white/20 bg-white/5 px-3 py-3">
            <p className="text-xs text-white/70 mb-0.5">قسط ماهانه</p>
            <p className="text-sm font-medium text-white">
              {monthlyInstallment > 0
                ? formatCurrency(monthlyInstallment)
                : 'مبلغ وام و مدت بازپرداخت را وارد کنید.'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Input
              label="توضیح (اختیاری)"
              {...register('note')}
              placeholder="مثال: وام ماه دوم"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
              labelClassName="text-white/80"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

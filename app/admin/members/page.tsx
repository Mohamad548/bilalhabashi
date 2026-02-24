'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { api } from '@/lib/axios';
import { Card, Button, Input, Modal, FormattedNumberInput, DatePickerShamsi } from '@/components/ui';
import { formatCurrency, formatDateShort } from '@/utils/format';
import { IconEdit } from '@/components/icons';
import type { Member } from '@/types';

interface MemberFormData {
  fullName: string;
  phone: string;
  nationalId: string;
  joinDate: string;
  monthlyAmount: string;
  status: 'active' | 'inactive';
  loanAmount: string;
  deposit: string;
  loanBalance: string;
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
function toEnglishDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (c) => String(PERSIAN_DIGITS.indexOf(c)));
}
function normalizeSearch(str: string): string {
  return toEnglishDigits(str).replace(/\s+/g, ' ').trim();
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editModeInModal, setEditModeInModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MemberFormData>({
    defaultValues: { status: 'active', nationalId: '', loanAmount: '', deposit: '', loanBalance: '' },
  });

  function loadMembers() {
    api
      .get<Member[]>('/api/members')
      .then((res) => setMembers(res.data))
      .catch(() => toast.error('خطا در بارگذاری اعضا.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    let list = members;
    if (statusFilter !== 'all') {
      list = list.filter((m) => m.status === statusFilter);
    }
    const q = normalizeSearch(searchQuery);
    if (!q) return list;
    return list.filter((m) => {
      const nameMatch = normalizeSearch(m.fullName).includes(q);
      const phoneMatch = normalizeSearch(m.phone).includes(q);
      const nationalIdMatch = (m.nationalId && normalizeSearch(m.nationalId).includes(q)) ?? false;
      const joinMatch = normalizeSearch(m.joinDate).includes(q);
      const statusText = m.status === 'active' ? 'فعال' : 'غیرفعال';
      const statusMatch = normalizeSearch(statusText).includes(q);
      const numQuery = q.replace(/\D/g, '');
      const amountMatch =
        numQuery.length > 0 &&
        (String(m.monthlyAmount).includes(numQuery) ||
          String(m.loanAmount ?? '').includes(numQuery) ||
          String(m.deposit ?? '').includes(numQuery) ||
          String(m.loanBalance ?? '').includes(numQuery));
      return nameMatch || phoneMatch || nationalIdMatch || joinMatch || statusMatch || amountMatch;
    });
  }, [members, searchQuery, statusFilter]);

  useEffect(() => {
    if (editingMember) {
      reset({
        fullName: editingMember.fullName,
        phone: editingMember.phone,
        nationalId: editingMember.nationalId ?? '',
        joinDate: editingMember.joinDate,
        monthlyAmount: String(editingMember.monthlyAmount),
        status: editingMember.status,
        loanAmount: String(editingMember.loanAmount ?? 0),
        deposit: String(editingMember.deposit ?? 0),
        loanBalance: String(editingMember.loanBalance ?? 0),
      });
    }
  }, [editingMember, reset]);

  useEffect(() => {
    if (addModalOpen) {
      reset({
        fullName: '',
        phone: '',
        nationalId: '',
        joinDate: '',
        monthlyAmount: '',
        status: 'active',
        loanAmount: '',
        deposit: '',
        loanBalance: '',
      });
    }
  }, [addModalOpen, reset]);

  function toNum(v: string) {
    const n = Number(v);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  }

  function onAddMember(data: MemberFormData) {
    const monthlyAmount = toNum(data.monthlyAmount);
    if (monthlyAmount === 0 && data.monthlyAmount.trim() !== '') {
      toast.error('مبلغ سپرده ماهانه معتبر نیست.');
      return;
    }
    setSubmitting(true);
    api
      .post<Member>('/api/members', {
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        nationalId: (data.nationalId || '').trim().replace(/\D/g, '') || undefined,
        joinDate: data.joinDate.trim(),
        monthlyAmount,
        status: data.status,
        loanAmount: toNum(data.loanAmount),
        deposit: toNum(data.deposit),
        loanBalance: toNum(data.loanBalance),
        createdAt: new Date().toISOString(),
      })
      .then(() => {
        toast.success('عضو با موفقیت اضافه شد.');
        setAddModalOpen(false);
        reset({
          fullName: '',
          phone: '',
          nationalId: '',
          joinDate: '',
          monthlyAmount: '',
          status: 'active',
          loanAmount: '',
          deposit: '',
          loanBalance: '',
        });
        loadMembers();
      })
      .catch(() => toast.error('خطا در ثبت عضو.'))
      .finally(() => setSubmitting(false));
  }

  function onEditMember(data: MemberFormData) {
    if (!editingMember) return;
    const monthlyAmount = toNum(data.monthlyAmount);
    setSubmitting(true);
    api
      .patch<Member>(`/api/members/${editingMember.id}`, {
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        nationalId: (data.nationalId || '').trim().replace(/\D/g, '') || undefined,
        joinDate: data.joinDate.trim(),
        monthlyAmount,
        status: data.status,
        loanAmount: editingMember.loanAmount ?? 0,
        deposit: editingMember.deposit ?? 0,
        loanBalance: editingMember.loanBalance ?? 0,
      })
      .then(() => {
        toast.success('اطلاعات عضو به‌روز شد.');
        setEditingMember(null);
        loadMembers();
      })
      .catch(() => toast.error('خطا در به‌روزرسانی عضو.'))
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-white">اعضا</h1>
        <Button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white"
        >
          افزودن عضو
        </Button>
      </div>

      {/* جستجو و مرتب‌سازی وضعیت */}
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
              placeholder="جستجو بر اساس نام، شماره تماس، مبلغ، تاریخ، وضعیت..."
              className="w-full min-w-0 bg-transparent text-white placeholder:text-white/50 text-sm py-1.5 focus:outline-none"
              aria-label="جستجو در اعضا"
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="h-full min-h-[42px] bg-transparent text-white text-sm px-4 py-2 pr-8 focus:outline-none focus:ring-0 appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.6)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 0.5rem center', backgroundSize: '1.25rem' }}
            aria-label="مرتب‌سازی بر اساس وضعیت"
          >
            <option value="all" className="bg-slate-800 text-white">همه</option>
            <option value="active" className="bg-slate-800 text-white">فعال</option>
            <option value="inactive" className="bg-slate-800 text-white">غیرفعال</option>
          </select>
        </div>
      </div>

      {/* لیست اعضا */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-medium text-white/90">لیست اعضا</h2>
          <span className="text-xs text-white/70">
            {loading ? '—' : `${filteredMembers.length} نفر`}
          </span>
        </div>
        {loading ? (
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-4 inline-block">
            <p className="text-sm text-white/80">در حال بارگذاری...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMembers.map((m) => (
              <Card key={m.id} variant="glass" onClick={() => { setEditingMember(m); setEditModeInModal(false); }}>
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm font-medium text-white truncate">{m.fullName}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/70">
                      <span className="shrink-0">شماره تماس: {m.phone}</span>
                      <span className="text-white/50">|</span>
                      <span>تاریخ عضویت: {formatDateShort(m.joinDate)}</span>
                    </div>
                    <p className="text-xs text-white/60">
                      سپرده ماهانه: {formatCurrency(m.monthlyAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                        m.status === 'active'
                          ? 'bg-green-600/90 text-white'
                          : 'bg-red-600/90 text-white'
                      }`}
                    >
                      {m.status === 'active' ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {!loading && members.length === 0 && (
          <p className="text-sm text-white/60 text-center py-6">عضوی ثبت نشده است.</p>
        )}
        {!loading && members.length > 0 && filteredMembers.length === 0 && (
          <p className="text-sm text-white/60 text-center py-6">نتیجه‌ای برای جستجو یافت نشد.</p>
        )}
      </div>

      {/* مودال افزودن عضو */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="افزودن عضو جدید"
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
              form="member-form"
              loading={submitting}
              className="rounded-xl bg-white/25 hover:bg-white/35 border border-white/30 text-white"
            >
              افزودن عضو
            </Button>
          </>
        }
      >
        <form
          id="member-form"
          onSubmit={handleSubmit(onAddMember)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          noValidate
        >
          <Input
            label="نام و نام خانوادگی"
            {...register('fullName', { required: 'نام و نام خانوادگی را وارد کنید.' })}
            placeholder="مثال: علی محمدی"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
            labelClassName="text-white/80"
            error={errors.fullName?.message}
          />
          <Input
            label="شماره تماس"
            {...register('phone', { required: 'شماره تماس را وارد کنید.' })}
            placeholder="مثال: 09121234567"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
            labelClassName="text-white/80"
            error={errors.phone?.message}
          />
          <Input
            label="کد ملی (کد عضویت برای اتصال ربات تلگرام)"
            {...register('nationalId', {
              pattern: { value: /^[\d۰-۹\s]{0,10}$/, message: 'کد ملی باید ۱۰ رقم باشد.' },
              maxLength: { value: 10, message: 'کد ملی باید ۱۰ رقم باشد.' },
            })}
            placeholder="۱۰ رقم"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
            labelClassName="text-white/80"
            error={errors.nationalId?.message}
          />
          <Controller
            name="joinDate"
            control={control}
            rules={{ required: 'تاریخ عضویت را وارد کنید.' }}
            render={({ field }) => (
              <DatePickerShamsi
                label="تاریخ عضویت"
                value={field.value}
                onChange={field.onChange}
                placeholder="انتخاب تاریخ"
                error={errors.joinDate?.message}
              />
            )}
          />
          <Controller
            name="monthlyAmount"
            control={control}
            rules={{ required: 'سپرده ماهانه را وارد کنید.' }}
            render={({ field }) => (
              <FormattedNumberInput
                label="سپرده ماهانه (تومان)"
                value={field.value}
                onChange={field.onChange}
                placeholder="۰"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                labelClassName="text-white/80"
                error={errors.monthlyAmount?.message}
              />
            )}
          />
          <div className="sm:col-span-2">
            <label className="block text-xs text-white/80 mb-1.5">وضعیت</label>
            <select
              {...register('status')}
              className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <option value="active" className="bg-slate-800 text-white">فعال</option>
              <option value="inactive" className="bg-slate-800 text-white">غیرفعال</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* مودال مشاهده / ویرایش عضو */}
      <Modal
        open={!!editingMember}
        onClose={() => { setEditingMember(null); setEditModeInModal(false); }}
        title={editModeInModal ? 'ویرایش عضو' : 'مشاهده عضو'}
        size="lg"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEditingMember(null)}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              انصراف
            </Button>
            {!editModeInModal ? (
              <button
                type="button"
                onClick={() => setEditModeInModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm bg-white/25 hover:bg-white/35 border border-white/30 text-white transition-colors"
                title="ویرایش"
                aria-label="ویرایش عضو"
              >
                <IconEdit />
                <span>ویرایش</span>
              </button>
            ) : (
              <Button
                type="submit"
                form="member-edit-form"
                loading={submitting}
                className="rounded-xl bg-white/25 hover:bg-white/35 border border-white/30 text-white"
              >
                ذخیره تغییرات
              </Button>
            )}
          </>
        }
      >
        {!editModeInModal && editingMember ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-white/60 block mb-0.5">نام و نام خانوادگی</span>
              <p className="text-white">{editingMember.fullName}</p>
            </div>
            <div>
              <span className="text-white/60 block mb-0.5">شماره تماس</span>
              <p className="text-white">{editingMember.phone}</p>
            </div>
            <div>
              <span className="text-white/60 block mb-0.5">کد ملی (کد عضویت)</span>
              <p className="text-white">{editingMember.nationalId || '—'}</p>
            </div>
            <div>
              <span className="text-white/60 block mb-0.5">تاریخ عضویت</span>
              <p className="text-white">{editingMember.joinDate}</p>
            </div>
            <div>
              <span className="text-white/60 block mb-0.5">سپرده ماهانه (تومان)</span>
              <p className="text-white">{formatCurrency(editingMember.monthlyAmount)}</p>
            </div>
            <div>
              <span className="text-white/60 block mb-0.5">وضعیت</span>
              <p className="text-white">{editingMember.status === 'active' ? 'فعال' : 'غیرفعال'}</p>
            </div>
          </div>
        ) : (
          <form
            id="member-edit-form"
            onSubmit={handleSubmit(onEditMember)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            noValidate
          >
            <Input
              label="نام و نام خانوادگی"
              {...register('fullName', { required: 'نام و نام خانوادگی را وارد کنید.' })}
              placeholder="مثال: علی محمدی"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
              labelClassName="text-white/80"
              error={errors.fullName?.message}
            />
            <Input
              label="شماره تماس"
              {...register('phone', { required: 'شماره تماس را وارد کنید.' })}
              placeholder="مثال: 09121234567"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
              labelClassName="text-white/80"
              error={errors.phone?.message}
            />
            <Input
              label="کد ملی (کد عضویت برای اتصال ربات تلگرام)"
              {...register('nationalId', {
                pattern: { value: /^[\d۰-۹\s]{0,10}$/, message: 'کد ملی باید ۱۰ رقم باشد.' },
                maxLength: { value: 10, message: 'کد ملی باید ۱۰ رقم باشد.' },
              })}
              placeholder="۱۰ رقم"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
              labelClassName="text-white/80"
              error={errors.nationalId?.message}
            />
            <Controller
              name="joinDate"
              control={control}
              rules={{ required: 'تاریخ عضویت را وارد کنید.' }}
              render={({ field }) => (
                <DatePickerShamsi
                  label="تاریخ عضویت"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="انتخاب تاریخ"
                  error={errors.joinDate?.message}
                />
              )}
            />
            <Controller
              name="monthlyAmount"
              control={control}
              rules={{ required: 'سپرده ماهانه را وارد کنید.' }}
              render={({ field }) => (
                <FormattedNumberInput
                  label="سپرده ماهانه (تومان)"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="۰"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                  labelClassName="text-white/80"
                  error={errors.monthlyAmount?.message}
                />
              )}
            />
            <div className="sm:col-span-2">
              <label className="block text-xs text-white/80 mb-1.5">وضعیت</label>
              <select
                {...register('status')}
                className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
              >
                <option value="active" className="bg-slate-800 text-white">فعال</option>
                <option value="inactive" className="bg-slate-800 text-white">غیرفعال</option>
              </select>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

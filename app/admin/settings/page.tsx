'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/axios';
import { Card, Button, Input } from '@/components/ui';
import type { User } from '@/types';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function AdminSettingsPage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [telegramChannelTarget, setTelegramChannelTarget] = useState('');
  const [telegramGroupTarget, setTelegramGroupTarget] = useState('');
  const [telegramNotifyTarget, setTelegramNotifyTarget] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [telegramTab, setTelegramTab] = useState<'general' | 'notifications' | 'messages'>('general');
  const [messagesSubTab, setMessagesSubTab] = useState<'admin' | 'general'>('general');
  const [sendLoanRequestToAdmin, setSendLoanRequestToAdmin] = useState(true);
  const [sendPaymentToAdmin, setSendPaymentToAdmin] = useState(true);
  const [receiptMemberTemplate, setReceiptMemberTemplate] = useState('');
  const [receiptGroupTemplate, setReceiptGroupTemplate] = useState('');
  const [manualPaymentGroupTemplate, setManualPaymentGroupTemplate] = useState('');
  const [broadcastWaitingTemplate, setBroadcastWaitingTemplate] = useState('');
  const [broadcastWaitingLineTemplate, setBroadcastWaitingLineTemplate] = useState('');
  const [loanRequestAdminTemplate, setLoanRequestAdminTemplate] = useState('');
  const [paymentAdminTemplate, setPaymentAdminTemplate] = useState('');
  const [reminderDaysBefore, setReminderDaysBefore] = useState('7, 3, 1');
  const [sendReminderToMember, setSendReminderToMember] = useState(true);
  const [sendOverdueListToAdmin, setSendOverdueListToAdmin] = useState(false);
  const [sendOverdueListToGroup, setSendOverdueListToGroup] = useState(false);
  const [sendOverdueListToMember, setSendOverdueListToMember] = useState(false);
  const [telegramTestChatLoading, setTelegramTestChatLoading] = useState(false);
  const [telegramUnlinkLoading, setTelegramUnlinkLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setUsername(user.username ?? '');
      setAvatar(user.avatar || null);
    }
  }, [user?.id, user?.name, user?.username, user?.avatar]);

  useEffect(() => {
    api
      .get<{
        adminTarget: string;
        adminChannelTarget: string;
        adminGroupTarget: string;
        notifyTarget: string;
        sendReceiptMember: boolean;
        sendReceiptGroup: boolean;
        sendManualPaymentGroup: boolean;
        sendLoanRequestToAdmin: boolean;
        sendPaymentToAdmin: boolean;
        receiptMemberTemplate: string;
        receiptGroupTemplate: string;
        manualPaymentGroupTemplate: string;
        broadcastWaitingTemplate: string;
        broadcastWaitingLineTemplate: string;
        loanRequestAdminTemplate: string;
        paymentAdminTemplate: string;
        reminderDaysBefore?: number[];
        sendReminderToMember?: boolean;
        sendOverdueListToAdmin?: boolean;
        sendOverdueListToGroup?: boolean;
        sendOverdueListToMember?: boolean;
      }>('/api/admin/telegram-settings')
      .then((res) => {
        setTelegramChannelTarget(res.data.adminChannelTarget || res.data.adminTarget || '');
        setTelegramGroupTarget(res.data.adminGroupTarget || '');
        setTelegramNotifyTarget(res.data.notifyTarget || '');
        setSendLoanRequestToAdmin(res.data.sendLoanRequestToAdmin);
        setSendPaymentToAdmin(res.data.sendPaymentToAdmin);
        setReceiptMemberTemplate(res.data.receiptMemberTemplate || '');
        setReceiptGroupTemplate(res.data.receiptGroupTemplate || '');
        setManualPaymentGroupTemplate(res.data.manualPaymentGroupTemplate || '');
        setBroadcastWaitingTemplate(res.data.broadcastWaitingTemplate || '');
        setBroadcastWaitingLineTemplate(res.data.broadcastWaitingLineTemplate || '');
        setLoanRequestAdminTemplate(res.data.loanRequestAdminTemplate || '');
        setPaymentAdminTemplate(res.data.paymentAdminTemplate || '');
        const days = res.data.reminderDaysBefore;
        setReminderDaysBefore(Array.isArray(days) && days.length ? days.join(', ') : '7, 3, 1');
        setSendReminderToMember(res.data.sendReminderToMember !== false);
        setSendOverdueListToAdmin(res.data.sendOverdueListToAdmin === true);
        setSendOverdueListToGroup(res.data.sendOverdueListToGroup === true);
        setSendOverdueListToMember(res.data.sendOverdueListToMember === true);
      })
      .catch(() => {
        // نادیده گرفتن خطا؛ بخش تلگرام اختیاری است
      })
      .finally(() => setTelegramLoading(false));
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    readFileAsDataUrl(file).then(setAvatar);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setMessage(null);
    setSaving(true);
    const payload: Record<string, string> = {
      name: name.trim(),
      username: username.trim(),
    };
    if (avatar !== null) payload.avatar = avatar;
    if (newPassword.trim()) payload.password = newPassword.trim();

    api
      .patch<User & { password?: string }>(`/api/users/${user.id}`, payload)
      .then((res) => {
        const updated = res.data;
        const safeUser: User = {
          id: updated.id,
          username: updated.username,
          name: updated.name,
          role: updated.role,
          avatar: updated.avatar ?? undefined,
        };
        updateUser(safeUser);
        setNewPassword('');
        setMessage({ type: 'success', text: 'تنظیمات با موفقیت ذخیره شد.' });
      })
      .catch(() => setMessage({ type: 'error', text: 'خطا در ذخیره. دوباره تلاش کنید.' }))
      .finally(() => setSaving(false));
  };

  const handleResetDb = () => {
    const confirmed = window.confirm(
      'همهٔ داده‌ها (پرداخت‌ها، وام‌ها، موجودی صندوق و…) پاک می‌شوند و فقط لیست اعضا و کاربران باقی می‌ماند. آیا مطمئن هستید؟'
    );
    if (!confirmed) return;
    setMessage(null);
    setResetting(true);
    api
      .post<{ success: boolean; message: string }>('/api/admin/reset-db')
      .then((res) => {
        setMessage({ type: 'success', text: res.data.message ?? 'دیتابیس ریست شد.' });
        setTimeout(() => window.location.href = '/admin', 1500);
      })
      .catch((err) => {
        const msg = err.response?.data?.message ?? 'خطا در ریست. دوباره تلاش کنید.';
        setMessage({ type: 'error', text: msg });
      })
      .finally(() => setResetting(false));
  };

  const handleSaveTelegramSettings = () => {
    setMessage(null);
    setTelegramSaving(true);
    api
      .post('/api/admin/telegram-settings', {
        adminChannelTarget: telegramChannelTarget.trim(),
        adminGroupTarget: telegramGroupTarget.trim(),
        notifyTarget: telegramNotifyTarget.trim(),
        sendReceiptMember: true,
        sendReceiptGroup: true,
        sendManualPaymentGroup: true,
        sendLoanRequestGroup: true,
        sendLoanRequestToAdmin,
        sendPaymentToAdmin,
        receiptMemberTemplate,
        receiptGroupTemplate,
        manualPaymentGroupTemplate: receiptGroupTemplate,
        broadcastWaitingTemplate,
        broadcastWaitingLineTemplate,
        loanRequestAdminTemplate,
        paymentAdminTemplate,
        reminderDaysBefore: reminderDaysBefore.split(/[,،\s]+/).map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n >= 0),
        sendReminderToMember,
        sendOverdueListToAdmin,
        sendOverdueListToGroup,
        sendOverdueListToMember,
      })
      .then(() => {
        setMessage({ type: 'success', text: 'تنظیمات تلگرام ذخیره شد.' });
      })
      .catch(() => {
        setMessage({ type: 'error', text: 'خطا در ذخیره تنظیمات تلگرام.' });
      })
      .finally(() => setTelegramSaving(false));
  };

  if (!user) {
    return (
      <div className="text-center text-white/70 py-8">
        <p>لطفاً وارد شوید.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold text-white">تنظیمات</h1>
        <p className="text-xs text-white/50 mt-0.5">ویرایش نام، نام کاربری، رمز عبور و عکس پروفایل</p>
      </header>

      <form onSubmit={handleSubmit}>
        <Card variant="glass" className="border-white/20 space-y-4">
          {/* عکس پروفایل */}
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24 rounded-full border-2 border-white/20 bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt="پروفایل" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-white/50">{(user.name || user.username)[0]}</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                onClick={() => fileInputRef.current?.click()}
              >
                انتخاب تصویر
              </Button>
            </div>
            <div className="text-xs text-white/50">
              تصویر پروفایل را انتخاب کنید. فرمت‌های رایج تصویر پشتیبانی می‌شوند.
            </div>
          </div>

          <Input
            label="نام نمایشی"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
            labelClassName="text-white/70"
            required
          />
          <Input
            label="نام کاربری"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
            labelClassName="text-white/70"
            required
          />
          <Input
            label="رمز عبور جدید (اختیاری)"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="در صورت تمایل به تغییر رمز وارد کنید"
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
            labelClassName="text-white/70"
          />

          {message && (
            <p
              className={
                message.type === 'success'
                  ? 'text-sm text-emerald-300'
                  : 'text-sm text-amber-300'
              }
            >
              {message.text}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={saving}
              loading={saving}
              className="bg-white/20 text-white border border-white/30 hover:bg-white/30"
            >
              ذخیره تغییرات
            </Button>
          </div>
        </Card>
      </form>

      <Card variant="glass" className="border-white/20 mt-4 space-y-4">
        <h2 className="text-sm font-semibold text-white">تنظیمات تلگرام</h2>
        <div className="flex gap-1 rounded-2xl bg-white/5 border border-white/10 p-1 text-xs text-white/80">
          <button
            type="button"
            onClick={() => setTelegramTab('general')}
            className={`flex-1 rounded-xl px-3 py-2 transition-colors ${
              telegramTab === 'general' ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
          >
            عمومی
          </button>
          <button
            type="button"
            onClick={() => setTelegramTab('notifications')}
            className={`flex-1 rounded-xl px-3 py-2 transition-colors ${
              telegramTab === 'notifications' ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
          >
            تنظیمات ارسالی
          </button>
          <button
            type="button"
            onClick={() => setTelegramTab('messages')}
            className={`flex-1 rounded-xl px-3 py-2 transition-colors ${
              telegramTab === 'messages' ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
          >
            متن‌های ارسالی
          </button>
        </div>

        {telegramTab === 'general' && (
          <div className="space-y-3">
            <p className="text-xs text-white/60">
              در این تب، مقصد ارسال پیام‌ها را تنظیم می‌کنید. ربات باید در کانال و گروه اعلانات عضو و ادمین باشد.
            </p>
            <Input
              label="کانال اعلانات"
              value={telegramChannelTarget}
              onChange={(e) => setTelegramChannelTarget(e.target.value)}
              placeholder="مثال: @sandoqq یا -1001234567890"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
              labelClassName="text-white/70"
              disabled={telegramLoading}
            />
            <Input
              label="گروه اعلانات"
              value={telegramGroupTarget}
              onChange={(e) => setTelegramGroupTarget(e.target.value)}
              placeholder="مثال: @group_username یا -1009876543210"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
              labelClassName="text-white/70"
              disabled={telegramLoading}
            />
            <div className="space-y-2">
              <label className="block text-xs text-white/70">چت مدیر اصلی (اختیاری)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={telegramNotifyTarget}
                  onChange={(e) => setTelegramNotifyTarget(e.target.value)}
                  placeholder="مثال: @admin یا Chat ID عددی"
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl flex-1"
                  labelClassName="sr-only"
                  disabled={telegramLoading}
                />
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={telegramLoading}
                    onClick={() => {
                      api.get<{ ok: boolean; url?: string; linkAdmin?: string; message?: string }>('/api/telegram/bot-link').then((r) => {
                        const link = r.data.ok ? (r.data.linkAdmin || (r.data.url ? r.data.url + '?start=admin' : '')) : '';
                        if (link) window.open(link, '_blank', 'noopener');
                        else setMessage({ type: 'error', text: r.data.message || 'دریافت لینک ربات ممکن نشد.' });
                      }).catch(() => setMessage({ type: 'error', text: 'خطا در دریافت لینک ربات.' }));
                    }}
                  >
                    برقراری با تلگرام
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={telegramLoading || telegramTestChatLoading}
                    onClick={() => {
                      const target = telegramNotifyTarget.trim();
                      if (!target) {
                        setMessage({ type: 'error', text: 'ابتدا چت مدیر اصلی را پر کنید یا از دکمه «برقراری با تلگرام» استفاده کنید.' });
                        return;
                      }
                      setTelegramTestChatLoading(true);
                      api.post<{ success: boolean; message?: string; error?: string; errorCode?: string }>('/api/telegram/test-admin-chat', { notifyTarget: target })
                        .then((r) => {
                          if (r.data.success) setMessage({ type: 'success', text: r.data.message || 'پیام تست ارسال شد.' });
                          else setMessage({ type: 'error', text: r.data.error || 'ارسال ناموفق' });
                        })
                        .catch((err) => {
                          const data = err.response?.data;
                          const msg = data?.error || err.message || 'خطا در تست اتصال';
                          setMessage({ type: 'error', text: msg });
                        })
                        .finally(() => setTelegramTestChatLoading(false));
                    }}
                  >
                    {telegramTestChatLoading ? 'در حال بررسی…' : 'بررسی اتصال'}
                  </Button>
                  {telegramNotifyTarget.trim() ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={telegramLoading || telegramUnlinkLoading}
                      onClick={() => {
                        if (!confirm('چت مدیر اصلی قطع شود؟ اعلان‌ها دیگر به این چت ارسال نمی‌شوند.')) return;
                        setTelegramUnlinkLoading(true);
                        api.post('/api/telegram/unlink-admin')
                          .then(() => {
                            setTelegramNotifyTarget('');
                            setMessage({ type: 'success', text: 'اتصال چت مدیر قطع شد.' });
                          })
                          .catch(() => setMessage({ type: 'error', text: 'خطا در قطع ارتباط.' }))
                          .finally(() => setTelegramUnlinkLoading(false));
                      }}
                    >
                      {telegramUnlinkLoading ? '…' : 'قطع ارتباط'}
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-white/50">
                با «برقراری با تلگرام» ربات باز می‌شود؛ دکمه <strong>شروع</strong> را بزنید تا شماره چت شما خودکار در سیستم ذخیره شود. سپس این صفحه را رفرش کنید. برای قطع اعلان‌ها به این چت، «قطع ارتباط» را بزنید.
              </p>
            </div>

            <div className="border-t border-white/10 pt-4 mt-4 space-y-4">
              <h3 className="text-sm font-medium text-white/90">زمان‌بندی ارسال پیام‌ها</h3>
              <p className="text-xs text-white/60">
                یادآوری قسط وام به عضو و ارسال لیست معوقین (کسانی که در تاریخ سررسید پرداخت نکرده‌اند) را تنظیم کنید.
              </p>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
                <p className="text-xs text-white/80 font-medium">یادآوری قسط به عضو (پی وی)</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-white/30 bg-transparent"
                    checked={sendReminderToMember}
                    onChange={(e) => setSendReminderToMember(e.target.checked)}
                    disabled={telegramLoading}
                  />
                  <span>ارسال یادآوری زمان قسط به پی وی شخصی عضو</span>
                </label>
                <div>
                  <label className="block text-xs text-white/70 mb-1">در چه روزهایی قبل از سررسید ارسال شود؟ (عددها با کاما یا فاصله)</label>
                  <input
                    type="text"
                    value={reminderDaysBefore}
                    onChange={(e) => setReminderDaysBefore(e.target.value)}
                    placeholder="مثال: 7, 3, 1"
                    disabled={telegramLoading}
                    className="w-full rounded-lg border border-white/20 bg-white/5 text-white text-xs px-3 py-2 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                  />
                  <p className="text-xs text-white/50 mt-1">مثال: ۷ و ۳ و ۱ یعنی ۷ روز قبل، ۳ روز قبل و ۱ روز قبل از سررسید به عضو پیام یادآوری فرستاده می‌شود.</p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
                <p className="text-xs text-white/80 font-medium">لیست معوقین (سررسید گذشته، پرداخت نشده)</p>
                <p className="text-xs text-white/60">هر روز یک بار لیست افرادی که در تاریخ سررسید قسط وام پرداخت نکرده‌اند به مقصدهای زیر ارسال می‌شود.</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-white/30 bg-transparent"
                    checked={sendOverdueListToAdmin}
                    onChange={(e) => setSendOverdueListToAdmin(e.target.checked)}
                    disabled={telegramLoading}
                  />
                  <span>ارسال لیست معوقین به چت مدیر اصلی</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-white/30 bg-transparent"
                    checked={sendOverdueListToGroup}
                    onChange={(e) => setSendOverdueListToGroup(e.target.checked)}
                    disabled={telegramLoading}
                  />
                  <span>ارسال لیست معوقین به گروه/کانال اعلانات</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-white/30 bg-transparent"
                    checked={sendOverdueListToMember}
                    onChange={(e) => setSendOverdueListToMember(e.target.checked)}
                    disabled={telegramLoading}
                  />
                  <span>ارسال به پی وی هر عضو معوق (یادآوری پرداخت نشده)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {telegramTab === 'notifications' && (
          <div className="space-y-4 text-xs text-white/80">
            <p className="text-xs text-white/60">
              مشخص کنید کدام اعلانات به چت مدیر اصلی (از تب «عمومی») از طریق ربات ارسال شوند.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-white/30 bg-transparent"
                  checked={sendLoanRequestToAdmin}
                  onChange={(e) => setSendLoanRequestToAdmin(e.target.checked)}
                  disabled={telegramLoading}
                />
                <span>ارسال اعلان درخواست وام به چت مدیر اصلی</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-white/30 bg-transparent"
                  checked={sendPaymentToAdmin}
                  onChange={(e) => setSendPaymentToAdmin(e.target.checked)}
                  disabled={telegramLoading}
                />
                <span>ارسال اعلان پرداخت (رسید و دستی) به چت مدیر اصلی</span>
              </label>
            </div>
            <p className="text-xs text-white/50 pt-1">
              چت مدیر اصلی در تب «عمومی» تنظیم می‌شود.
            </p>
          </div>
        )}

        {telegramTab === 'messages' && (
          <div className="space-y-4">
            <div className="flex gap-1 rounded-xl bg-white/5 border border-white/10 p-1 text-xs text-white/80">
              <button
                type="button"
                onClick={() => setMessagesSubTab('general')}
                className={`flex-1 rounded-lg px-3 py-2 transition-colors ${
                  messagesSubTab === 'general' ? 'bg-white/20 text-white' : 'hover:bg-white/10'
                }`}
              >
                متن‌های ارسالی عمومی
              </button>
              <button
                type="button"
                onClick={() => setMessagesSubTab('admin')}
                className={`flex-1 rounded-lg px-3 py-2 transition-colors ${
                  messagesSubTab === 'admin' ? 'bg-white/20 text-white' : 'hover:bg-white/10'
                }`}
              >
                متن‌های ارسالی ادمین (پیام اعلانات)
              </button>
            </div>

            {messagesSubTab === 'general' && (
              <div className="space-y-4">
                <p className="text-xs text-white/60">
                  پیام‌های ارسالی برای عضو به‌صورت شخصی یا در گروه/کانال. از دکمه‌های زیر می‌توانید متغیرها را درج کنید.
                </p>
                <div className="space-y-1">
                  <label className="block text-xs text-white/70">متن پیام به عضو (تایید رسید)</label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5 items-center">
                    {[
                      { token: '{memberName}', label: 'نام و نام خانوادگی عضو' },
                      { token: '{amount}', label: 'مبلغ' },
                      { token: '{date}', label: 'تاریخ' },
                    ].map(({ token, label }) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => setReceiptMemberTemplate((p) => p + token)}
                        disabled={telegramLoading}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-white/90 border border-white/20 hover:bg-white/20 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                    <span className="text-white/40 text-xs mx-0.5">|</span>
                    <button
                      type="button"
                      onClick={() => setReceiptMemberTemplate((p) => p + '✓')}
                      disabled={telegramLoading}
                      className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-300 border border-green-400/30 hover:bg-green-500/30 transition-colors"
                      title="تیک تایید"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptMemberTemplate((p) => p + '✗')}
                      disabled={telegramLoading}
                      className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-400/30 hover:bg-red-500/30 transition-colors"
                      title="ضرب"
                    >
                      ✗
                    </button>
                  </div>
                  <textarea
                    value={receiptMemberTemplate}
                    onChange={(e) => setReceiptMemberTemplate(e.target.value)}
                    placeholder="پیش‌فرض: پرداخت شما به مبلغ {amount} تومان در تاریخ {date} در سیستم ثبت شد."
                    className="w-full min-h-[72px] rounded-xl border border-white/20 bg-white/5 text-white text-xs px-3 py-2 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                    disabled={telegramLoading}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-white/70">متن پیام در کانال/گروه (پرداخت — رسید و دستی)</label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5 items-center">
                    {[
                      { token: '{memberName}', label: 'نام و نام خانوادگی عضو' },
                      { token: '{amount}', label: 'مبلغ' },
                      { token: '{date}', label: 'تاریخ' },
                    ].map(({ token, label }) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => setReceiptGroupTemplate((p) => p + token)}
                        disabled={telegramLoading}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-white/90 border border-white/20 hover:bg-white/20 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                    <span className="text-white/40 text-xs mx-0.5">|</span>
                    <button
                      type="button"
                      onClick={() => setReceiptGroupTemplate((p) => p + '✓')}
                      disabled={telegramLoading}
                      className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-300 border border-green-400/30 hover:bg-green-500/30 transition-colors"
                      title="تیک تایید"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptGroupTemplate((p) => p + '✗')}
                      disabled={telegramLoading}
                      className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-400/30 hover:bg-red-500/30 transition-colors"
                      title="ضرب"
                    >
                      ✗
                    </button>
                  </div>
                  <textarea
                    value={receiptGroupTemplate}
                    onChange={(e) => setReceiptGroupTemplate(e.target.value)}
                    placeholder="پیش‌فرض: ✅ پرداخت عضو «{memberName}» به مبلغ {amount} تومان در تاریخ {date} در سیستم ثبت شد."
                    className="w-full min-h-[72px] rounded-xl border border-white/20 bg-white/5 text-white text-xs px-3 py-2 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                    disabled={telegramLoading}
                  />
                </div>
                <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <label className="block text-xs font-medium text-white/80">متن پیام انتشار لیست در انتظار وام (دکمه «انتشار در تلگرام»)</label>
                  <p className="text-xs text-white/50 -mt-1">از {'{list}'} برای لیست افراد و {'{count}'} برای تعداد استفاده کنید.</p>
                  <div className="flex flex-wrap gap-1.5 mb-1.5 items-center">
                    {[
                      { token: '{list}', label: 'لیست افراد' },
                      { token: '{count}', label: 'تعداد' },
                    ].map(({ token, label }) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => setBroadcastWaitingTemplate((p) => p + token)}
                        disabled={telegramLoading}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-white/90 border border-white/20 hover:bg-white/20 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                    <span className="text-white/40 text-xs mx-0.5">|</span>
                    <button
                      type="button"
                      onClick={() => setBroadcastWaitingTemplate((p) => p + '✓')}
                      disabled={telegramLoading}
                      className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-300 border border-green-400/30 hover:bg-green-500/30 transition-colors"
                      title="تیک تایید"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setBroadcastWaitingTemplate((p) => p + '✗')}
                      disabled={telegramLoading}
                      className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-400/30 hover:bg-red-500/30 transition-colors"
                      title="ضرب"
                    >
                      ✗
                    </button>
                  </div>
                  <textarea
                    value={broadcastWaitingTemplate}
                    onChange={(e) => setBroadcastWaitingTemplate(e.target.value)}
                    placeholder="خالی = پیش‌فرض. مثال: 📢 لیست در انتظار وام ({count} نفر):&#10;&#10;{list}"
                    className="w-full min-h-[80px] rounded-xl border border-white/20 bg-white/5 text-white text-xs px-3 py-2 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                    disabled={telegramLoading}
                  />
                </div>
              </div>
            )}

            {messagesSubTab === 'admin' && (
              <div className="space-y-4">
                <p className="text-xs text-white/60">
                  متن پیام‌هایی که به چت مدیر اصلی ارسال می‌شوند: اعلان درخواست وام و اعلان پرداخت (رسید و دستی).
                </p>
                <p className="text-xs text-white/50 bg-white/5 rounded-lg p-2">
                  مقدار <strong>{'{memberName}'}</strong> از فیلد «نام و نام خانوادگی» در صفحه اعضا می‌آید. برای نمایش نام کامل (مثلاً محمد محمودی)، در منوی اعضا هنگام افزودن/ویرایش عضو، نام و نام خانوادگی را کامل وارد کنید.
                </p>
                <div className="space-y-1">
                  <label className="block text-xs text-white/70">متن پیام اعلان درخواست وام به چت مدیر اصلی</label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5 items-center">
                    {[
                      { token: '{memberName}', label: 'نام و نام خانوادگی عضو' },
                      { token: '{userName}', label: 'یوزرنیم تلگرام' },
                      { token: '{chatId}', label: 'Chat ID' },
                    ].map(({ token, label }) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => setLoanRequestAdminTemplate((p) => p + token)}
                        disabled={telegramLoading}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-white/90 border border-white/20 hover:bg-white/20 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                    <span className="text-white/40 text-xs mx-0.5">|</span>
                    <button
                      type="button"
                      onClick={() => setLoanRequestAdminTemplate((p) => p + '✓')}
                      disabled={telegramLoading}
                      className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-300 border border-green-400/30 hover:bg-green-500/30 transition-colors"
                      title="تیک تایید"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoanRequestAdminTemplate((p) => p + '✗')}
                      disabled={telegramLoading}
                      className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-400/30 hover:bg-red-500/30 transition-colors"
                      title="ضرب"
                    >
                      ✗
                    </button>
                  </div>
                  <textarea
                    value={loanRequestAdminTemplate}
                    onChange={(e) => setLoanRequestAdminTemplate(e.target.value)}
                    placeholder="خالی = پیش‌فرض: «📩 {memberName} درخواست وام دارد.» می‌فرستد. توکن‌ها: {memberName} نام و نام خانوادگی عضو (از لیست اعضا)، {userName} یوزرنیم تلگرام، {chatId} شناسه چت."
                    className="w-full min-h-[72px] rounded-xl border border-white/20 bg-white/5 text-white text-xs px-3 py-2 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                    disabled={telegramLoading}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-white/70">متن پیام اعلان پرداخت (رسید و دستی) به چت مدیر اصلی</label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5 items-center">
                    {[
                      { token: '{memberName}', label: 'نام و نام خانوادگی عضو' },
                      { token: '{amount}', label: 'مبلغ' },
                      { token: '{date}', label: 'تاریخ' },
                    ].map(({ token, label }) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => setPaymentAdminTemplate((p) => p + token)}
                        disabled={telegramLoading}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-white/90 border border-white/20 hover:bg-white/20 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                    <span className="text-white/40 text-xs mx-0.5">|</span>
                    <button
                      type="button"
                      onClick={() => setPaymentAdminTemplate((p) => p + '✓')}
                      disabled={telegramLoading}
                      className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-300 border border-green-400/30 hover:bg-green-500/30 transition-colors"
                      title="تیک تایید"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentAdminTemplate((p) => p + '✗')}
                      disabled={telegramLoading}
                      className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-400/30 hover:bg-red-500/30 transition-colors"
                      title="ضرب"
                    >
                      ✗
                    </button>
                  </div>
                  <textarea
                    value={paymentAdminTemplate}
                    onChange={(e) => setPaymentAdminTemplate(e.target.value)}
                    placeholder="خالی = همان متن کانال/گروه. مثال: ✅ پرداخت عضو «{memberName}» به مبلغ {amount} تومان در تاریخ {date} در سیستم ثبت شد."
                    className="w-full min-h-[72px] rounded-xl border border-white/20 bg-white/5 text-white text-xs px-3 py-2 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                    disabled={telegramLoading}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            onClick={handleSaveTelegramSettings}
            disabled={telegramSaving || telegramLoading}
            loading={telegramSaving}
            className="bg-white/20 text-white border border-white/30 hover:bg-white/30"
          >
            ذخیره تنظیمات تلگرام
          </Button>
        </div>
      </Card>

      <Card variant="glass" className="border-amber-500/40 mt-6 bg-amber-500/5">
        <h2 className="text-base font-semibold text-amber-200 mb-1">ریست دیتابیس</h2>
        <p className="text-xs text-white/60 mb-4">
          با زدن دکمهٔ زیر، همهٔ پرداخت‌ها، وام‌ها، موجودی صندوق و رسیدها پاک می‌شوند و فقط <strong>لیست اعضا و کاربران</strong> (با مبالغ صفر) باقی می‌ماند. این عمل قابل بازگشت نیست.
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled={resetting}
          loading={resetting}
          onClick={handleResetDb}
          className="bg-amber-500/25 text-amber-100 border-amber-500/50 hover:bg-amber-500/35 font-medium"
        >
          {resetting ? 'در حال ریست…' : 'ریست همهٔ اطلاعات (به‌جز اعضا)'}
        </Button>
      </Card>
    </div>
  );
}

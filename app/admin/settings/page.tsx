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

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setUsername(user.username ?? '');
      setAvatar(user.avatar || null);
    }
  }, [user?.id, user?.name, user?.username, user?.avatar]);

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

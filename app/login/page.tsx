'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input } from '@/components/ui';
import { APP_NAME } from '@/utils/constants';

interface LoginFormData {
  username: string;
  password: string;
}

const EyeOpen = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeClosed = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    mode: 'onTouched',
    defaultValues: { username: '', password: '' },
  });

  function onInvalid(errors: Record<string, { message?: string }>) {
    const messages: string[] = [];
    if (errors.username?.message) messages.push(errors.username.message);
    if (errors.password?.message) messages.push(errors.password.message);
    if (errors.root?.message) messages.push(errors.root.message);
    if (messages.length) toast.error(messages.join(' '));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-indigo-900/95 to-slate-900">
        <div className="rounded-2xl bg-white/10 px-6 py-4 backdrop-blur-xl border border-white/20">
          <span className="text-sm text-white/90">در حال بارگذاری...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    router.replace('/admin');
    return null;
  }

  async function onSubmit(data: LoginFormData) {
    const res = await login({
      username: data.username.trim(),
      password: data.password,
    });
    if (res.success) {
      router.replace('/admin');
      return;
    }
    toast.error(res.message || 'نام کاربری یا رمز عبور اشتباه است.');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-indigo-900/95 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),transparent)]" />
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-slate-500/15 blur-3xl" />

      <div className="relative w-full max-w-[360px] rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur border border-white/30 mb-4">
            <span className="text-2xl text-white">🔐</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-white/70 mt-1">ورود به پنل مدیریت</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5" noValidate>
          <Input
            label="نام کاربری"
            {...register('username', {
              required: 'نام کاربری را وارد کنید.',
              maxLength: { value: 100, message: 'نام کاربری طولانی است.' },
            })}
            autoComplete="username"
            placeholder="نام کاربری را وارد کنید"
            labelClassName="text-white/80"
            className="bg-white/15 border-white/30 text-white placeholder:text-white/50 focus:ring-white/40 focus:border-white/40 rounded-xl py-2.5"
            error={errors.username?.message}
          />
          <Input
            label="رمز عبور"
            type={showPassword ? 'text' : 'password'}
            {...register('password', {
              required: 'رمز عبور را وارد کنید.',
              maxLength: { value: 200, message: 'رمز عبور طولانی است.' },
            })}
            autoComplete="current-password"
            placeholder="••••••••"
            labelClassName="text-white/80"
            className="bg-white/15 text-white placeholder:text-white/50 focus:ring-white/40 focus:border-white/40 rounded-xl rounded-e-none py-2.5"
            error={errors.password?.message}
            suffixWrapperClassName="rounded-xl border-white/30 bg-white/5 [&:has(input:focus)]:ring-white/40"
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors rounded-e-xl"
                title={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
                aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
              >
                {showPassword ? <EyeClosed /> : <EyeOpen />}
              </button>
            }
          />
          <Button
            type="submit"
            fullWidth
            loading={isSubmitting}
            className="mt-2 rounded-xl py-3 bg-white/25 hover:bg-white/35 border border-white/30 text-white font-semibold shadow-lg"
          >
            ورود
          </Button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { api } from '@/lib/axios';
import { Card, Button } from '@/components/ui';

export default function AdminTelegramPage() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ connected: boolean; message: string; username?: string } | null>(null);

  const handleCheckConnection = () => {
    setResult(null);
    setChecking(true);
    api
      .get<{ connected: boolean; message: string; username?: string }>('/api/telegram/check')
      .then((res) => setResult(res.data))
      .catch(() => setResult({ connected: false, message: 'خطا در ارتباط با سرور برنامه.' }))
      .finally(() => setChecking(false));
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold text-white">تلگرام</h1>
        <p className="text-xs text-white/50 mt-0.5">تنظیمات و پیوند مربوط به تلگرام</p>
      </header>
      <Card variant="glass" className="border-white/20">
        <h2 className="text-sm font-medium text-white/90 mb-3">بررسی ارتباط</h2>
        <p className="text-xs text-white/60 mb-4">
          با زدن دکمه زیر، ارتباط ربات با سرور تلگرام بررسی می‌شود.
        </p>
        <Button
          type="button"
          onClick={handleCheckConnection}
          disabled={checking}
          loading={checking}
          className="bg-white/20 text-white border border-white/30 hover:bg-white/30"
        >
          بررسی ارتباط
        </Button>
        {result && (
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              result.connected
                ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
                : 'bg-amber-500/20 border border-amber-400/40 text-amber-200'
            }`}
          >
            <p className="font-medium">{result.message}</p>
            {result.username && (
              <p className="text-xs mt-1 opacity-90">نام کاربری ربات: @{result.username}</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

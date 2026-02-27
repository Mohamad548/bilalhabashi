'use client';

import React from 'react';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

/** تبدیل رشته‌های مثل 01/01/1395 به 1395-01-01 */
export function normalizeJoinDate(str: string | undefined | null): string {
  const s = str != null ? String(str) : '';
  if (!s.trim()) return '';
  const trimmed = s.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/').map((p) => p.trim());
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (c.length >= 4) return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
      if (a.length >= 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
    }
  }
  return trimmed;
}

interface DatePickerShamsiProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  error?: string;
  labelClassName?: string;
}

export function DatePickerShamsi({
  value = '',
  onChange,
  placeholder = 'انتخاب تاریخ',
  className = '',
  label,
  error,
  labelClassName = 'text-white/80',
}: DatePickerShamsiProps) {
  const normalized = normalizeJoinDate(value);
  const valueForPicker = normalized ? normalized.replace(/-/g, '/') : undefined;

  return (
    <div className="w-full">
      {label && (
        <label className={`block text-xs mb-1.5 ${labelClassName}`}>{label}</label>
      )}
      <DatePicker
        calendar={persian}
        locale={persian_fa}
        value={valueForPicker || null}
        onChange={(d: { format: (s: string) => string } | null) => {
          onChange(d ? d.format('YYYY-MM-DD') : '');
        }}
        format="YYYY/MM/DD"
        inputMode="none"
        containerClassName="w-full"
        inputClass={[
          'w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm',
          'focus:outline-none focus:ring-1 focus:ring-white/40 placeholder:text-white/50',
          error ? 'border-red-400 focus:ring-red-400' : '',
          className,
        ].filter(Boolean).join(' ')}
        placeholder={placeholder}
        calendarPosition="bottom-right"
      />
      {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

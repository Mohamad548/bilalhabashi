'use client';

import React, { forwardRef, useState } from 'react';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function toEnglishDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (c) => String(PERSIAN_DIGITS.indexOf(c)));
}

function parseDigits(value: string): string {
  const en = toEnglishDigits(value);
  return en.replace(/\D/g, '');
}

function formatWithSeparator(value: string): string {
  const digits = parseDigits(value);
  if (digits === '') return '';
  const num = Number(digits);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat('fa-IR').format(num);
}

interface FormattedNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  labelClassName?: string;
}

export const FormattedNumberInput = forwardRef<HTMLInputElement, FormattedNumberInputProps>(
  function FormattedNumberInput(
    { value = '', onChange, label, error, labelClassName = '', className = '', id, ...props },
    ref
  ) {
    const [focused, setFocused] = useState(false);
    const displayValue = focused ? (value === '' ? '' : formatWithSeparator(value)) : formatWithSeparator(value);
    const inputId = id || `formatted-num-${Math.random().toString(36).slice(2, 9)}`;

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      const digits = parseDigits(raw);
      onChange?.(digits);
    }

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={`block text-xs mb-0.5 ${labelClassName || 'text-slate-500'}`}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={[
            'w-full text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-1',
            error
              ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
              : 'border-slate-200 focus:ring-slate-400 focus:border-slate-400',
            className,
          ].filter(Boolean).join(' ')}
          {...props}
        />
        {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

'use client';

import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  labelClassName?: string;
  suffix?: React.ReactNode;
  suffixWrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, labelClassName = '', className = '', id, suffix, suffixWrapperClassName = '', ...props },
  ref
) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
  const inputClassName = [
    'text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400',
    error && 'border-red-400 focus:ring-red-400 focus:border-red-400',
    suffix ? 'flex-1 min-w-0 border-0 rounded-s-lg' : 'w-full rounded-lg border border-slate-200',
    className,
  ].filter(Boolean).join(' ');

  const inputEl = (
    <input
      ref={ref}
      id={inputId}
      className={inputClassName}
      {...props}
    />
  );

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={`block text-xs mb-0.5 ${labelClassName || 'text-slate-500'}`}>
          {label}
        </label>
      )}
      {suffix ? (
        <div className={`flex rounded-lg border border-slate-200 overflow-hidden [&:has(input:focus)]:ring-1 [&:has(input:focus)]:ring-slate-400 ${suffixWrapperClassName}`}>
          {inputEl}
          <div className="flex items-center shrink-0">{suffix}</div>
        </div>
      ) : (
        inputEl
      )}
      {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
    </div>
  );
});

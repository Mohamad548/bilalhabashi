'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  loading?: boolean;
}

const styles = {
  base: 'rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
  primary: 'bg-slate-800 text-white hover:bg-slate-700 active:bg-slate-900',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  sizeSm: 'text-xs px-3 py-1.5',
  sizeMd: 'text-sm px-4 py-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        styles.base,
        styles[variant],
        size === 'sm' ? styles.sizeSm : styles.sizeMd,
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? '...' : children}
    </button>
  );
}

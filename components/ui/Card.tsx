'use client';

import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass';
  onClick?: () => void;
}

export function Card({ title, children, className = '', variant = 'default', onClick }: CardProps) {
  const isGlass = variant === 'glass';
  const baseClass = isGlass
    ? 'rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-4 shadow-lg'
    : 'rounded-lg border border-slate-200 bg-white p-3';
  const titleClass = isGlass ? 'text-xs font-medium text-white/80 mb-2' : 'text-xs font-medium text-slate-600 mb-2';
  const contentClass = isGlass ? 'text-white' : '';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`${baseClass} ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {title && <h3 className={titleClass}>{title}</h3>}
      <div className={contentClass}>{children}</div>
    </div>
  );
}

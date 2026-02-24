'use client';

import React, { useEffect } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** اگر false باشد، کلیک روی پس‌زمینه (اورلی) مودال را نمی‌بندد. پیش‌فرض: true */
  closeOnOverlayClick?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = {
    sm: 'max-w-xs',
    md: 'max-w-sm',
    lg: 'max-w-md',
  }[size];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden
      />
      <div
        className={`relative w-full ${sizeClass} rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id="modal-title" className="text-base font-semibold text-white mb-4">
            {title}
          </h2>
        )}
        <div className="text-white/90 text-sm">{children}</div>
        {footer != null && (
          <div className="mt-5 flex gap-2 justify-end flex-wrap">{footer}</div>
        )}
      </div>
    </div>
  );
}

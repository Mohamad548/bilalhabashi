'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Member } from '@/types';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
function toEnglishDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (c) => String(PERSIAN_DIGITS.indexOf(c)));
}
function normalizeSearch(str: string): string {
  return toEnglishDigits(String(str)).replace(/\s+/g, ' ').trim();
}

interface MemberSearchSelectProps {
  value: string;
  onChange: (memberId: string) => void;
  members: Member[];
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  labelClassName?: string;
}

export function MemberSearchSelect({
  value,
  onChange,
  members,
  placeholder = 'جستجو نام یا شماره تماس عضو...',
  label,
  error,
  className = '',
  labelClassName = 'text-white/80',
}: MemberSearchSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMember = value ? members.find((m) => m.id === value) : null;
  const q = normalizeSearch(searchQuery);
  const filtered =
    !q && !selectedMember
      ? members.slice(0, 50)
      : members.filter((m) => {
          const nameMatch = normalizeSearch(m.fullName).includes(q);
          const phoneMatch = normalizeSearch(m.phone).includes(q);
          return nameMatch || phoneMatch;
        });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = selectedMember
    ? `${selectedMember.fullName} — ${selectedMember.phone}`
    : searchQuery;

  function handleSelect(m: Member) {
    onChange(m.id);
    setSearchQuery('');
    setIsOpen(false);
  }

  function handleClear() {
    onChange('');
    setSearchQuery('');
    setIsOpen(true);
  }

  function handleFocus() {
    if (!selectedMember) setIsOpen(true);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
  }

  const showDropdown = isOpen && (filtered.length > 0 || !selectedMember);
  const inputReadOnly = !!selectedMember;

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label className={`block text-xs mb-1.5 ${labelClassName}`}>{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          readOnly={inputReadOnly}
          placeholder={placeholder}
          className={[
            'w-full rounded-xl border bg-white/10 text-white px-3 py-2 text-sm ps-9',
            'focus:outline-none focus:ring-1 focus:ring-white/40 placeholder:text-white/50',
            'border-white/20',
            error ? 'border-red-400 focus:ring-red-400' : '',
            className,
          ].filter(Boolean).join(' ')}
          aria-label={label || 'انتخاب عضو'}
          aria-expanded={showDropdown}
        />
        <div className="absolute start-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {selectedMember ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10"
              aria-label="پاک کردن انتخاب"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <span className="text-white/50" aria-hidden>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          )}
        </div>
      </div>
      {showDropdown && (
        <ul
          className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-white/20 bg-slate-800/95 backdrop-blur-xl shadow-xl py-1"
          role="listbox"
        >
          {filtered.slice(0, 80).map((m) => (
            <li
              key={m.id}
              role="option"
              aria-selected={value === m.id}
              onClick={() => handleSelect(m)}
              className="px-3 py-2 text-sm text-white cursor-pointer hover:bg-white/15 transition-colors"
            >
              <span className="font-medium">{m.fullName}</span>
              <span className="text-white/60 mr-2"> — {m.phone}</span>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-4 text-sm text-white/50 text-center">
              عضوی یافت نشد.
            </li>
          )}
        </ul>
      )}
      {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

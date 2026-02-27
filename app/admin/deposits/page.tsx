'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { Card } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import type { Payment, Member } from '@/types';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
function toEnglishDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (c) => String(PERSIAN_DIGITS.indexOf(c)));
}
function normalizeSearch(str: string): string {
  return toEnglishDigits(str).replace(/\s+/g, ' ').trim();
}

export default function DepositsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Payment[]>('/api/payments'),
      api.get<Member[]>('/api/members'),
    ])
      .then(([pRes, mRes]) => {
        setPayments(pRes.data);
        setMembers(mRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const deposits = useMemo(
    () => (payments || []).filter((p) => p.type === 'contribution'),
    [payments]
  );

  const getMemberName = (id: string) =>
    members.find((m) => String(m.id) === String(id))?.fullName || '—';

  /** لیست یکتای اعضا که حداقل یک واریز سپرده دارند + خلاصه برای هر عضو */
  const membersWithDeposits = useMemo(() => {
    const byMember = new Map<string, { count: number; total: number }>();
    for (const p of deposits) {
      const cur = byMember.get(p.memberId) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += p.amount;
      byMember.set(p.memberId, cur);
    }
    return Array.from(byMember.entries())
      .map(([memberId]) => ({
        memberId,
        memberName: getMemberName(memberId),
        count: byMember.get(memberId)!.count,
        total: byMember.get(memberId)!.total,
      }))
      .sort((a, b) => (a.memberName || '').localeCompare(b.memberName || '', 'fa'));
  }, [deposits, members]);

  const filteredMembersWithDeposits = useMemo(() => {
    const q = normalizeSearch(searchQuery);
    if (!q) return membersWithDeposits;
    return membersWithDeposits.filter((m) => {
      const nameMatch = normalizeSearch(m.memberName).includes(q);
      const numQuery = q.replace(/\D/g, '');
      const amountMatch = numQuery.length > 0 && (String(m.total).includes(numQuery) || String(m.count).includes(numQuery));
      return nameMatch || amountMatch;
    });
  }, [membersWithDeposits, searchQuery]);

  const totalAmount = useMemo(
    () => deposits.reduce((sum, p) => sum + p.amount, 0),
    [deposits]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-base font-semibold text-white">سپرده</h1>

      {/* جمع کل */}
      <Card variant="glass">
        <p className="text-xs text-white/70 mb-1">جمع سپرده‌ها</p>
        <p className="text-lg font-semibold text-white">
          {loading ? '—' : formatCurrency(totalAmount)}
        </p>
      </Card>

      {/* جستجو */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-white/60 shrink-0" aria-hidden>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس نام، مبلغ، تاریخ..."
            className="w-full min-w-0 bg-transparent text-white placeholder:text-white/50 text-sm py-1.5 focus:outline-none"
            aria-label="جستجو در سپرده‌ها"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="shrink-0 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="پاک کردن جستجو"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* لیست اعضا (یکتا — ریز واریزها در صفحه جزئیات هر عضو) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-medium text-white/90">لیست اعضا</h2>
          <span className="text-xs text-white/70">
            {loading ? '—' : `${filteredMembersWithDeposits.length} نفر`}
          </span>
        </div>
        {loading ? (
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-4 inline-block">
            <p className="text-sm text-white/80">در حال بارگذاری...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMembersWithDeposits.map((m) => (
              <Card
                key={m.memberId}
                variant="glass"
                onClick={() => router.push(`/admin/deposits/${m.memberId}`)}
              >
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium text-white">{m.memberName}</p>
                    <p className="text-xs text-white/60">
                      {m.count} مورد واریز — جمع {formatCurrency(m.total)}
                    </p>
                  </div>
                  <span className="text-xs text-white/80 shrink-0">جزئیات</span>
                </div>
              </Card>
            ))}
          </div>
        )}
        {!loading && membersWithDeposits.length === 0 && (
          <p className="text-sm text-white/60 text-center py-6">هنوز واریز سپرده‌ای ثبت نشده است.</p>
        )}
        {!loading && membersWithDeposits.length > 0 && filteredMembersWithDeposits.length === 0 && (
          <p className="text-sm text-white/60 text-center py-6">نتیجه‌ای برای جستجو یافت نشد.</p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '@/lib/axios';
import { Card, Button, Modal } from '@/components/ui';
import { formatDateShort } from '@/utils/format';
import type { LoanRequest, Member } from '@/types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'همه' },
  { value: 'pending', label: 'در انتظار' },
  { value: 'approved', label: 'تأیید شده' },
  { value: 'rejected', label: 'رد شده' },
] as const;

const statusLabel: Record<string, string> = {
  pending: 'در انتظار',
  approved: 'تأیید شده',
  rejected: 'رد شده',
};

function formatRequestDate(iso?: string): { date: string; time: string } {
  if (!iso?.trim()) return { date: '—', time: '' };
  const [d, t] = iso.split('T');
  const date = formatDateShort(d);
  const time = t ? t.slice(0, 5).replace(/\d/g, (c) => '۰۱۲۳۴۵۶۷۸۹'[Number(c)]) : '';
  return { date, time };
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === 'pending'
      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
      : status === 'approved'
        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
        : 'bg-red-500/20 text-red-300 border border-red-400/40';
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${style}`}>
      {statusLabel[status] ?? status}
    </span>
  );
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ requestId: string; reason: string } | null>(null);

  function loadRequests() {
    setLoading(true);
    Promise.all([
      api.get<LoanRequest[]>('/api/loanRequests'),
      api.get<Member[]>('/api/members'),
    ])
      .then(([reqRes, memRes]) => {
        setRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
        setMembers(Array.isArray(memRes.data) ? memRes.data : []);
      })
      .catch(() => toast.error('خطا در بارگذاری درخواست‌ها.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const memberByChatId = useMemo(() => {
    const map: Record<string, Member> = {};
    members.forEach((m) => {
      if (m.telegramChatId) map[String(m.telegramChatId)] = m;
    });
    return map;
  }, [members]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  function submitReject(id: string, reason: string) {
    if (!rejectModal) return;
    setUpdatingId(id);
    const body = { status: 'rejected' as const, rejectReason: reason.trim() || undefined };
    api
      .patch<LoanRequest>(`/api/loanRequests/${id}`, body)
      .then(() => {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected', rejectReason: reason.trim() || undefined } : r)));
        setRejectModal(null);
        toast.success('درخواست رد شد و پیام به کاربر ارسال شد.');
        return api.post(`/api/loanRequests/${id}/notifyRejection`, { reason: reason.trim() });
      })
      .catch(() => {
        toast.error('خطا در به‌روزرسانی وضعیت.');
      })
      .finally(() => setUpdatingId(null));
  }

  function updateStatus(id: string, status: 'approved' | 'rejected') {
    if (status === 'rejected') {
      setRejectModal({ requestId: id, reason: '' });
      return;
    }
    setUpdatingId(id);
    api
      .patch<LoanRequest>(`/api/loanRequests/${id}`, { status })
      .then(() => {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
        toast.success('درخواست تأیید شد و پیام به کاربر ارسال شد.');
        return api.post(`/api/loanRequests/${id}/notifyApproval`);
      })
      .catch(() => toast.error('خطا در به‌روزرسانی وضعیت.'))
      .finally(() => setUpdatingId(null));
  }

  return (
    <div className="p-4 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">درخواست‌های وام</h1>
        <p className="text-sm text-white/70">
          درخواست‌های ثبت‌شده از طریق ربات تلگرام؛ می‌توانید وضعیت را تأیید یا رد کنید.
        </p>
      </header>

      <div className="flex flex-wrap items-stretch gap-2 mb-4">
        <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 overflow-hidden">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="min-h-[42px] bg-transparent text-white text-sm px-4 py-2 pr-8 focus:outline-none focus:ring-0 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.6)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'left 0.5rem center',
              backgroundSize: '1.25rem',
            }}
            aria-label="فیلتر وضعیت"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-slate-800 text-white">
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-4 text-sm text-white/80">
          {loading ? '—' : `${filtered.length} مورد`}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-8 text-center">
          <p className="text-white/80">در حال بارگذاری درخواست‌ها...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card variant="glass" className="p-8 text-center">
          <p className="text-white/70">
            {requests.length === 0
              ? 'هنوز درخواستی از ربات تلگرام ثبت نشده است.'
              : 'درخواستی با این وضعیت یافت نشد.'}
          </p>
        </Card>
      ) : (
        <ul className="space-y-3 list-none p-0 m-0">
          {filtered.map((req) => {
            const { date, time } = formatRequestDate(req.createdAt);
            const member = memberByChatId[String(req.telegramChatId)];
            return (
              <li key={req.id}>
                <Card variant="glass" className="p-4">
                  <div className="flex flex-wrap gap-4 items-start justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-base font-semibold text-white truncate">
                        {member ? member.fullName : (req.userName || '—')}
                      </p>
                      {member ? (
                        <p className="text-xs text-white/60">
                          تلفن: {member.phone}
                          {member.nationalId ? ` · کد ملی: ${member.nationalId}` : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-white/60 font-mono">
                          Chat ID: {req.telegramChatId || '—'}
                          {req.userName ? ` · @${req.userName}` : ''}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
                        <span>{date}</span>
                        {time && (
                          <>
                            <span className="text-white/50">|</span>
                            <span>{time}</span>
                          </>
                        )}
                      </div>
                      {req.status === 'rejected' && req.rejectReason && (
                        <p className="text-xs text-red-300/90 mt-1">علت رد: {req.rejectReason}</p>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                      <StatusBadge status={req.status} />
                      {req.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30"
                            onClick={() => updateStatus(req.id, 'approved')}
                            disabled={updatingId === req.id}
                          >
                            {updatingId === req.id ? '…' : 'تأیید'}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-red-500/20 text-red-300 border-red-400/40 hover:bg-red-500/30"
                            onClick={() => updateStatus(req.id, 'rejected')}
                            disabled={updatingId === req.id}
                          >
                            رد
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title="علت رد درخواست وام"
        size="lg"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRejectModal(null)}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-red-500/20 text-red-300 border-red-400/40 hover:bg-red-500/30"
              disabled={!rejectModal?.reason.trim() || updatingId === rejectModal?.requestId}
              onClick={() => rejectModal && submitReject(rejectModal.requestId, rejectModal.reason)}
            >
              {updatingId === rejectModal?.requestId ? '…' : 'ثبت رد و ارسال پیام'}
            </Button>
          </>
        }
      >
        {rejectModal && (
          <div className="space-y-3">
            <p className="text-sm text-white/80">این متن به کاربر در تلگرام ارسال می‌شود.</p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => (prev ? { ...prev, reason: e.target.value } : null))}
              placeholder="علت رد را بنویسید..."
              className="w-full min-h-[120px] rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/40 resize-y"
              rows={4}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

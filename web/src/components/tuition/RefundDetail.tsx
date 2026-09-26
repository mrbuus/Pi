'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Banknote, Check, Clock3, XCircle } from 'lucide-react';
import { api, getRole } from '@/lib/api';
import { ErrorState, LoadingState } from '@/components/ui/StateBlock';
import { formatDate, formatDateTime, formatMoney } from './format';
import RefundStatusBadge from './RefundStatusBadge';
import { REFUND_WARNING_TEXT, type RefundDetail as RefundRecord } from './types';

type Action = 'pending' | 'approve' | 'paid' | 'cancel';

const ACTION_INFO: Record<Action, { title: string; confirm: string; path: string }> = {
  pending: { title: 'Зөвшөөрөлд илгээх', confirm: 'Зөвшөөрөлд илгээх', path: 'pending' },
  approve: { title: 'Буцаалтыг зөвшөөрөх', confirm: 'Зөвшөөрөх', path: 'approve' },
  paid: { title: 'Олгосон гэж тэмдэглэх', confirm: 'Олгосон гэж тэмдэглэх', path: 'paid' },
  cancel: { title: 'Буцаалт цуцлах', confirm: 'Цуцлах', path: 'cancel' },
};

export default function RefundDetail({ refundId, joinedOn: initialJoinedOn }: { refundId: string; joinedOn?: string }) {
  const role = getRole();
  const isAdmin = role === 'ADMIN';
  const canManage = isAdmin || role === 'TEACHER_PLUS';
  const [refund, setRefund] = useState<RefundRecord | null>(null);
  const joinedOn = initialJoinedOn ?? '';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('BANK_TRANSFER');
  const [cancelReason, setCancelReason] = useState('');
  const [dialogError, setDialogError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const record = await api<RefundRecord>(`/tuition/refund/${encodeURIComponent(refundId)}`);
      setRefund(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Буцаалтын мэдээлэл авч чадсангүй.');
    } finally {
      setLoading(false);
    }
  }, [refundId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!action) return;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>('input, select, button');
    first?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !actionBusy) {
        event.preventDefault();
        setAction(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [action, actionBusy]);

  function openAction(next: Action, event: React.MouseEvent<HTMLButtonElement>) {
    triggerRef.current = event.currentTarget;
    setActionError('');
    setDialogError('');
    setAction(next);
  }

  function trapDialogTab(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? []);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  async function confirmAction() {
    if (!refund || !action) return;
    if (action === 'cancel' && !cancelReason.trim()) {
      setDialogError('Цуцлах шалтгааныг бичнэ үү.');
      return;
    }
    setActionBusy(true);
    setDialogError('');
    setActionError('');
    try {
      const body = action === 'paid'
        ? { paymentMethod }
        : action === 'cancel'
          ? { cancelReason: cancelReason.trim() }
          : undefined;
      await api(`/tuition/refund/${encodeURIComponent(refundId)}/${ACTION_INFO[action].path}`, { method: 'POST', ...(body ? { body } : {}) });
      setAction(null);
      setCancelReason('');
      setActionMessage('Төлөв шинэчлэгдлээ.');
      setRefreshing(true);
      await load(false);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Өөрчлөлт хадгалж чадсангүй.');
    } finally {
      setActionBusy(false);
      setRefreshing(false);
    }
  }

  if (loading && !refund) return <div className="space-y-4"><Link href="/app/tuition/refunds" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"><ArrowLeft size={17} aria-hidden /> Жагсаалт руу буцах</Link><LoadingState rows={6} label="Буцаалтын мэдээлэл ачаалж байна" /></div>;
  if (!refund) return <div className="space-y-4"><Link href="/app/tuition/refunds" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"><ArrowLeft size={17} aria-hidden /> Жагсаалт руу буцах</Link><ErrorState message={error || 'Буцаалтын мэдээлэл олдсонгүй.'} onRetry={() => void load()} /></div>;

  const canRequest = canManage && refund.status === 'DRAFT';
  const canApprove = isAdmin && ['DRAFT', 'PENDING_APPROVAL'].includes(refund.status);
  const canPay = isAdmin && refund.status === 'APPROVED';
  const canCancel = canManage && ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(refund.status);
  const actionLabel = action ? ACTION_INFO[action].title : '';
  const person = `${refund.student.lastName} ${refund.student.firstName}`;

  return <div className="space-y-5">
    <Link href="/app/tuition/refunds" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><ArrowLeft size={17} aria-hidden /> Буцаалтын жагсаалт руу</Link>
    {error && <ErrorState message={error} onRetry={() => void load(false)} />}
    {actionError && <ErrorState message={actionError} onRetry={() => void load(false)} />}
    {actionMessage && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{actionMessage}</p>}
    {refreshing && <p role="status" className="text-sm text-ink-dim">Шинэ төлөв авч байна...</p>}

    <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-sm text-ink-dim">{refund.classroom.name} <span className="mx-1" aria-hidden>—</span> Ангиас гарсан: {formatDate(refund.leftOn)}</p>
        <h1 className="mt-1 break-words text-2xl font-extrabold text-ink">{person}</h1>
        <p className="mt-1 text-sm text-ink-dim">Буцаалтын бүртгэлийн дугаар: {refund.id}</p>
      </div>
      <RefundStatusBadge status={refund.status} />
    </header>

    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-bold text-ink">Тооцооны дэлгэрэнгүй</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DetailValue label="Сурагч" value={person} />
        <DetailValue label="Анги" value={refund.classroom.name} />
        <DetailValue label="Элссэн огноо" value={joinedOn ? formatDate(joinedOn) : 'Энэ огноо буцаалтын бүртгэлд хадгалагдаагүй'} />
        <DetailValue label="Гарсан огноо" value={formatDate(refund.leftOn)} />
        <DetailValue label="Нийт хичээлийн өдөр" value={`${refund.totalLessonDays} өдөр`} />
        <DetailValue label="Суусан өдөр" value={`${refund.attendedLessonDays} өдөр`} />
        <DetailValue label="Нэг хичээлийн үнэ" value={formatMoney(refund.dailyRate)} />
        <DetailValue label="Төлөх ёстой" value={formatMoney(refund.owed)} />
        <DetailValue label="Төлсөн" value={formatMoney(refund.totalPaid)} />
        <DetailValue label="Буцаах дүн" value={formatMoney(refund.refundAmount)} emphasis="success" />
        <DetailValue label="Дутуу төлбөр" value={formatMoney(refund.shortfall)} emphasis={refund.shortfall ? 'error' : undefined} />
        <DetailValue label="Олгосон арга" value={refund.paymentMethod === 'CASH' ? 'Бэлнээр' : refund.paymentMethod === 'BANK_TRANSFER' ? 'Дансаар' : refund.paymentMethod || '—'} />
      </dl>

      <div className="mt-4 rounded-xl border border-line bg-surface p-4">
        <h3 className="text-sm font-semibold text-ink">Тайлбарын мөрүүд</h3>
        <ol className="mt-2 space-y-1 text-sm text-ink-dim">
          <li>Нийт хичээл: {refund.totalLessonDays} өдөр</li>
          <li>Суусан хичээл: {refund.attendedLessonDays} өдөр</li>
          <li>Нэг хичээлийн үнэ: {formatMoney(refund.dailyRate)}</li>
          <li>Төлөх ёстой: {formatMoney(refund.owed)}</li>
          <li>Баталгаажсан төлбөр: {formatMoney(refund.totalPaid)}</li>
          <li>{refund.refundAmount > 0 ? `Буцаах дүн: ${formatMoney(refund.refundAmount)}` : refund.shortfall > 0 ? `Дутуу төлбөр: ${formatMoney(refund.shortfall)}` : 'Тооцоо тэнцсэн. Буцаах болон нэхэх дүн байхгүй.'}</li>
        </ol>
      </div>
    </section>

    {refund.warnings.length > 0 && <section className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
      <h2 className="font-bold text-warning">Тооцоонд анхаарах зүйл</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-warning">{refund.warnings.map((warning) => <li key={warning}>{REFUND_WARNING_TEXT[warning]}</li>)}</ul>
    </section>}
    {refund.note && <section className="rounded-2xl border border-line bg-surface p-4"><h2 className="font-semibold text-ink">Тайлбар</h2><p className="mt-1 whitespace-pre-wrap text-sm text-ink-dim">{refund.note}</p></section>}
    {refund.cancelReason && <section className="rounded-2xl border border-error/30 bg-error/10 p-4"><h2 className="font-semibold text-error">Цуцалсан шалтгаан</h2><p className="mt-1 whitespace-pre-wrap text-sm text-ink">{refund.cancelReason}</p></section>}

    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="text-base font-bold text-ink">Төлөвийн түүх</h2>
      <ul className="mt-3 space-y-3 text-sm">
        <Audit label="Ноорог үүсгэсэн" person={refund.createdBy} date={refund.createdAt} />
        {refund.approvedAt && <Audit label="Зөвшөөрсөн" person={refund.approvedBy} date={refund.approvedAt} />}
        {refund.paidAt && <Audit label="Олгосон гэж тэмдэглэсэн" person={refund.paidBy} date={refund.paidAt} />}
        {refund.cancelledAt && <Audit label="Цуцалсан" person={refund.cancelledBy} date={refund.cancelledAt} />}
      </ul>
    </section>

    {(canRequest || canApprove || canPay || canCancel) && <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-bold text-ink">Боломжтой үйлдэл</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {canRequest && <ActionButton icon={Clock3} onClick={(event) => openAction('pending', event)}>Зөвшөөрөлд илгээх</ActionButton>}
        {canApprove && <ActionButton icon={Check} onClick={(event) => openAction('approve', event)}>Зөвшөөрөх</ActionButton>}
        {canPay && <ActionButton icon={Banknote} onClick={(event) => openAction('paid', event)}>Олгосон гэж тэмдэглэх</ActionButton>}
        {canCancel && <ActionButton icon={XCircle} danger onClick={(event) => openAction('cancel', event)}>Цуцлах</ActionButton>}
      </div>
    </section>}

    {action && <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !actionBusy) setAction(null); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="refund-confirm-title" onKeyDown={trapDialogTab} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 elev-3 sm:rounded-2xl">
        <h2 id="refund-confirm-title" className="text-lg font-bold text-ink">{actionLabel}</h2>
        <p className="mt-3 text-sm text-ink-dim">Та <strong className="text-ink">{person}</strong> сурагчийн <strong className="text-ink">{formatMoney(refund.refundAmount)}</strong> дүнтэй буцаалтын төлөвийг өөрчлөх гэж байна.</p>
        {action === 'paid' && <div className="mt-4">
          <label htmlFor="refund-payment-method" className="mb-1 block text-sm font-semibold text-ink">Олгосон арга</label>
          <select id="refund-payment-method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'CASH' | 'BANK_TRANSFER')} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-brand">
            <option value="CASH">Бэлнээр</option>
            <option value="BANK_TRANSFER">Дансаар</option>
          </select>
        </div>}
        {action === 'cancel' && <div className="mt-4">
          <label htmlFor="refund-cancel-reason" className="mb-1 block text-sm font-semibold text-ink">Цуцлах шалтгаан</label>
          <textarea id="refund-cancel-reason" required minLength={1} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={3} className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-brand" />
        </div>}
        {dialogError && <p role="alert" className="mt-3 rounded-lg bg-error/10 p-3 text-sm text-error">{dialogError}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setAction(null)} disabled={actionBusy} className="min-h-11 rounded-xl border border-line px-4 py-2 font-semibold text-ink hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50">Буцах</button>
          <button type="button" onClick={() => void confirmAction()} disabled={actionBusy || (action === 'cancel' && !cancelReason.trim())} className={`min-h-11 rounded-xl px-4 py-2 font-semibold text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50 ${action === 'cancel' ? 'bg-error' : 'bg-brand hover:bg-brand/90'}`}>{actionBusy ? 'Хадгалж байна...' : ACTION_INFO[action].confirm}</button>
        </div>
      </div>
    </div>}
  </div>;
}

function DetailValue({ label, value, emphasis }: { label: string; value: string; emphasis?: 'success' | 'error' }) {
  const cls = emphasis === 'success' ? 'text-success' : emphasis === 'error' ? 'text-error' : 'text-ink';
  return <div className="min-w-0 rounded-xl border border-line bg-surface p-3"><dt className="text-xs text-ink-dim">{label}</dt><dd className={`mt-1 break-words text-sm font-semibold ${cls}`}>{value}</dd></div>;
}

function Audit({ label, person, date }: { label: string; person?: { firstName: string; lastName: string } | null; date: string }) {
  return <li className="flex flex-wrap justify-between gap-x-3 gap-y-1 border-b border-line pb-2 last:border-0 last:pb-0"><span className="font-medium text-ink">{label}</span><span className="text-ink-dim">{person ? `${person.lastName} ${person.firstName}` : '—'} <span className="mx-1" aria-hidden>—</span> {formatDateTime(date)}</span></li>;
}

function ActionButton({ icon: Icon, children, onClick, danger = false }: { icon: typeof Check; children: string; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${danger ? 'border border-error/30 bg-error/10 text-error hover:bg-error/20' : 'bg-brand text-on-brand hover:bg-brand/90'}`}><Icon className="h-4 w-4" aria-hidden />{children}</button>;
}

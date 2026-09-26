'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Archive, MoreVertical, Pencil, UsersRound } from 'lucide-react';
import RequireRole from '@/components/nav/RequireRole';
import { Meta } from '@/components/ui/Meta';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateBlock';
import { api } from '@/lib/api';

interface Classroom {
  id: string;
  name: string;
  type: string;
  grade?: number | null;
  teacher?: { firstName: string; lastName: string } | null;
  _count?: { enrollments: number };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Үйлдэл амжилтгүй боллоо.';
}

export default function ClassroomsClient() {
  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [disbandTarget, setDisbandTarget] = useState<Classroom | null>(null);
  const [disbandConfirmText, setDisbandConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [disbandError, setDisbandError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setClassrooms(await api<Classroom[]>('/classrooms'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function disband() {
    if (!disbandTarget || disbandConfirmText !== disbandTarget.name || busy) return;
    setBusy(true);
    setDisbandError('');
    setMessage('');
    try {
      await api(`/classrooms/${encodeURIComponent(disbandTarget.id)}/disband`, { method: 'POST', body: {} });
      setDisbandTarget(null);
      setDisbandConfirmText('');
      setMessage('Ангийн идэвхтэй сурагчдыг гаргалаа. Түүх хадгалагдсан.');
      await load();
    } catch (err) {
      setDisbandError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return <RequireRole allow={['ADMIN', 'TEACHER_PLUS']}>
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">Ангиуд</h1>
        <p className="mt-1 text-sm text-ink-dim">Ангийн мэдээлэл болон сурагчдын бүртгэлийг удирдана.</p>
      </header>
      {message && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{message}</p>}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading && <LoadingState rows={4} label="Ангиуд ачаалж байна" />}
      {!loading && !error && classrooms?.length === 0 && <EmptyState icon={UsersRound} title="Идэвхтэй анги алга" hint="Идэвхтэй сургалтын анги шинээр бүртгэх үед энд харагдана." />}
      {!loading && !error && Boolean(classrooms?.length) && <ul className="grid gap-3 sm:grid-cols-2">
        {classrooms?.map((classroom) => <li key={classroom.id} className="relative rounded-2xl border border-line bg-surface p-4 elev-1">
          <Link href={`/app/admin/classrooms/${encodeURIComponent(classroom.id)}`} className="block min-h-24 rounded-lg pr-12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <h2 className="break-words text-lg font-bold text-ink">{classroom.name}</h2>
            <div className="mt-2 text-sm text-ink-dim"><Meta items={[
              classroom.type === 'ONLINE' ? 'Онлайн' : 'Танхим',
              classroom.grade ? `${classroom.grade}-р анги` : null,
              classroom.teacher ? `${classroom.teacher.lastName} ${classroom.teacher.firstName}` : 'Багш сонгоогүй',
              `${classroom._count?.enrollments ?? 0} сурагч`,
            ]} /></div>
            <span className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"><Pencil size={16} aria-hidden /> Дэлгэрэнгүй удирдах</span>
          </Link>
          <div className="absolute right-3 top-3">
            <button type="button" onClick={() => setOpenMenu(openMenu === classroom.id ? null : classroom.id)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-dim hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand" aria-label={`${classroom.name}-ийн үйлдэл`} aria-expanded={openMenu === classroom.id}>
              <MoreVertical size={18} aria-hidden />
            </button>
            {openMenu === classroom.id && <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-xl border border-line bg-surface p-1 elev-2">
              <button type="button" onClick={() => { setDisbandTarget(classroom); setDisbandConfirmText(''); setOpenMenu(null); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-error hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-brand">
                <Archive size={16} aria-hidden /> Анги тараах
              </button>
            </div>}
          </div>
        </li>)}
      </ul>}
              {disbandTarget && <Dialog title={`«${disbandTarget.name}» ангийг тараах уу?`} onClose={() => !busy && setDisbandTarget(null)} busy={busy} confirmLabel="Ангийг тараах" confirmDisabled={disbandConfirmText !== disbandTarget.name} onConfirm={disband} danger>
        <p className="text-sm text-ink-dim">Идэвхтэй {disbandTarget._count?.enrollments ?? 0} сурагчийг ангиас гаргана. Ирцийн түүх хадгалагдана. Баталгаажуулахын тулд ангийн нэрийг бичнэ үү.</p>
        <label htmlFor="disband-classroom-name" className="mt-4 block text-sm font-semibold text-ink">Ангийн нэр</label>
        <input id="disband-classroom-name" value={disbandConfirmText} onChange={(event) => setDisbandConfirmText(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink focus-visible:outline-2 focus-visible:outline-brand" autoComplete="off" />
        {disbandError && <ErrorState message={disbandError} onRetry={() => void disband()} />}
      </Dialog>}
    </div>
  </RequireRole>;
}

export function Dialog({
  title, children, onClose, onConfirm, confirmLabel, confirmDisabled = false, busy = false, danger = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  busy?: boolean;
  danger?: boolean;
}) {
  const [dialogError, setDialogError] = useState('');
  const [dialogBusy, setDialogBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const node = dialogRef.current;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => node?.querySelector<HTMLElement>('input, select, button')?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      previousFocusRef.current?.focus();
    };
  }, []);
  useEffect(() => {
    const node = dialogRef.current;
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy && !dialogBusy) onClose();
      if (event.key !== 'Tab' || !node) return;
      const controls = Array.from(node.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'));
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [busy, dialogBusy, onClose]);

  async function confirm() {
    if (!onConfirm || confirmDisabled || busy || dialogBusy) return;
    setDialogError('');
    setDialogBusy(true);
    try { await onConfirm(); }
    catch (err) { setDialogError(errorMessage(err)); }
    finally { setDialogBusy(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy && !dialogBusy) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="classroom-dialog-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 elev-3 sm:rounded-2xl">
      <h2 id="classroom-dialog-title" className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
      {dialogError && <ErrorState message={dialogError} onRetry={() => { setDialogError(''); void confirm(); }} />}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} disabled={busy || dialogBusy} className="min-h-11 rounded-xl border border-line px-4 py-2 font-semibold text-ink hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50">Буцах</button>
        {onConfirm && <button type="button" onClick={() => void confirm()} disabled={busy || dialogBusy || confirmDisabled} className={`min-h-11 rounded-xl px-4 py-2 font-semibold text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50 ${danger ? 'bg-error' : 'bg-brand hover:bg-brand/90'}`}>{busy || dialogBusy ? 'Хадгалж байна...' : confirmLabel}</button>}
      </div>
    </div>
  </div>;
}

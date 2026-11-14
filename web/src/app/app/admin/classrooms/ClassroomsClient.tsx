'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Pencil, UsersRound } from 'lucide-react';
import RequireRole from '@/components/nav/RequireRole';
import { Meta } from '@/components/ui/Meta';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateBlock';
import { api } from '@/lib/api';
import { staffName } from "@/lib/personName";

interface Classroom {
  id: string;
  name: string;
  type: string;
  grade?: number | null;
  teacher?: { firstName: string; lastName: string; role?: string | null } | null;
  assistantTeacher?: { firstName: string; lastName: string; role?: string | null } | null;
  _count?: { enrollments: number };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Үйлдэл амжилтгүй боллоо.';
}

export default function ClassroomsClient() {
  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return <RequireRole allow={['ADMIN', 'TEACHER_PLUS']}>
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">Ангиуд</h1>
        <p className="mt-1 text-sm text-ink-dim">Ангийн мэдээлэл болон сурагчдын бүртгэлийг удирдана.</p>
      </header>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading && <LoadingState rows={4} label="Ангиуд ачаалж байна" />}
      {!loading && !error && classrooms?.length === 0 && <EmptyState icon={UsersRound} title="Идэвхтэй анги алга" hint="Идэвхтэй сургалтын анги шинээр бүртгэх үед энд харагдана." />}
      {!loading && !error && Boolean(classrooms?.length) && <ul className="grid gap-3 sm:grid-cols-2">
        {classrooms?.map((classroom) => <li key={classroom.id} className="relative rounded-2xl border border-line bg-surface p-4 elev-1">
          <Link href={`/app/admin/classrooms/${encodeURIComponent(classroom.id)}`} className="block min-h-24 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <h2 className="break-words text-lg font-bold text-ink">{classroom.name}</h2>
            <div className="mt-2 text-sm text-ink-dim"><Meta items={[
              classroom.type === 'ONLINE' ? 'Онлайн' : 'Танхим',
              classroom.grade ? `${classroom.grade}-р анги` : null,
              classroom.teacher ? staffName(classroom.teacher) : 'Багш сонгоогүй',
              classroom.assistantTeacher ? `Туслах: ${staffName(classroom.assistantTeacher)}` : null,
              `${classroom._count?.enrollments ?? 0} сурагч`,
            ]} /></div>
            <span className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"><Pencil size={16} aria-hidden /> Дэлгэрэнгүй удирдах</span>
          </Link>
        </li>)}
      </ul>}
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

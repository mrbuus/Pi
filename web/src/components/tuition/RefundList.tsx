'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LoaderCircle, ClipboardList, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateBlock';
import { formatDate, formatMoney } from './format';
import RefundStatusBadge from './RefundStatusBadge';
import type { RefundListResponse, RefundStatus, RefundRow } from './types';

const PAGE_SIZE = 20;
const FILTERS: { value: RefundStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Бүгд' },
  { value: 'DRAFT', label: 'Ноорог' },
  { value: 'PENDING_APPROVAL', label: 'Зөвшөөрөл хүлээж буй' },
  { value: 'APPROVED', label: 'Зөвшөөрсөн' },
  { value: 'PAID', label: 'Олгосон' },
  { value: 'CANCELLED', label: 'Цуцалсан' },
];

export default function RefundList() {
  const [status, setStatus] = useState<RefundStatus | 'ALL'>('ALL');
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [moreError, setMoreError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const requestSequence = useRef(0);

  const loadPage = useCallback(async (filter: RefundStatus | 'ALL', offset: number, append: boolean) => {
    const requestId = ++requestSequence.current;
    setMoreError('');
    if (append) setLoadingMore(true);
    else { setLoading(true); setError(''); }
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (filter !== 'ALL') params.set('status', filter);
      const result = await api<RefundListResponse>(`/tuition/refunds?${params.toString()}`);
      if (requestId !== requestSequence.current) return;
      setRows((current) => append ? [...current, ...result.refunds] : result.refunds);
      setTotal(result.total);
    } catch {
      if (requestId !== requestSequence.current) return;
      if (append) setMoreError('Дараагийн бүртгэлийг авч чадсангүй. Дахин оролдоно уу.');
      else setError('Буцаалтын жагсаалт авч чадсангүй. Дахин оролдоно уу.');
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPage(status, 0, false), 0);
    return () => window.clearTimeout(timer);
  }, [loadPage, reloadKey, status]);

  function changeStatus(next: RefundStatus | 'ALL') {
    if (next === status) return;
    requestSequence.current += 1;
    setRows([]);
    setTotal(0);
    setMoreError('');
    setStatus(next);
  }

  async function loadMore() {
    await loadPage(status, rows.length, true);
  }

  const hasMore = rows.length < total;
  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Буцаалтын жагсаалт</h1>
        <p className="mt-1 text-sm text-ink-dim">Төлөвөөр шүүж, тооцооны дэлгэрэнгүйг нээнэ үү.</p>
      </div>
      <Link href="/app/tuition" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><Plus className="h-4 w-4" aria-hidden /> Шинэ тооцоо</Link>
    </header>

    <div aria-label="Төлвөөр шүүх" className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => <button key={filter.value} type="button" aria-pressed={status === filter.value} onClick={() => changeStatus(filter.value)} className={`min-h-11 rounded-full border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${status === filter.value ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface text-ink-dim hover:text-ink'}`}>
        {filter.label}
      </button>)}
    </div>

    {error && <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />}
    {loading && <LoadingState rows={4} label="Буцаалтын жагсаалт ачаалж байна" />}
    {!loading && !error && rows.length === 0 && <EmptyState icon={ClipboardList} title={status === 'ALL' ? 'Буцаалтын бүртгэл алга' : 'Энэ төлөвт бүртгэл алга'} hint={status === 'ALL' ? 'Эхлээд тооцоолуураар буцаалтын ноорог үүсгэсний дараа энд харагдана.' : 'Өөр төлөв сонгох эсвэл шинэ тооцоо үүсгэнэ үү.'} action={<Link href="/app/tuition" className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand">Тооцоо үүсгэх</Link>} />}

    {!loading && !error && rows.length > 0 && <>
      <p className="text-sm text-ink-dim">Нийт {total} бүртгэлээс {rows.length}-г харуулж байна.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {rows.map((refund) => <RefundCard key={refund.id} refund={refund} />)}
      </ul>
      {moreError && <ErrorState message={moreError} onRetry={() => void loadMore()} />}
      {hasMore && <div className="flex justify-center">
        <button type="button" onClick={() => void loadMore()} disabled={loadingMore} aria-busy={loadingMore} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 py-2 font-semibold text-ink hover:bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50">
          Цааш үзэх{loadingMore ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
      </div>}
    </>}
  </div>;
}

function RefundCard({ refund }: { refund: RefundRow }) {
  const name = `${refund.student.lastName} ${refund.student.firstName}`;
  return <li>
    <Link href={`/app/tuition/refund/${encodeURIComponent(refund.id)}`} className="block h-full rounded-2xl border border-line bg-surface p-4 elev-1 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="break-words font-bold text-ink">{name}</h2>
          <p className="mt-1 text-sm text-ink-dim">{refund.classroom.name}</p>
        </div>
        <RefundStatusBadge status={refund.status} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-line pt-3 text-sm">
        <div><dt className="text-xs text-ink-dim">Гарсан огноо</dt><dd className="mt-0.5 font-medium text-ink">{formatDate(refund.leftOn)}</dd></div>
        <div><dt className="text-xs text-ink-dim">Үүсгэсэн</dt><dd className="mt-0.5 font-medium text-ink">{formatDate(refund.createdAt)}</dd></div>
        <div><dt className="text-xs text-ink-dim">Төлсөн</dt><dd className="mt-0.5 font-semibold text-ink">{formatMoney(refund.totalPaid)}</dd></div>
        <div><dt className="text-xs text-ink-dim">Буцаах дүн</dt><dd className="mt-0.5 font-semibold text-success">{formatMoney(refund.refundAmount)}</dd></div>
        {refund.shortfall > 0 && <div className="col-span-2"><dt className="text-xs text-ink-dim">Дутуу төлбөр</dt><dd className="mt-0.5 font-semibold text-error">{formatMoney(refund.shortfall)}</dd></div>}
      </dl>
      <span className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand">Дэлгэрэнгүй харах <ArrowRight className="h-4 w-4" aria-hidden /></span>
    </Link>
  </li>;
}

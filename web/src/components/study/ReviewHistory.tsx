"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { Card, CardContent } from "@/components/ui/kit/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";

type HistoryItem = {
  id: string;
  budgetMinutes: number;
  state: string;
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  evidence: {
    assigned: number;
    answered: number;
    firstCorrect: number;
    independentFirstCorrect: number;
    assistedFirst: number;
    correctedWithAssistance: number;
    unknown: number;
  };
};
type HistoryPage = {
  year: number;
  timeZone: string;
  items: HistoryItem[];
  nextCursor: string | null;
  caution: string;
};
const states: Record<string, string> = {
  OPEN: "Үргэлжилж буй", SUBMITTED: "Хаасан", EXPIRED: "Хугацаа дууссан",
};
const currentUBYear = () => Number(new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Ulaanbaatar", year: "numeric",
}).format(new Date()));
const date = (value: string) => new Date(value).toLocaleString("mn-MN", {
  timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit",
});

export default function ReviewHistory({ childId }: { childId?: string }) {
  const id = useId();
  const [year, setYear] = useState(currentUBYear);
  const [draftYear, setDraftYear] = useState(String(year));
  const [data, setData] = useState<HistoryPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryCursor, setRetryCursor] = useState<string | null>(null);
  const sequence = useRef(0);
  const load = useCallback(async (cursor: string | null = null) => {
    const request = ++sequence.current;
    setBusy(true); setError(""); setRetryCursor(cursor);
    const path = childId ? `/study-review/children/${encodeURIComponent(childId)}/history` : "/study-review/history";
    const query = new URLSearchParams({ year: String(year), take: "20" });
    if (cursor) query.set("cursor", cursor);
    try {
      const next = await api<HistoryPage>(`${path}?${query}`);
      if (request !== sequence.current) return;
      setData((previous) => cursor && previous?.year === next.year ? {
        ...next, items: [...previous.items, ...next.items.filter((item) => !previous.items.some((old) => old.id === item.id))],
      } : next);
    } catch (failure) {
      if (request === sequence.current) setError(failure instanceof Error ? failure.message : "Давталтын түүх нээгдсэнгүй.");
    } finally {
      if (request === sequence.current) setBusy(false);
    }
  }, [childId, year]);
  useEffect(() => {
    let cancelled = false;
    const requests = sequence;
    queueMicrotask(() => { if (!cancelled) void load(); });
    return () => { cancelled = true; requests.current++; };
  }, [load]);
  return (
    <div className="min-w-0 space-y-4">
      <p className="text-sm text-ink-dim">Хувийн давталт нь албан шалгалтын дүнгээс тусдаа. Эхний зөв хариулт, тусламжтай бодолт, засвар нь өөр өөр бүртгэл; чадвар эсвэл хурдны үнэлгээ биш.</p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault();
        const next = Number(draftYear);
        if (!Number.isInteger(next) || next < 2000 || next > currentUBYear() + 1) {
          setError("Жилийг 2000 оноос дараа жилийн хооронд сонгоно уу."); return;
        }
        if (next === year) void load(); else { setData(null); setYear(next); }
      }}>
        <label htmlFor={`${id}-year`} className="flex-1 min-w-32 text-sm font-medium">Давталтын жил
          <input id={`${id}-year`} type="number" min={2000} max={currentUBYear() + 1} required
            value={draftYear} onChange={(event) => setDraftYear(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-line bg-surface px-3" />
        </label>
        <Button type="submit" disabled={busy}>Түүх үзэх</Button>
      </form>
      <p className="text-xs text-ink-dim">Огноо: Улаанбаатарын цагаар. Хуучин эрх дууссан ч хураангуй түүх хадгалагдана.</p>
      {busy && <LoadingState rows={2} label="Давталтын түүх ачаалж байна" />}
      {error && <div className="[&_button]:min-h-11"><ErrorState message={error} onRetry={() => void load(retryCursor)} /></div>}
      {!busy && !error && data?.items.length === 0 && <EmptyState title={`${data.year} оны давталтын бүртгэл байхгүй`} hint="Бүртгэлгүй байх нь чадвар эсвэл оролдлого хийгээгүй гэсэн үнэлгээ биш." />}
      {data && <>
        <p className="text-xs text-ink-dim">{data.caution}</p>
        <ul className="space-y-3">
          {data.items.map((item) => <li key={item.id}>
            <Card><CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="text-sm font-semibold">{date(item.startedAt)}</p>
                <p className="text-sm text-ink-dim">{states[item.state] ?? "Бүртгэсэн"} — {item.budgetMinutes} минутын сонголт</p>
              </div>
              <p className="text-sm">Эхний хариулт: {item.evidence.answered}/{item.evidence.assigned}. Эхний зөв: {item.evidence.firstCorrect}; тусламжийн тэмдэглэгээгүй эхний зөв: {item.evidence.independentFirstCorrect}.</p>
              <details>
                <summary className="min-h-11 cursor-pointer text-sm font-medium text-brand">Тусламж ба засварын бүртгэл</summary>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-ink-dim">Тусламжтай эхний хариулт</dt><dd>{item.evidence.assistedFirst}</dd></div>
                  <div><dt className="text-ink-dim">Тусламжтай засвартай бодлого</dt><dd>{item.evidence.correctedWithAssistance}</dd></div>
                  <div><dt className="text-ink-dim">Үнэлгээгүй эсвэл хариулаагүй</dt><dd>{item.evidence.unknown}</dd></div>
                  <div><dt className="text-ink-dim">Хугацааны төгсгөл</dt><dd>{date(item.deadlineAt)}</dd></div>
                  {item.submittedAt && <div><dt className="text-ink-dim">Хаасан огноо</dt><dd>{date(item.submittedAt)}</dd></div>}
                </dl>
              </details>
              {!childId && <Link href={`/app/study/review?run=${encodeURIComponent(item.id)}`} className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-4">Давталт нээх</Link>}
              {!childId && <p className="text-xs text-ink-dim">Бодлогын дэлгэрэнгүй нээхэд одоогийн хичээлийн эрх шалгагдана.</p>}
            </CardContent></Card>
          </li>)}
        </ul>
        {data.nextCursor && <Button variant="outline" disabled={busy} onClick={() => void load(data.nextCursor)}>Өмнөх бүртгэлүүд</Button>}
      </>}
    </div>
  );
}

export function ChildReviewHistory({ childId }: { childId: string }) {
  const [open, setOpen] = useState(false);
  return <details className="rounded-xl border border-line p-4" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="min-h-11 cursor-pointer font-semibold">Хувийн давталтын жилийн түүх</summary>
    {open && <div className="mt-3"><ReviewHistory childId={childId} /></div>}
  </details>;
}

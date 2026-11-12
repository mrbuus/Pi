"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, FilePlus2, ScanLine } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import ExamDialog from "@/components/exams/ExamDialog";
import { correctTone } from "@/components/exams/analytics";
import { errorText } from "@/components/exams/types";
import { dayText, type PaperExamRow } from "./types";

/** «Нэгдсэн шалгалт N» — байгаа хамгийн их дугаарын дараагийнх (эзэн 2026-11-13) */
export function nextTitle(rows: { title: string }[]): string {
  const used = rows.flatMap((r) => {
    const m = r.title.trim().match(/^Нэгдсэн шалгалт\s+(\d+)$/i);
    return m ? [Number(m[1])] : [];
  });
  return `Нэгдсэн шалгалт ${used.length ? Math.max(...used) + 1 : 1}`;
}

const todayUB = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(new Date());

/** Ажилтны «Нэгдсэн шалгалт» жагсаалт + шинээр үүсгэх (Багш+/Админ). */
export default function PaperExamsList({ canManage }: { canManage: boolean }) {
  const [rows, setRows] = useState<PaperExamRow[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    api<PaperExamRow[]>("/paper-exams")
      .then((r) => {
        setError("");
        setRows(r);
      })
      .catch((e) => setError(errorText(e, "Жагсаалтыг ачаалж чадсангүй")));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ScanLine className="size-5 text-brand-soft" aria-hidden />
          <h2 className="font-bold text-brand-soft">Нэгдсэн шалгалт</h2>
        </div>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <FilePlus2 aria-hidden /> Шинэ шалгалт
          </Button>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && rows === null && <SkeletonRows rows={4} />}
      {rows && rows.length === 0 && (
        <EmptyState
          icon={ScanLine}
          title="Нэгдсэн шалгалт алга"
          hint={
            canManage
              ? "Шалгалт үүсгээд машины эсвэл Excel-ийн дүнгээ оруулна."
              : "Багш+ шалгалт үүсгэж дүн оруулсны дараа энд харагдана."
          }
        />
      )}
      {rows && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/app/paper-exams/${r.id}`}
                className="chunky surface-interactive flex min-h-11 items-center gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink">{r.title}</span>
                    {r.published ? <Badge tone="success">Сурагчид нээлттэй</Badge> : <Badge>Нийтлээгүй</Badge>}
                    {r.unmatchedCount > 0 && canManage && (
                      <Badge tone="warning">{r.unmatchedCount} холбогдоогүй</Badge>
                    )}
                  </div>
                  <Meta
                    className="mt-1 text-sm text-ink-dim"
                    items={[
                      dayText(r.heldOn),
                      `${r.itemCount} бодлого`,
                      `${r.sheetCount} сурагч`,
                      r.areaCount < r.itemCount ? `агуулга ${r.areaCount}/${r.itemCount}` : null,
                    ]}
                  />
                </div>
                {r.avgPct !== null && (
                  <Badge tone={correctTone(r.avgPct)} className="shrink-0 text-sm">
                    дундаж {r.avgPct}%
                  </Badge>
                )}
                <ChevronRight className="size-4 shrink-0 text-ink-dim" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {canManage && open && <CreateDialog onOpenChange={setOpen} suggestedTitle={nextTitle(rows ?? [])} />}
    </div>
  );
}

function CreateDialog({ onOpenChange, suggestedTitle }: { onOpenChange: (v: boolean) => void; suggestedTitle: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(suggestedTitle);
  const [heldOn, setHeldOn] = useState(todayUB);
  const [count, setCount] = useState("48");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api<{ id: string }>("/paper-exams", {
        method: "POST",
        body: { title: title.trim(), heldOn, itemCount: Number(count) },
      });
      router.push(`/app/paper-exams/${res.id}?tab=import`);
    } catch (err) {
      setError(errorText(err, "Үүсгэж чадсангүй"));
      setBusy(false);
    }
  }

  const valid = title.trim().length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(heldOn) && Number(count) >= 1 && Number(count) <= 200;
  const field =
    "mt-1 block min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink focus-visible:border-brand-bright";

  return (
    <ExamDialog
      open
      onOpenChange={onOpenChange}
      title="Шинэ нэгдсэн шалгалт"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Болих
          </Button>
          <Button type="submit" form="paper-create" disabled={!valid || busy}>
            Үүсгэх
          </Button>
        </>
      }
    >
      <form id="paper-create" onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-semibold text-ink">
          Нэр
          <input
            className={field}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            autoFocus
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold text-ink">
            Огноо
            <input type="date" className={field} value={heldOn} onChange={(e) => setHeldOn(e.target.value)} />
          </label>
          <label className="block text-sm font-semibold text-ink">
            Бодлогын тоо
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              className={field}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </label>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
      </form>
    </ExamDialog>
  );
}

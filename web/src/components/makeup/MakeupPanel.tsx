"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  ChevronDown,
  CircleCheck,
  ExternalLink,
  FileText,
  ListChecks,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { ATTENDANCE_MARKS, TONE_TEXT } from "@/components/attendance/marks";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Meta } from "@/components/ui/Meta";
import { Button } from "@/components/ui/kit/button";
import { api, fileUrl } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMnDateTime } from "@/lib/dateMn";
import { dayLabel, isOpen, type StaffMakeup, STATUS_CHIP, STATUS_META, testLabel } from "./types";

type Action = "CONFIRM" | "WAIVE" | "REOPEN";

function Chip({ status }: { status: StaffMakeup["status"] }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_CHIP[meta.tone])}>
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

/** Тест бүрийн жижиг тэмдэг: «A» ногоон = хийсэн, саарал = хийгээгүй */
function TestDots({ tests }: { tests: StaffMakeup["tests"] }) {
  if (!tests.length) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {tests.map((t) => (
        <span
          key={t.testId}
          title={`${testLabel(t).title}${t.variant ? ` ${t.variant}` : ""} — ${t.inClass ? "ангид хийсэн" : t.done ? "хийсэн" : "хийгээгүй"}`}
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px] font-bold",
            t.done ? "bg-success/15 text-success" : "bg-ink/8 text-ink-dim",
          )}
        >
          {t.variant ?? "Т"}
          <span className="sr-only">{t.done ? " хийсэн" : " хийгээгүй"}</span>
        </span>
      ))}
    </span>
  );
}

function Row({ item, onSaved }: { item: StaffMakeup; onSaved: (next: StaffMakeup) => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(item.note ?? "");
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const mark = ATTENDANCE_MARKS[item.reason];
  const MarkIcon = mark.icon;
  const panelId = `mk-${item.studentId}-${item.date}`;

  async function act(action: Action) {
    setBusy(action);
    setError("");
    try {
      const next = await api<StaffMakeup>(`/makeup/${item.classroomId}/${item.studentId}/${item.date}`, {
        method: "PUT",
        body: { action, note: note.trim() || null },
      });
      onSaved(next);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(null);
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="row-interactive flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left"
      >
        <MarkIcon className={cn("size-4 shrink-0", TONE_TEXT[mark.tone])} aria-label={mark.label} />
        <span className="min-w-0 flex-1 truncate font-medium text-ink">{item.studentName}</span>
        <TestDots tests={item.tests} />
        <span
          className={cn("inline-flex items-center gap-0.5 text-xs tabular-nums", item.photosAccepted ? "text-success" : "text-ink-dim")}
          title={item.photos ? `${item.photos} хуудас тэмдэглэл` : "Тэмдэглэл илгээгээгүй"}
        >
          <FileText className="size-3.5" aria-hidden />
          {item.photos}
          <span className="sr-only"> хуудас</span>
        </span>
        <Chip status={item.status} />
        <ChevronDown className={cn("size-4 shrink-0 text-ink-dim transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div id={panelId} className="mb-2 ml-6 space-y-3 rounded-xl border border-line bg-panel p-3">
          <Meta
            className="text-xs text-ink-dim"
            items={[
              mark.label,
              item.decidedByName && item.decidedAt
                ? `${item.decision === "WAIVED" ? "Чөлөөлсөн" : item.decision === "REOPENED" ? "Дахин нээсэн" : "Баталсан"}: ${item.decidedByName}, ${formatMnDateTime(item.decidedAt)}`
                : null,
            ]}
          />
          {item.tests.length > 0 && (
            <ul className="space-y-1 text-sm">
              {item.tests.map((t) => {
                const { title, variant } = testLabel(t);
                return (
                  <li key={t.testId} className="flex items-center gap-2">
                    <CircleCheck className={cn("size-4 shrink-0", t.done ? "text-success" : "text-ink-dim/40")} aria-hidden />
                    <span className={t.done ? "text-ink" : "text-ink-dim"}>
                      {title} {variant && <b>{variant}</b>}
                    </span>
                    <span className="text-xs text-ink-dim">{t.inClass ? "ангид" : t.done ? "хийсэн" : "хийгээгүй"}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <FileText className="size-4 text-brand-soft" aria-hidden />
            {item.imageKeys.length ? (
              <>
                <span className="text-ink">{item.photos} хуудас</span>
                {item.submittedAt && <span className="text-xs text-ink-dim">{formatMnDateTime(item.submittedAt)}</span>}
                {item.imageKeys.map((key, i) => (
                  <a key={key} href={fileUrl(key)} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 font-semibold text-brand hover:underline">
                    <ExternalLink className="size-3.5" aria-hidden />
                    {item.imageKeys.length > 1 ? `Нээх ${i + 1}` : "Нээх"}
                  </a>
                ))}
              </>
            ) : (
              <span className="text-ink-dim">Тэмдэглэл илгээгээгүй</span>
            )}
          </div>
          <label className="block">
            <span className="sr-only">Тэмдэглэл (зөвхөн багш нарт)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              placeholder="Тэмдэглэл (зөвхөн багш нарт)"
              className="min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-dim focus-visible:ring-2 focus-visible:ring-brand-bright"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {isOpen(item.status) ? (
              <>
                <Button size="sm" variant="success" disabled={!!busy} onClick={() => act("CONFIRM")}>
                  {busy === "CONFIRM" ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <CircleCheck aria-hidden />}
                  Нөхсөн гэж батлах
                </Button>
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("WAIVE")}>
                  {busy === "WAIVE" ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Ban aria-hidden />}
                  Чөлөөлөх
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("REOPEN")}>
                {busy === "REOPEN" ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <RotateCcw aria-hidden />}
                Дахин нээх
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Ажилтны «Нөхөх хичээл» самбар — анги + өдөр (эсвэл хүрээ). Бусад хуудсанд суулгана:
 *   <MakeupPanel classroomId={id} date="2026-10-18" />
 *   <MakeupPanel classroomId={id} from="2026-09-01" to="2026-10-18" />
 */
export default function MakeupPanel({
  classroomId,
  date,
  from,
  to,
}: {
  classroomId: string;
  date?: string;
  from?: string;
  to?: string;
}) {
  const [items, setItems] = useState<StaffMakeup[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [showDone, setShowDone] = useState(false);

  const query = date ? `date=${date}` : from && to ? `from=${from}&to=${to}` : "";

  const load = useCallback(async () => {
    if (!query) return;
    try {
      setItems(await api<StaffMakeup[]>(`/makeup/classrooms/${classroomId}?${query}`));
      setError("");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Нөхөх хичээлийг нээж чадсангүй");
    }
  }, [classroomId, query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- анги/өдөр солигдоход дахин ачаална
    setItems(null);
    void load();
  }, [load, retry]);

  const save = (next: StaffMakeup) =>
    setItems((prev) => (prev ?? []).map((i) => (i.studentId === next.studentId && i.date === next.date ? next : i)));

  const pending = (items ?? []).filter((i) => isOpen(i.status));
  const closed = (items ?? []).filter((i) => !isOpen(i.status));
  const visible = showDone ? items ?? [] : pending;
  const dates = [...new Set(visible.map((i) => i.date))];

  return (
    <section aria-labelledby={`makeup-panel-${classroomId}`} className="space-y-2">
      <div className="flex items-center gap-2">
        <ListChecks className="size-4 text-brand-soft" aria-hidden />
        <h3 id={`makeup-panel-${classroomId}`} className="font-bold text-ink">
          Нөхөх хичээл
        </h3>
        {items && (
          <span className="text-sm tabular-nums text-ink-dim">
            {pending.length}
            <span className="sr-only"> нөхөөгүй</span>
          </span>
        )}
        {closed.length > 0 && (
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-pressed={showDone}
            className="ml-auto inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-semibold text-brand hover:underline"
          >
            {showDone ? "Нөхөөгүйг л" : `Нөхсөн ч (${closed.length})`}
          </button>
        )}
      </div>
      {!query ? null : error && !items ? (
        <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />
      ) : !items ? (
        <SkeletonRows rows={3} />
      ) : !visible.length ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-3 text-sm text-ink-dim">
          <CircleCheck className="size-4 text-success" aria-hidden />
          {items.length ? "Бүгд нөхсөн" : "Нөхөх сурагч алга"}
        </p>
      ) : (
        <div className="space-y-2">
          {dates.map((d) => (
            <div key={d}>
              {!date && <p className="px-2 pb-0.5 pt-1 text-xs font-semibold text-ink-dim">{dayLabel(d)}</p>}
              <ul className="space-y-0.5">
                {visible
                  .filter((i) => i.date === d)
                  .map((i) => (
                    <Row key={`${i.studentId}:${i.date}`} item={i} onSaved={save} />
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

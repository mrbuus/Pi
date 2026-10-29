"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, ChevronRight, CircleCheck, Clock, Hourglass, Play, RotateCcw } from "lucide-react";
import { HOMEWORK_MARKS, TONE_SELECTED } from "@/components/attendance/marks";
import { dayLabel } from "@/components/makeup/types";
import { PageHeader } from "@/components/ui/Surface";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMnDateTime } from "@/lib/dateMn";
import PhotoButton from "./PhotoButton";
import { cleanTitle, solveHref, todayKeyUB } from "./lib";
import type { HwDay, HwItem, HwMyResponse, HwPhoto } from "./types";

const dayId = (d: HwDay) => `hw-${d.date}-${d.classroomId}`;

function StatusChip({ item }: { item: HwItem }) {
  if (item.status === "SUBMITTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
        <CircleCheck className="size-4" aria-hidden />
        Илгээсэн
        {item.score && (
          <span className="tabular-nums">
            {item.score.correct}/{item.score.total}
          </span>
        )}
      </span>
    );
  }
  if (item.status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-bright/15 px-2.5 py-1 text-xs font-bold text-brand-soft">
        <RotateCcw className="size-3.5" aria-hidden />
        Үргэлжлүүлэх
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink/8 px-2.5 py-1 text-xs font-semibold text-ink-dim">
      <Play className="size-3.5" aria-hidden />
      Эхлээгүй
    </span>
  );
}

function ItemRow({ day, item }: { day: HwDay; item: HwItem }) {
  const title = cleanTitle(item.title, item.variantLabel);
  return (
    <li>
      <Link
        href={solveHref(item.testId, day.date, day.classroomId)}
        className="flex min-h-14 items-center gap-3 py-2.5 transition hover:bg-ink/[0.03] focus-visible:ring-2 focus-visible:ring-brand-bright"
      >
        <BookOpenCheck
          className={cn("size-5 shrink-0", item.status === "SUBMITTED" ? "text-success" : "text-brand-soft")}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="cyrillic-tight block truncate font-semibold text-ink">{title}</span>
          <Meta
            className="mt-0.5 text-xs text-ink-dim"
            items={[
              "Даалгавар",
              `${item.problemCount} бодлого`,
              item.timeLimitMin ? `${item.timeLimitMin} мин` : null,
              item.late ? (
                <span key="late" className="inline-flex items-center gap-1 font-semibold text-warning">
                  <Hourglass className="size-3.5" aria-hidden />
                  Хоцорсон
                </span>
              ) : null,
            ]}
          />
        </span>
        <StatusChip item={item} />
        <ChevronRight className="size-4 shrink-0 text-ink-dim" aria-hidden />
      </Link>
    </li>
  );
}

function DayCard({ day, today, onPhoto }: { day: HwDay; today: boolean; onPhoto: (p: HwPhoto | null) => void }) {
  const mark = day.mark ? HOMEWORK_MARKS[day.mark] : null;
  const MarkIcon = mark?.icon;
  return (
    <article
      id={dayId(day)}
      className={cn(
        "scroll-mt-24 rounded-xl border bg-surface p-4 elev-1 sm:p-5",
        today ? "border-brand-bright/60 ring-1 ring-brand-bright/30" : "border-line",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="cyrillic-heading flex flex-wrap items-center gap-2 font-bold text-ink">
            {dayLabel(day.date)}
            {today && (
              <span className="rounded-full bg-brand-bright px-2 py-0.5 text-[11px] font-bold text-on-brand">Өнөөдөр</span>
            )}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-dim">
            <span>{day.classroomName}</span>
            {day.deadlineAt && (
              <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                <Clock className="size-3" aria-hidden />
                {formatMnDateTime(day.deadlineAt, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })} хүртэл
              </span>
            )}
            {mark && MarkIcon && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold",
                  TONE_SELECTED[mark.tone],
                )}
                title="Багшийн тэмдэглэгээ"
              >
                <MarkIcon className="size-3.5" aria-hidden />
                {mark.label}
              </span>
            )}
          </div>
        </div>
        <PhotoButton classroomId={day.classroomId} date={day.date} photo={day.photo} onChange={onPhoto} />
      </div>

      {day.items.length > 0 ? (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {day.items.map((it) => (
            <ItemRow key={it.testId} day={day} item={it} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-t border-line pt-3 text-sm text-ink-dim">Энэ өдөр тестийн даалгавар алга</p>
      )}
    </article>
  );
}

/** Өдрийн зурвас — даалгавартай өдрүүд (шинэ нь эхэнд), дарахад тухайн карт руу гүйлгэнэ */
function DayStrip({ days, todayKey }: { days: HwDay[]; todayKey: string }) {
  const keys = useMemo(() => Array.from(new Set(days.map((d) => d.date))), [days]);
  if (keys.length < 2) return null;
  return (
    <nav aria-label="Өдөр сонгох" className="mb-4 overflow-x-auto rounded-xl border border-line bg-surface p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-1">
        {keys.map((key) => {
          const ds = days.filter((d) => d.date === key);
          const done = ds.every((d) => d.items.every((i) => i.status === "SUBMITTED"));
          const [, m, dd] = key.split("-").map(Number);
          const today = key === todayKey;
          return (
            <li key={key}>
              <button
                type="button"
                aria-label={`${dayLabel(key)}${done ? ", бүгд илгээсэн" : ""}${today ? ", өнөөдөр" : ""}`}
                aria-current={today ? "date" : undefined}
                onClick={() =>
                  document.getElementById(dayId(ds[0]))?.scrollIntoView({
                    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                    block: "start",
                  })
                }
                className={cn(
                  "flex h-14 w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-center transition-colors",
                  today ? "bg-brand-bright text-on-brand" : "bg-brand-bright/10 text-ink hover:bg-brand-bright/20",
                )}
              >
                <span className="text-[10px] font-medium leading-none tabular-nums">{m}-р сар</span>
                <span className="text-base font-bold leading-none tabular-nums">{dd}</span>
                {done ? (
                  <CircleCheck className={cn("size-3", today ? "text-on-brand" : "text-success")} aria-hidden />
                ) : (
                  <span aria-hidden className={cn("size-1.5 rounded-full", today ? "bg-on-brand" : "bg-brand-bright")} />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function HomeworkList() {
  const [days, setDays] = useState<HwDay[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const todayKey = todayKeyUB();

  const load = useCallback(async () => {
    try {
      const r = await api<HwMyResponse>("/homework/my?days=14");
      setDays(r.days);
      setError("");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Гэрийн даалгаврыг нээж чадсангүй");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ачаалал эхлүүлэх
    void load();
  }, [load, retry]);

  const sorted = useMemo(
    () =>
      [...(days ?? [])].sort(
        (a, b) => b.date.localeCompare(a.date) || a.classroomName.localeCompare(b.classroomName),
      ),
    [days],
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Гэрийн даалгавар" description="Хичээлийн дараах өдөр бүрийн даалгавар" />
      {error && !days ? (
        <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />
      ) : !days ? (
        <LoadingState rows={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="Өнөөдөр гэрийн даалгавар алга"
          hint="Ангидаа тест бодсон өдөр даалгавар энд автоматаар гарна"
        />
      ) : (
        <>
          <DayStrip days={sorted} todayKey={todayKey} />
          {!sorted.some((d) => d.date === todayKey) && (
            <p className="mb-3 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-dim">
              Өнөөдөр гэрийн даалгавар алга
            </p>
          )}
          <div className="space-y-3">
            {sorted.map((d) => (
              <DayCard
                key={dayId(d)}
                day={d}
                today={d.date === todayKey}
                onPhoto={(photo) =>
                  setDays((prev) =>
                    (prev ?? []).map((x) =>
                      x.date === d.date && x.classroomId === d.classroomId ? { ...x, photo } : x,
                    ),
                  )
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

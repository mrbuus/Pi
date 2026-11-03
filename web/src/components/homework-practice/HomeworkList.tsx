"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, CalendarClock, ChevronDown, ChevronRight, History, CircleCheck, CircleDashed, Clock, Hourglass, MessageSquareText, Play, RotateCcw } from "lucide-react";
import { HOMEWORK_MARKS, TONE_SELECTED } from "@/components/attendance/marks";
import { dayLabel } from "@/components/makeup/types";
import { weekdayShort } from "@/components/student-hub/lib";
import { PageHeader } from "@/components/ui/Surface";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMnDate } from "@/lib/dateMn";
import HomeworkPhotoPanel from "@/components/student-hub/HomeworkPhotoPanel";
import { HOMEWORK_WINDOW_DAYS, dayDiff } from "@/components/student-hub/photo-types";
import HomeworkRedo from "./HomeworkRedo";
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

function MarkBadge({ day }: { day: HwDay }) {
  const mark = day.mark ? HOMEWORK_MARKS[day.mark] : null;
  if (!mark) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-ink-dim"
        title="Багшийн тэмдэглэгээ"
      >
        <CircleDashed className="size-3.5" aria-hidden />
        Шалгаагүй
      </span>
    );
  }
  const Icon = mark.icon;
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold", TONE_SELECTED[mark.tone])}
      title="Багшийн тэмдэглэгээ"
    >
      <Icon className="size-3.5" aria-hidden />
      {mark.label}
    </span>
  );
}


/** Нэг минутад нэг шинэчлэгдэх «одоо» — үлдсэн хугацааг шинэчилнэ */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Хугацаа энгийнээр (эзэн 2026-11-03): «Мягмар 23:59 хүртэл» + үлдсэн хугацаа («2 өдөр 5 цаг үлдсэн»).
 * Сервер дараагийн хичээлийн өдрийн 00:00-ийг өгдөг — өмнөх өдрийн 23:59 гэж харуулна.
 */
function DeadlineChip({ iso }: { iso: string }) {
  const now = useNow();
  const end = new Date(iso).getTime();
  if (!Number.isFinite(end)) return null;
  const endKey = formatMnDate(new Date(end - 60_000), { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\./g, "-");
  const left = end - now;
  const mins = Math.floor(left / 60_000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const remain =
    left <= 0
      ? "Хугацаа дууссан"
      : days > 0
        ? `${days} өдөр${hours ? ` ${hours} цаг` : ""} үлдсэн`
        : hours > 0
          ? `${hours} цаг үлдсэн`
          : `${Math.max(1, mins)} минут үлдсэн`;
  const urgent = left > 0 && left < 6 * 3_600_000;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        left <= 0 ? "border-error/50 text-error" : urgent ? "border-brand-bright/60 text-brand-soft" : "border-line",
      )}
    >
      <Clock className="size-3" aria-hidden />
      <Meta items={[`${weekdayShort(endKey)} 23:59 хүртэл`, remain]} />
    </span>
  );
}

function DayCard({
  day,
  today,
  canSend,
  onPhoto,
}: {
  day: HwDay;
  today: boolean;
  canSend: boolean;
  onPhoto: (p: HwPhoto | null) => void;
}) {
  const comment = day.markComment?.trim();
  return (
    <article
      id={dayId(day)}
      className={cn(
        "scroll-mt-24 space-y-3 rounded-xl border bg-surface p-4 elev-1 sm:p-5",
        today ? "border-brand-bright/60 ring-1 ring-brand-bright/30" : "border-line",
      )}
    >
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="cyrillic-heading font-bold text-ink">{dayLabel(day.date)}</h2>
          <span className="ml-auto">
            {day.upcoming ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand-bright/50 px-2 py-0.5 text-[11px] font-semibold text-brand-soft">
                <CalendarClock className="size-3.5" aria-hidden />
                Урьдчилан
              </span>
            ) : (
              <MarkBadge day={day} />
            )}
          </span>
        </div>
        {day.topic && <p className="cyrillic-tight font-semibold text-ink">{day.topic}</p>}
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-ink-dim">
          <span>{day.classroomName}</span>
          {day.deadlineAt && !day.upcoming && <DeadlineChip iso={day.deadlineAt} />}
        </div>
        {comment && (
          <p className="flex items-start gap-1.5 rounded-lg bg-panel px-3 py-2 text-sm text-ink">
            <MessageSquareText className="mt-0.5 size-4 shrink-0 text-ink-dim" aria-label="Багшийн тайлбар" />
            <span className="min-w-0 break-words">{comment}</span>
          </p>
        )}
      </header>

      <HomeworkPhotoPanel
        classroomId={day.classroomId}
        date={day.date}
        photo={day.photo}
        canSend={canSend}
        onChange={onPhoto}
      />

      {day.items.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink-dim">Онлайн тест</h3>
          <ul className="mt-1 divide-y divide-line">
            {day.items.map((it) => (
              <ItemRow key={it.testId} day={day} item={it} />
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

/**
 * Өдрийн зурвас — эрт нь зүүн, хожуу нь баруун талд (эзэн 2026-10-31); нээхэд өнөөдөр
 * (эсвэл өнөөдрөөс өмнөх сүүлийн хичээл) харагдах хүртэл гүйлгэнэ. Дарахад тухайн карт руу.
 */
function DayStrip({ days, todayKey }: { days: HwDay[]; todayKey: string }) {
  const keys = useMemo(() => Array.from(new Set(days.map((d) => d.date))).sort(), [days]);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const focus = [...keys].reverse().find((k) => k <= todayKey) ?? keys[0];
    const chip = nav.querySelector<HTMLElement>(`[data-day="${focus}"]`);
    if (chip) nav.scrollLeft = chip.offsetLeft - nav.clientWidth / 2 + chip.offsetWidth / 2;
  }, [keys, todayKey]);
  if (keys.length < 2) return null;
  return (
    <nav ref={navRef} aria-label="Өдөр сонгох" className="mb-4 overflow-x-auto rounded-xl border border-line bg-surface p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-1">
        {keys.map((key) => {
          const ds = days.filter((d) => d.date === key);
          const done = ds.every((d) => !!d.photo && d.items.every((i) => i.status === "SUBMITTED"));
          const dd = Number(key.slice(8));
          const today = key === todayKey;
          const ahead = key > todayKey;
          return (
            <li key={key}>
              <button
                type="button"
                data-day={key}
                aria-label={`${dayLabel(key)}${done ? ", илгээсэн" : ""}${today ? ", өнөөдөр" : ""}${ahead ? ", урьдчилан" : ""}`}
                aria-current={today ? "date" : undefined}
                onClick={() =>
                  document.getElementById(dayId(ds[0]))?.scrollIntoView({
                    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                    block: "start",
                  })
                }
                className={cn(
                  "flex h-14 w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-center transition-colors",
                  today
                    ? "bg-brand-bright text-on-brand"
                    : ahead
                      ? "border border-dashed border-brand-bright/50 text-ink hover:bg-brand-bright/10"
                      : "bg-brand-bright/10 text-ink hover:bg-brand-bright/20",
                )}
              >
                <span className="text-[10px] font-medium leading-none">{weekdayShort(key)}</span>
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
  const [showOlder, setShowOlder] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);
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

  // Энгийн байлгах (эзэн 2026-11-03): үндсэн нь зөвхөн өнөөдрийн (эсвэл өнөөдөр хичээлгүй бол сүүлийн) хичээл;
  // өмнөх өдрүүд, урьдчилан илгээх нь тусдаа товчоор нээгдэнэ
  const groups = useMemo(() => {
    const todays = sorted.filter((d) => d.date === todayKey);
    const upcoming = sorted.filter((d) => d.date > todayKey).reverse();
    const past = sorted.filter((d) => d.date < todayKey);
    if (todays.length || !past.length) return { title: "Өнөөдөр", main: todays, older: past, upcoming };
    const latest = past[0].date;
    return {
      title: "Сүүлийн хичээл",
      main: past.filter((d) => d.date === latest),
      older: past.filter((d) => d.date !== latest),
      upcoming,
    };
  }, [sorted, todayKey]);

  const canSendDay = (d: HwDay) =>
    !!d.upcoming || (dayDiff(todayKey, d.date) >= 0 && dayDiff(todayKey, d.date) < HOMEWORK_WINDOW_DAYS);
  // Өмнөх өдрүүдээс зураг нь илгээгдээгүй, одоо ч илгээж болох — товчон дээр сануулна
  const missed = groups.older.filter((d) => !d.photo && canSendDay(d)).length;

  const cards = (list: HwDay[]) => (
    <div className="space-y-3">
      {list.map((d) => (
        <DayCard
          key={dayId(d)}
          day={d}
          today={d.date === todayKey}
          canSend={canSendDay(d)}
          onPhoto={(photo) => {
            setDays((prev) =>
              (prev ?? []).map((x) => (x.date === d.date && x.classroomId === d.classroomId ? { ...x, photo } : x)),
            );
            // «Хоцорсон» тэмдэг серверийн хугацаагаар тооцогддог — шинэчилж авна
            if (photo) void load();
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Гэрийн даалгавар" description="Хичээлийн өдөр бүрийн дэвтрийн зураг ба тест" />
      {error && !days ? (
        <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />
      ) : !days ? (
        <LoadingState rows={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="Сүүлийн 14 хоногт хичээл алга"
          hint="Хичээлд суусан өдөр бүр энд гарч, дэвтрийнхээ зургийг илгээнэ"
        />
      ) : (
        <>
          {groups.main.length > 0 && (
            <section className="mb-4">
              <h2 className="mb-2 text-sm font-semibold text-ink-dim">{groups.title}</h2>
              {cards(groups.main)}
            </section>
          )}

          {groups.older.length > 0 && (
            <section className="mb-4">
              <button
                type="button"
                aria-expanded={showOlder}
                aria-controls="hw-older"
                onClick={() => setShowOlder((v) => !v)}
                className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-line bg-surface px-4 text-left font-semibold text-ink transition hover:bg-ink/[0.03] focus-visible:ring-2 focus-visible:ring-brand-bright"
              >
                <History className="size-5 shrink-0 text-brand-soft" aria-hidden />
                <span className="flex-1">Өмнөх өдрийн даалгавар илгээх</span>
                {missed > 0 && (
                  <span className="rounded-full bg-error px-2 text-xs font-bold leading-5 tabular-nums text-on-error" aria-label={`${missed} өдөр илгээгээгүй`}>
                    {missed}
                  </span>
                )}
                <ChevronDown className={cn("size-4 shrink-0 text-ink-dim transition-transform", showOlder && "rotate-180")} aria-hidden />
              </button>
              {showOlder && (
                <div id="hw-older" className="mt-3">
                  <DayStrip days={groups.older} todayKey={todayKey} />
                  {cards(groups.older)}
                </div>
              )}
            </section>
          )}

          {groups.upcoming.length > 0 && (
            <section className="mb-6">
              <button
                type="button"
                aria-expanded={showUpcoming}
                aria-controls="hw-upcoming"
                onClick={() => setShowUpcoming((v) => !v)}
                className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-dashed border-brand-bright/50 bg-surface px-4 text-left font-semibold text-ink transition hover:bg-ink/[0.03] focus-visible:ring-2 focus-visible:ring-brand-bright"
              >
                <CalendarClock className="size-5 shrink-0 text-brand-soft" aria-hidden />
                <span className="flex-1">Урьдчилан илгээх</span>
                <ChevronDown className={cn("size-4 shrink-0 text-ink-dim transition-transform", showUpcoming && "rotate-180")} aria-hidden />
              </button>
              {showUpcoming && (
                <div id="hw-upcoming" className="mt-3">
                  {cards(groups.upcoming)}
                </div>
              )}
            </section>
          )}
        </>
      )}
      {days && <HomeworkRedo />}
    </div>
  );
}

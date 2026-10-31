"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Camera, ChevronRight, Images, Search, SearchX, X } from "lucide-react";
import { dayLabel } from "@/components/makeup/types";
import { todayKeyUB } from "@/components/homework-practice/lib";
import { PageHeader } from "@/components/ui/Surface";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { Meta } from "@/components/ui/Meta";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import TheoryDayPanel from "./TheoryDayPanel";
import { addDays, isDateKey, type TheoryListDay } from "./photo-types";

const WEEKDAY_SHORT = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
const rowKey = (d: { classroomId: string; date: string }) => `${d.classroomId}:${d.date}`;
const dayHref = (d: { classroomId: string; date: string }) =>
  `/app/theory?${new URLSearchParams({ date: d.date, c: d.classroomId }).toString()}`;

function weekday(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return WEEKDAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function monthLabel(ym: string, currentYear: string) {
  const [y, m] = ym.split("-");
  return y === currentYear ? `${Number(m)}-р сар` : `${y} оны ${Number(m)}-р сар`;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function ListSkeleton() {
  return (
    <div className="chunky divide-y divide-line" role="status" aria-label="Ачаалж байна">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <div className="skeleton size-12 shrink-0 rounded-lg" aria-hidden />
          <div className="flex-1 space-y-2">
            <SkeletonLine width={`${50 + ((i * 17) % 35)}%`} height={14} />
            <SkeletonLine width="35%" height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CountBadge({ day }: { day: TheoryListDay }) {
  if (day.count > 0) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold tabular-nums text-success"
        aria-label={`${day.count} хүн илгээсэн`}
      >
        <Images className="size-3.5" aria-hidden />
        {day.count}
      </span>
    );
  }
  if (day.canUpload) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-bright/50 px-2 py-0.5 text-xs font-semibold text-brand-soft">
        <Camera className="size-3.5" aria-hidden />
        Илгээх
      </span>
    );
  }
  return <span className="shrink-0 text-xs text-ink-dim">Зураггүй</span>;
}

function DayRow({ day, onOpen }: { day: TheoryListDay; onOpen: () => void }) {
  const [, , dd] = day.date.split("-").map(Number);
  const names = day.uploaders.slice(0, 2).join(", ") + (day.uploaders.length > 2 ? ` +${day.uploaders.length - 2}` : "");
  return (
    <li>
      <Link
        href={dayHref(day)}
        onClick={onOpen}
        className="row-interactive flex min-h-16 items-center gap-3 px-3 py-2.5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-bright"
      >
        <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-panel leading-none">
          <span className="text-lg font-bold tabular-nums text-ink">{dd}</span>
          <span className="mt-0.5 text-[11px] font-medium text-ink-dim">{weekday(day.date)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("cyrillic-tight block truncate font-semibold", day.topic ? "text-ink" : "text-ink-dim")}>
            {day.topic ?? (day.tests[0] || "Сэдэв тодорхойгүй")}
          </span>
          <Meta className="mt-0.5 text-xs text-ink-dim" items={[day.classroomName, names || null]} />
        </span>
        <CountBadge day={day} />
        <ChevronRight className="size-4 shrink-0 text-ink-dim" aria-hidden />
      </Link>
    </li>
  );
}

/**
 * /app/theory — онолын зураг: хайлт (сэдэв, тестийн нэр), огноо, сараар бүлэглэсэн
 * хичээлийн өдрүүд, өнөөдрийнхийг илгээх. `?date=YYYY-MM-DD&c=classroomId` — тухайн өдөр.
 */
export default function TheoryBrowser() {
  const router = useRouter();
  const params = useSearchParams();
  const today = todayKeyUB();
  const yesterday = addDays(today, -1);
  const paramDate = params.get("date");
  const paramClass = params.get("c");
  const openDay = useMemo(
    () => (isDateKey(paramDate) && paramClass ? { date: paramDate, classroomId: paramClass } : null),
    [paramDate, paramClass],
  );

  const [q, setQ] = useState("");
  // Самбараас зөвхөн ?date= ирвэл тэр өдрөөр шүүнэ
  const [dateFilter, setDateFilter] = useState(() => (isDateKey(paramDate) && !paramClass ? paramDate : ""));
  const query = useDebounced(q.trim(), 300);
  const [rows, setRows] = useState<TheoryListDay[] | null>(null);
  const [todayRows, setTodayRows] = useState<TheoryListDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const scrollY = useRef(0);
  const autoOpened = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (dateFilter) {
      sp.set("from", dateFilter);
      sp.set("to", dateFilter);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- шинэ хайлт эхэллээ
    setLoading(true);
    api<TheoryListDay[]>(`/student-hub/theory${sp.size ? `?${sp.toString()}` : ""}`)
      .then((r) => {
        if (cancelled) return;
        setRows(r);
        setError("");
      })
      .catch((e) => !cancelled && setError(e instanceof Error && e.message ? e.message : "Онолын зургийг нээж чадсангүй"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, dateFilter, reload]);

  // Өнөөдрийн хичээл (шүүлтүүрээс үл хамаарна)
  useEffect(() => {
    let cancelled = false;
    api<TheoryListDay[]>(`/student-hub/theory?from=${today}&to=${today}`)
      .then((r) => !cancelled && setTodayRows(r))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [today, reload]);

  // ?date= ганц ангийн өдөр бол шууд нээнэ
  useEffect(() => {
    if (autoOpened.current || openDay || !rows || loading || !dateFilter || query) return;
    if (dateFilter !== paramDate) return;
    autoOpened.current = true;
    const matches = rows.filter((r) => r.date === dateFilter);
    if (matches.length === 1) router.replace(dayHref(matches[0]));
  }, [rows, loading, dateFilter, paramDate, query, openDay, router]);

  // Жагсаалт руу буцахад гүйлгээний байрлалыг сэргээнэ
  useEffect(() => {
    if (!openDay && scrollY.current) {
      const y = scrollY.current;
      scrollY.current = 0;
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
    }
  }, [openDay]);

  const markOpen = useCallback(() => {
    scrollY.current = window.scrollY;
  }, []);

  const groups = useMemo(() => {
    const sorted = [...(rows ?? [])].sort(
      (a, b) => b.date.localeCompare(a.date) || a.classroomName.localeCompare(b.classroomName),
    );
    const out: { ym: string; days: TheoryListDay[] }[] = [];
    for (const d of sorted) {
      const ym = d.date.slice(0, 7);
      if (out.at(-1)?.ym !== ym) out.push({ ym, days: [] });
      out.at(-1)!.days.push(d);
    }
    return out;
  }, [rows]);

  const filtered = !!query || !!dateFilter;
  const currentYear = today.slice(0, 4);

  if (openDay) {
    const meta =
      rows?.find((r) => rowKey(r) === rowKey(openDay)) ?? todayRows.find((r) => rowKey(r) === rowKey(openDay));
    return (
      <div className="mx-auto max-w-2xl">
        {/* Буцах товч бүрхүүлийнх (ContextNavigation) — өмнөх хуудас руу */}
        <header className="mb-4">
          <h1 className="cyrillic-heading text-xl font-extrabold tracking-tight text-ink">{dayLabel(openDay.date)}</h1>
          {meta && <p className="text-sm text-ink-dim">{meta.classroomName}</p>}
        </header>
        <div className="chunky p-4 sm:p-5">
          <TheoryDayPanel
            key={rowKey(openDay)}
            classroomId={openDay.classroomId}
            date={openDay.date}
            onChange={() => setReload((n) => n + 1)}
          />
        </div>
      </div>
    );
  }

  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-brand-bright",
      active ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line bg-surface text-ink hover:border-brand-bright",
    );
  const customDate = !!dateFilter && dateFilter !== today && dateFilter !== yesterday;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Онолын зураг" />

      {!filtered && todayRows.length > 0 && (
        <section aria-labelledby="today-theory" className="mb-5 space-y-2">
          <h2 id="today-theory" className="cyrillic-heading px-1 text-lg font-bold text-ink">
            Өнөөдрийн онол
          </h2>
          {todayRows.map((d) => (
            <div key={rowKey(d)} className="chunky space-y-3 border-brand-bright/50 p-4 sm:p-5">
              <p className="text-sm font-semibold text-ink-dim">{d.classroomName}</p>
              <TheoryDayPanel classroomId={d.classroomId} date={d.date} onChange={() => setReload((n) => n + 1)} />
            </div>
          ))}
        </section>
      )}

      <div className="mb-4 space-y-2">
        <label className="relative block">
          <span className="sr-only">Хайх</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-dim" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Сэдэв эсвэл тестийн нэр"
            enterKeyHint="search"
            className="h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-11 text-base text-ink placeholder:text-ink-dim focus-visible:border-brand-bright focus-visible:ring-2 focus-visible:ring-brand-bright/40 [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Хайлтыг арилгах"
              className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-dim hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </button>
          )}
        </label>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <button type="button" className={chip(!dateFilter)} onClick={() => setDateFilter("")} aria-pressed={!dateFilter}>
            Бүгд
          </button>
          <button type="button" className={chip(dateFilter === today)} onClick={() => setDateFilter(today)} aria-pressed={dateFilter === today}>
            Өнөөдөр
          </button>
          <button
            type="button"
            className={chip(dateFilter === yesterday)}
            onClick={() => setDateFilter(yesterday)}
            aria-pressed={dateFilter === yesterday}
          >
            Өчигдөр
          </button>
          <label className={cn(chip(customDate), "relative cursor-pointer")}>
            <CalendarDays className="size-4" aria-hidden />
            <span>{customDate ? dayLabel(dateFilter, false) : "Огноо"}</span>
            <input
              type="date"
              value={dateFilter}
              max={today}
              onChange={(e) => setDateFilter(isDateKey(e.target.value) ? e.target.value : "")}
              aria-label="Огноо сонгох"
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>

      {error && !rows ? (
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : !rows ? (
        <ListSkeleton />
      ) : groups.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchX}
            title="Олдсонгүй"
            hint={query ? "Өөр үгээр хайгаад үзээрэй" : "Энэ өдөр хичээл ороогүй байна"}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQ("");
                  setDateFilter("");
                }}
              >
                Бүх өдөр
              </Button>
            }
          />
        ) : (
          <EmptyState icon={Images} title="Хичээлийн өдөр алга" hint="Ангидаа хичээл орсон өдөр бүр энд гарна" />
        )
      ) : (
        <div className={cn("space-y-5 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
          {error && <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />}
          {groups.map((g) => (
            <section key={g.ym} aria-label={monthLabel(g.ym, currentYear)}>
              <h2 className="mb-2 px-1 text-sm font-semibold text-ink-dim">{monthLabel(g.ym, currentYear)}</h2>
              <ul className="chunky divide-y divide-line overflow-hidden">
                {g.days.map((d) => (
                  <DayRow key={rowKey(d)} day={d} onOpen={markOpen} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

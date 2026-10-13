"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, UserX } from "lucide-react";
import { Meta } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";
import { formatMnDate } from "@/lib/dateMn";
import { Distribution, ExamResultList } from "./ExamParts";
import { ATTENDANCE_META, dayLabel, deltaOf, HOMEWORK_META, rateTone, WEEKDAY_SHORT } from "./meta";
import type { MonthData, MonthDay, MonthStudent } from "./types";

/**
 * Сарын торууд (эзэн 2026-10-13): мөр = сурагч, багана = хичээлийн өдөр /
 * шалгалт / 7 хоног. Эхний хоёр багана (нэр, сарын дүн) наалттай — утсан дээр
 * хажуу тийш гүйлгэхэд ч харагдана. Нэр дээр дарахад тухайн хүүхдийн товч
 * самбар нээгдэнэ. Эхний мөр нь ангийн дундаж.
 */

type SortDir = "name" | "asc" | "desc";

const NAME_COL = "sticky left-0 z-10 w-[8.5rem] min-w-[8.5rem] sm:w-48 sm:min-w-48";
const SUM_COL = "sticky left-[8.5rem] z-10 w-16 min-w-16 border-r border-line sm:left-48";

export function DeltaText({ value, avg, unit = "" }: { value: number | null | undefined; avg: number | null | undefined; unit?: string }) {
  const d = deltaOf(value, avg);
  // 1-ээс бага зөрүү (жишээ нь 0.2 бодлого) нь утгагүй шуугиан
  if (d === null || Math.abs(d) < 1) return null;
  return (
    <span className={cn("text-[11px] font-semibold tabular-nums", d > 0 ? "text-success" : "text-error")}>
      {d > 0 ? `+${d}` : d}
      {unit}
    </span>
  );
}

function useSorted(students: MonthStudent[], valueOf: (id: string) => number | null) {
  const [dir, setDir] = useState<SortDir>("name");
  const rows = useMemo(() => {
    if (dir === "name") return students;
    const sign = dir === "asc" ? 1 : -1;
    return [...students].sort((a, b) => {
      const va = valueOf(a.id);
      const vb = valueOf(b.id);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va - vb) * sign;
    });
  }, [students, dir, valueOf]);
  const cycle = () => setDir((d) => (d === "name" ? "asc" : d === "asc" ? "desc" : "name"));
  return { rows, dir, cycle };
}

function SortHeader({ label, dir, onClick }: { label: string; dir: SortDir; onClick: () => void }) {
  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 w-full items-center justify-center gap-0.5 text-xs font-semibold text-ink-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
      aria-label={`${label} — ${dir === "name" ? "нэрээр" : dir === "asc" ? "сулаас нь" : "сайнаас нь"} эрэмбэлсэн, дарж солих`}
    >
      {label}
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

function NameCell({ s, onFocus }: { s: MonthStudent; onFocus: (id: string) => void }) {
  return (
    <th scope="row" className={cn(NAME_COL, "border-b border-line bg-surface p-0 font-normal")}>
      <button
        type="button"
        onClick={() => onFocus(s.id)}
        className="flex min-h-11 w-full flex-col justify-center px-2.5 py-1 text-left hover:bg-panel focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      >
        <span className="block truncate text-sm font-semibold text-ink">{s.firstName}</span>
        <span className="block truncate text-xs text-ink-dim">{s.lastName}</span>
      </button>
    </th>
  );
}

/** Сүүлийн дүүргэгч багана — илүү өргөнийг өөртөө авч, бусад багана нарийн хэвээр */
function FillHead() {
  return <th aria-hidden className="w-full border-b border-line bg-panel" />;
}
function Fill({ panel = false }: { panel?: boolean }) {
  return <td aria-hidden className={cn("w-full border-b border-line", panel && "bg-panel")} />;
}

function Shell({ children, label }: { children: ReactNode; label: string }) {
  return (
    // relative: sr-only (absolute) хүүхдүүд гүйлгэх хайрцгаас гоожиж утсан дээр хуудсыг өргөсгөхгүй
    <div className="relative overflow-x-auto rounded-2xl border border-line bg-surface" role="region" aria-label={label} tabIndex={0}>
      <table className="w-max min-w-full border-separate border-spacing-0 text-left">{children}</table>
    </div>
  );
}

function AvgNameCell({ label = "Ангийн дундаж" }: { label?: string }) {
  return (
    <th scope="row" className={cn(NAME_COL, "border-b border-line bg-panel px-2.5 py-2 text-left text-xs font-bold text-ink")}>
      {label}
    </th>
  );
}

function RateSummary({ value, avg, suffix = "%" }: { value: number | null; avg: number | null; suffix?: string }) {
  return (
    <td className={cn(SUM_COL, "border-b bg-surface px-1.5 text-center")}>
      {value === null ? (
        <span className="text-sm text-ink-dim">—</span>
      ) : (
        <span className="flex flex-col items-center leading-tight">
          <span className="text-sm font-bold tabular-nums text-ink">
            {value}
            {suffix}
          </span>
          <DeltaText value={value} avg={avg} />
        </span>
      )}
    </td>
  );
}

// ───────────────────────── Ирц / даалгавар ─────────────────────────

function DayHeader({ d, today }: { d: MonthDay; today: string }) {
  const isToday = d.date === today;
  const title = d.holiday
    ? `${formatMnDate(d.date)} — ${d.holiday}`
    : d.scheduled
      ? `${formatMnDate(d.date)}${d.confirmed ? " — батлагдсан хичээл" : ""}`
      : `${formatMnDate(d.date)} — хуваарьт хичээлгүй өдөр`;
  return (
    <th
      scope="col"
      title={title}
      className={cn(
        "border-b border-line bg-panel px-0.5 py-1.5 text-center text-[11px] font-semibold leading-tight",
        d.holiday ? "w-7 min-w-7 text-ink-dim" : "w-9 min-w-9",
        isToday ? "text-brand" : d.scheduled ? "text-ink" : "text-ink-dim",
      )}
    >
      <span className="block">{WEEKDAY_SHORT[d.weekday]}</span>
      <span className={cn("block tabular-nums", d.confirmed && "underline decoration-brand-bright decoration-2 underline-offset-2")}>
        {dayLabel(d.date).split("/")[1]}
      </span>
      <span className="sr-only">{title}</span>
    </th>
  );
}

function StatusCell<S extends string>({
  status,
  meta,
  holiday,
}: {
  status: S | undefined;
  meta: Record<S, { label: string; icon: typeof UserX; cell: string }>;
  holiday: boolean;
}) {
  if (holiday)
    return <td className="border-b border-line bg-ink/[0.03] p-0" aria-label="Хичээлгүй" />;
  if (!status)
    return (
      <td className="border-b border-line p-0.5 text-center">
        <span className="sr-only">Тэмдэглээгүй</span>
      </td>
    );
  const m = meta[status];
  const Icon = m.icon;
  return (
    <td className="border-b border-line p-0.5 text-center" title={m.label}>
      <span className={cn("mx-auto flex h-7 w-7 items-center justify-center rounded-md", m.cell)}>
        <Icon className="h-4 w-4" aria-hidden />
        <span className="sr-only">{m.label}</span>
      </span>
    </td>
  );
}

export function MarkGrid({
  kind,
  data,
  onFocus,
}: {
  kind: "attendance" | "homework";
  data: MonthData;
  onFocus: (id: string) => void;
}) {
  const grid = kind === "attendance" ? data.attendance : data.homework;
  const meta = (kind === "attendance" ? ATTENDANCE_META : HOMEWORK_META) as Record<string, { label: string; icon: typeof UserX; cell: string }>;
  const rate = (id: string) => (kind === "attendance" ? data.stats.students[id]?.attendance.rate : data.stats.students[id]?.homework.rate) ?? null;
  const classAvg = kind === "attendance" ? data.stats.class.attendance : data.stats.class.homework;
  const { rows, dir, cycle } = useSorted(data.students, rate);

  // Өдөр бүрийн ангийн хувь: ирсэн (хоцорсон ч) / (тэмдэглэсэн − чөлөөтэй); даалгавар — хийсэн + дутуу/2
  const dayRate = useMemo(() => {
    const out = new Map<string, number | null>();
    for (const d of data.days) {
      let credit = 0;
      let total = 0;
      for (const s of data.students) {
        const st = grid[s.id]?.[d.date];
        if (!st || st === "EXCUSED") continue;
        total += 1;
        if (st === "PRESENT" || st === "LATE" || st === "DONE") credit += 1;
        else if (st === "PARTIAL") credit += 0.5;
      }
      out.set(d.date, total ? Math.round((credit / total) * 100) : null);
    }
    return out;
  }, [data.days, data.students, grid]);

  const label = kind === "attendance" ? "Ирц" : "Даалгавар";
  return (
    <div className="space-y-2">
      <Shell label={`${label} — сурагч, өдрөөр`}>
        <thead>
          <tr>
            <th scope="col" className={cn(NAME_COL, "border-b border-line bg-panel px-2.5 text-xs font-semibold text-ink-dim")}>
              Сурагч
            </th>
            <th scope="col" className={cn(SUM_COL, "border-b bg-panel p-0")}>
              <SortHeader label="Сар" dir={dir} onClick={cycle} />
            </th>
            {data.days.map((d) => (
              <DayHeader key={d.date} d={d} today={data.today} />
            ))}
            <FillHead />
          </tr>
        </thead>
        <tbody>
          <tr>
            <AvgNameCell />
            <RateSummary value={classAvg} avg={null} />
            {data.days.map((d) => {
              const r = dayRate.get(d.date) ?? null;
              return (
                <td key={d.date} className={cn("border-b border-line bg-panel px-0.5 text-center text-[11px] font-semibold tabular-nums", d.holiday && "bg-ink/[0.03]")}>
                  {r === null || d.holiday ? "" : r}
                </td>
              );
            })}
            <Fill panel />
          </tr>
          {rows.map((s) => (
            <tr key={s.id} className="row-interactive">
              <NameCell s={s} onFocus={onFocus} />
              <RateSummary value={rate(s.id)} avg={classAvg} />
              {data.days.map((d) => (
                <StatusCell key={d.date} status={grid[s.id]?.[d.date]} meta={meta} holiday={!!d.holiday} />
              ))}
              <Fill />
            </tr>
          ))}
        </tbody>
      </Shell>
      <Legend meta={meta} />
    </div>
  );
}

function Legend({ meta }: { meta: Record<string, { label: string; icon: typeof UserX; cell: string }> }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-dim" aria-label="Тэмдэглэгээний тайлбар">
      {Object.entries(meta).map(([k, m]) => {
        const Icon = m.icon;
        return (
          <li key={k} className="inline-flex items-center gap-1">
            <span className={cn("flex h-5 w-5 items-center justify-center rounded", m.cell)}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            {m.label}
          </li>
        );
      })}
    </ul>
  );
}

// ───────────────────────── Шалгалт ─────────────────────────

export function ExamGrid({ data, onFocus }: { data: MonthData; onFocus: (id: string) => void }) {
  const [selected, setSelected] = useState<string | null>(data.exams.at(-1)?.testId ?? null);
  const avgOf = (id: string) => data.stats.students[id]?.exam.avg ?? null;
  const { rows, dir, cycle } = useSorted(data.students, avgOf);
  const exam = data.exams.find((e) => e.testId === selected) ?? null;
  const nameBy = useMemo(() => new Map(data.students.map((s) => [s.id, `${s.lastName} ${s.firstName}`])), [data.students]);

  return (
    <div className="space-y-3">
      <Shell label="Шалгалт — сурагч, шалгалтаар">
        <thead>
          <tr>
            <th scope="col" className={cn(NAME_COL, "border-b border-line bg-panel px-2.5 text-xs font-semibold text-ink-dim")}>
              Сурагч
            </th>
            <th scope="col" className={cn(SUM_COL, "border-b bg-panel p-0")}>
              <SortHeader label="Дундаж" dir={dir} onClick={cycle} />
            </th>
            {data.exams.map((e) => (
              <th key={e.testId} scope="col" className="w-24 min-w-24 border-b border-line bg-panel p-0">
                <button
                  type="button"
                  onClick={() => setSelected(e.testId)}
                  aria-pressed={e.testId === selected}
                  title={e.title}
                  className={cn(
                    "flex min-h-11 w-full flex-col items-center justify-center px-1.5 py-1 text-center text-[11px] leading-tight focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                    e.testId === selected ? "bg-brand-bright/12 text-ink" : "text-ink-dim hover:text-ink",
                  )}
                >
                  <span className="line-clamp-2 font-semibold">{e.title}</span>
                  <span className="tabular-nums">{dayLabel(e.day)}</span>
                </button>
              </th>
            ))}
            <FillHead />
          </tr>
        </thead>
        <tbody>
          <tr>
            <AvgNameCell />
            <RateSummary value={data.stats.class.exam} avg={null} />
            {data.exams.map((e) => (
              <td key={e.testId} className="border-b border-line bg-panel text-center text-xs font-semibold tabular-nums text-ink">
                {e.avg === null ? "—" : `${e.avg}%`}
              </td>
            ))}
            <Fill panel />
          </tr>
          {rows.map((s) => (
            <tr key={s.id} className="row-interactive">
              <NameCell s={s} onFocus={onFocus} />
              <RateSummary value={avgOf(s.id)} avg={data.stats.class.exam} />
              {data.exams.map((e) => {
                const p = e.results[s.id];
                const absent = e.absentIds.includes(s.id);
                return (
                  <td key={e.testId} className="border-b border-line px-1 text-center">
                    {p !== undefined ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-ink">
                        <span className={cn("h-2 w-2 rounded-full", rateTone(p, 80, 50))} aria-hidden />
                        {p}%
                      </span>
                    ) : absent ? (
                      <span className="inline-flex items-center gap-1 text-xs text-error" title="Ирээгүй">
                        <UserX className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">Ирээгүй</span>
                      </span>
                    ) : (
                      <span className="text-sm text-ink-dim">—</span>
                    )}
                  </td>
                );
              })}
              <Fill />
            </tr>
          ))}
        </tbody>
      </Shell>

      {exam && (
        <section className="grid gap-3 rounded-2xl border border-line bg-surface p-4 lg:grid-cols-2" aria-label={`${exam.title} — тархалт`}>
          <div className="min-w-0">
            <h3 className="truncate font-bold text-ink">{exam.title}</h3>
            <Meta
              className="mt-0.5 text-xs text-ink-dim"
              items={[
                formatMnDate(exam.day),
                `${exam.taken}/${exam.students} өгсөн`,
                exam.absent ? `${exam.absent} ирээгүй` : null,
                exam.avg !== null ? `дундаж ${exam.avg}%` : null,
              ]}
            />
            <div className="mt-3">
              {exam.taken ? <Distribution bins={exam.bins} /> : <p className="text-sm text-ink-dim">Дүн оруулаагүй</p>}
            </div>
          </div>
          <ExamResultList
            results={Object.entries(exam.results)
              .map(([studentId, percent]) => ({ studentId, percent }))
              .sort((a, b) => b.percent - a.percent)}
            nameOf={(id) => nameBy.get(id) ?? "Сурагч"}
            onPick={onFocus}
          />
        </section>
      )}
    </div>
  );
}

// ───────────────────────── Бие даасан ажил ─────────────────────────

export function IndependentGrid({ data, onFocus }: { data: MonthData; onFocus: (id: string) => void }) {
  const total = (id: string) => data.stats.students[id]?.independent.problems ?? 0;
  const { rows, dir, cycle } = useSorted(data.students, total);
  const c = data.stats.class;

  const weekSum = useMemo(() => {
    const out = new Map<string, { problems: number; tests: number }>();
    for (const s of data.students) {
      const days = data.independent[s.id] ?? {};
      for (const w of data.weeks) {
        let problems = 0;
        let tests = 0;
        for (const [d, v] of Object.entries(days)) {
          if (d < w.start || d > w.end) continue;
          problems += v.problems;
          tests += v.tests;
        }
        out.set(`${s.id}|${w.start}`, { problems, tests });
      }
    }
    return out;
  }, [data.students, data.independent, data.weeks]);
  const max = Math.max(1, ...[...weekSum.values()].map((v) => v.problems));
  const weekAvg = (start: string) => {
    if (!data.students.length) return null;
    const sum = data.students.reduce((acc, s) => acc + (weekSum.get(`${s.id}|${start}`)?.problems ?? 0), 0);
    return Math.round(sum / data.students.length);
  };

  return (
    <div className="space-y-2">
      <Shell label="Бие даасан ажил — сурагч, 7 хоногоор">
        <thead>
          <tr>
            <th scope="col" className={cn(NAME_COL, "border-b border-line bg-panel px-2.5 text-xs font-semibold text-ink-dim")}>
              Сурагч
            </th>
            <th scope="col" className={cn(SUM_COL, "border-b bg-panel p-0")}>
              <SortHeader label="Бодлого" dir={dir} onClick={cycle} />
            </th>
            {data.weeks.map((w) => (
              <th key={w.start} scope="col" className="w-16 min-w-16 border-b border-line bg-panel px-1 py-1.5 text-center text-[11px] font-semibold leading-tight text-ink-dim">
                <span className="block tabular-nums">{dayLabel(w.start)}</span>
                <span className="block tabular-nums">{dayLabel(w.end)}</span>
              </th>
            ))}
            <th scope="col" className="w-14 min-w-14 border-b border-l border-line bg-panel px-1 text-center text-[11px] font-semibold text-ink-dim">
              Зөв
            </th>
            <th scope="col" className="w-14 min-w-14 border-b border-line bg-panel px-1 text-center text-[11px] font-semibold text-ink-dim">
              Тест
            </th>
            <th scope="col" className="w-14 min-w-14 border-b border-line bg-panel px-1 text-center text-[11px] font-semibold text-ink-dim">
              Өдөр
            </th>
            <FillHead />
          </tr>
        </thead>
        <tbody>
          <tr>
            <AvgNameCell />
            <RateSummary value={c.problems} avg={null} suffix="" />
            {data.weeks.map((w) => (
              <td key={w.start} className="border-b border-line bg-panel text-center text-xs font-semibold tabular-nums text-ink">
                {weekAvg(w.start) ?? "—"}
              </td>
            ))}
            <td className="border-b border-l border-line bg-panel text-center text-xs font-semibold tabular-nums text-ink">
              {c.accuracy === null ? "—" : `${c.accuracy}%`}
            </td>
            <td className="border-b border-line bg-panel text-center text-xs font-semibold tabular-nums text-ink">{c.tests ?? "—"}</td>
            <td className="border-b border-line bg-panel text-center text-xs font-semibold tabular-nums text-ink">{c.activeDays ?? "—"}</td>
            <Fill panel />
          </tr>
          {rows.map((s) => {
            const st = data.stats.students[s.id]?.independent;
            return (
              <tr key={s.id} className="row-interactive">
                <NameCell s={s} onFocus={onFocus} />
                <RateSummary value={st?.problems ?? 0} avg={c.problems} suffix="" />
                {data.weeks.map((w) => {
                  const v = weekSum.get(`${s.id}|${w.start}`);
                  const n = v?.problems ?? 0;
                  return (
                    <td key={w.start} className="border-b border-line p-0.5 text-center">
                      {n || v?.tests ? (
                        <span
                          className="mx-auto flex h-8 w-12 flex-col items-center justify-center rounded-md text-xs font-semibold leading-none tabular-nums text-ink"
                          style={{ backgroundColor: `color-mix(in srgb, var(--color-brand-bright) ${Math.round(8 + (n / max) * 32)}%, transparent)` }}
                          title={`${n} бодлого${v?.tests ? `, ${v.tests} тест` : ""}`}
                        >
                          {n}
                          {v?.tests ? <span className="mt-0.5 text-[10px] font-medium text-ink-dim">{v.tests} тест</span> : null}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-dim/60">0</span>
                      )}
                    </td>
                  );
                })}
                <td className="border-b border-l border-line text-center text-xs tabular-nums text-ink">
                  {st?.accuracy === null || st?.accuracy === undefined ? "—" : `${st.accuracy}%`}
                </td>
                <td className="border-b border-line text-center text-xs tabular-nums text-ink">{st?.tests || "—"}</td>
                <td className="border-b border-line text-center text-xs tabular-nums text-ink">{st?.activeDays || "—"}</td>
                <Fill />
              </tr>
            );
          })}
        </tbody>
      </Shell>
    </div>
  );
}

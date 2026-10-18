"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, CalendarCheck, ClipboardCheck, ExternalLink, PencilLine, X } from "lucide-react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/kit/drawer";
import { Meta } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";
import { formatMnDate } from "@/lib/dateMn";
import { ATTENDANCE_MARKS, HOMEWORK_MARKS, type MarkMeta } from "@/components/attendance/marks";
import { DeltaText, MarkBox } from "./MonthGrids";
import { dayLabel, monthLabel, WEEKDAY_SHORT } from "./meta";
import type { MonthData } from "./types";

/**
 * Нэг хүүхдийн товч самбар (эзэн 2026-10-13): сарын ирц, даалгавар, шалгалт,
 * бие даасан ажил — ангийн дундаж ба байртай нь зэрэгцүүлнэ. Бүтэн хувийн
 * хэрэг /app/students/[id].
 */
export default function StudentFocus({
  data,
  studentId,
  onClose,
}: {
  data: MonthData;
  studentId: string | null;
  onClose: () => void;
}) {
  const s = studentId ? data.students.find((x) => x.id === studentId) ?? null : null;
  return (
    <Drawer open={!!s} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto w-full max-w-xl">
        {s && <FocusBody data={data} studentId={s.id} name={`${s.lastName} ${s.firstName}`} code={s.studentCode} />}
      </DrawerContent>
    </Drawer>
  );
}

/** Өндрөөс нь байр (утгагүй сурагч тооцогдохгүй) */
function rankOf(values: (number | null)[], mine: number | null) {
  const xs = values.filter((v): v is number => v !== null);
  if (mine === null || xs.length < 2) return null;
  return { pos: xs.filter((v) => v > mine).length + 1, of: xs.length };
}

function FocusBody({ data, studentId, name, code }: { data: MonthData; studentId: string; name: string; code: string | null }) {
  const st = data.stats.students[studentId];
  const c = data.stats.class;
  const all = Object.values(data.stats.students);
  if (!st) return null;
  const ranks = {
    attendance: rankOf(all.map((x) => x.attendance.rate), st.attendance.rate),
    homework: rankOf(all.map((x) => x.homework.rate), st.homework.rate),
    exam: rankOf(all.map((x) => x.exam.avg), st.exam.avg),
    independent: rankOf(all.map((x) => x.independent.problems), st.independent.problems),
  };
  const maxProblems = Math.max(1, ...all.map((x) => x.independent.problems));
  // Ирээдүйн өдрүүд хоосон нүд л болно — өнөөдрийг хүртэл
  const lessonDays = data.days.filter((d) => !d.holiday && d.date <= data.today);
  const att = data.attendance[studentId] ?? {};
  const hw = data.homework[studentId] ?? {};
  const ind = data.independent[studentId] ?? {};
  const days = Object.keys(ind).length ? monthDays(data.month) : [];
  const dayMax = Math.max(1, ...Object.values(ind).map((v) => v.problems));

  return (
    <>
      <div className="flex items-start gap-2 px-4 pb-2 pt-3">
        <div className="min-w-0 flex-1">
          <DrawerTitle className="truncate text-lg font-bold text-ink">{name}</DrawerTitle>
          <DrawerDescription className="text-sm text-ink-dim">
            <Meta items={[monthLabel(data.month), code]} />
          </DrawerDescription>
        </div>
        <DrawerClose
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand"
          aria-label="Хаах"
        >
          <X className="h-5 w-5" aria-hidden />
        </DrawerClose>
      </div>

      <div className="space-y-4 overflow-y-auto px-4 pb-6">
        <ul className="divide-y divide-line rounded-2xl border border-line">
          <Compare
            icon={CalendarCheck}
            label="Ирц"
            value={st.attendance.rate}
            avg={c.attendance}
            unit="%"
            rank={ranks.attendance}
            detail={[
              st.attendance.present ? `${st.attendance.present} ирсэн` : null,
              st.attendance.late ? `${st.attendance.late} хоцорсон` : null,
              st.attendance.absent ? `${st.attendance.absent} тасалсан` : null,
              st.attendance.excused ? `${st.attendance.excused} чөлөөтэй` : null,
            ]}
          />
          <Compare
            icon={PencilLine}
            label="Даалгавар"
            value={st.homework.rate}
            avg={c.homework}
            unit="%"
            rank={ranks.homework}
            detail={[
              st.homework.done ? `${st.homework.done} хийсэн` : null,
              st.homework.partial ? `${st.homework.partial} дутуу` : null,
              st.homework.notDone ? `${st.homework.notDone} хийгээгүй` : null,
            ]}
          />
          <Compare
            icon={ClipboardCheck}
            label="Шалгалт"
            value={st.exam.avg}
            avg={c.exam}
            unit="%"
            rank={ranks.exam}
            detail={[st.exam.taken ? `${st.exam.taken} өгсөн` : null, st.exam.missed ? `${st.exam.missed} ирээгүй` : null]}
          />
          <Compare
            icon={BookOpen}
            label="Бие даасан бодлого"
            value={st.independent.problems}
            avg={c.problems}
            scale={maxProblems}
            rank={st.independent.problems ? ranks.independent : null}
            detail={[
              st.independent.accuracy !== null ? `${st.independent.accuracy}% зөв` : null,
              st.independent.tests ? `${st.independent.tests} тест` : null,
              st.independent.activeDays ? `${st.independent.activeDays} өдөр` : null,
            ]}
          />
        </ul>

        {lessonDays.length > 0 && (
          <Section title="Хичээлийн өдрүүд">
            <div className="relative overflow-x-auto">
              <table className="border-separate border-spacing-0.5 text-center">
                <thead>
                  <tr>
                    <th scope="col">
                      <span className="sr-only">Төрөл</span>
                    </th>
                    {lessonDays.map((d) => (
                      <th key={d.date} scope="col" className="w-8 text-[10px] font-semibold leading-tight text-ink-dim" title={formatMnDate(d.date)}>
                        <span className="block">{WEEKDAY_SHORT[d.weekday]}</span>
                        <span className="block tabular-nums">{dayLabel(d.date).split("/")[1]}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <StripRow label="Ирц" days={lessonDays.map((d) => d.date)} get={(d) => att[d]} meta={ATTENDANCE_MARKS as Record<string, MarkMeta>} />
                  <StripRow label="Даалгавар" days={lessonDays.map((d) => d.date)} get={(d) => hw[d]} meta={HOMEWORK_MARKS as Record<string, MarkMeta>} />
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {data.exams.length > 0 && (
          <Section title="Шалгалт">
            <ul className="divide-y divide-line">
              {data.exams.map((e) => {
                const p = e.results[studentId];
                return (
                  <li key={e.testId} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate text-ink">{e.title}</span>
                    <span className="shrink-0 text-xs tabular-nums text-ink-dim">анги {e.avg === null ? "—" : `${e.avg}%`}</span>
                    <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-ink">
                      {p !== undefined ? `${p}%` : e.absentIds.includes(studentId) ? "Ирээгүй" : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section title="Бие даасан ажил, өдрөөр">
          {days.length === 0 ? (
            <p className="text-sm text-ink-dim">Энэ сард бие даан бодоогүй</p>
          ) : (
            <div className="flex h-16 items-end gap-px" role="img" aria-label={`Өдөр бүрийн бодлого: ${Object.values(ind).reduce((a, v) => a + v.problems, 0)} нийт`}>
              {days.map((d) => {
                const v = ind[d];
                const n = v?.problems ?? 0;
                return (
                  <span
                    key={d}
                    title={`${formatMnDate(d)} — ${n} бодлого${v?.tests ? `, ${v.tests} тест` : ""}`}
                    className={cn("flex-1 rounded-sm", n || v?.tests ? "bg-brand-bright/70" : "bg-ink/8")}
                    style={{ height: `${n ? Math.max(10, (n / dayMax) * 100) : v?.tests ? 10 : 4}%` }}
                  />
                );
              })}
            </div>
          )}
          {(data.selfTests[studentId] ?? []).length > 0 && (
            <ul className="mt-2 divide-y divide-line">
              {(data.selfTests[studentId] ?? []).map((t, i) => (
                <li key={`${t.testId}-${i}`} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="w-12 shrink-0 tabular-nums text-ink-dim">{dayLabel(t.day)}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-ink">{t.percent === null ? "—" : `${t.percent}%`}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Link
          href={`/app/students/${encodeURIComponent(studentId)}`}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-brand hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand"
        >
          <ExternalLink className="h-4 w-4" aria-hidden /> Хувийн хэрэг нээх
        </Link>
      </div>
    </>
  );
}

function monthDays(month: string) {
  const [y, m] = month.split("-").map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-1.5 text-sm font-bold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Compare({
  icon: Icon,
  label,
  value,
  avg,
  unit = "",
  scale = 100,
  rank,
  detail,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number | null;
  avg: number | null;
  unit?: string;
  scale?: number;
  rank: { pos: number; of: number } | null;
  detail: (string | null)[];
}) {
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / scale) * 100))}%`;
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-brand-soft" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{label}</span>
        {rank && (
          <span className="shrink-0 text-xs tabular-nums text-ink-dim">
            {rank.pos}/{rank.of}-р байр
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold tabular-nums text-ink">
          {value === null ? "—" : value}
          {value !== null && <span className="text-sm font-semibold text-ink-dim">{unit}</span>}
        </span>
        <DeltaText value={value} avg={avg} unit={unit} />
        <span className="ml-auto text-xs tabular-nums text-ink-dim">
          Анги {avg === null ? "—" : `${avg}${unit}`}
        </span>
      </div>
      <div className="relative mt-1.5 h-2 rounded-full bg-ink/10" aria-hidden>
        {value !== null && <span className="absolute inset-y-0 left-0 rounded-full bg-brand-bright" style={{ width: pct(value) }} />}
        {avg !== null && <span className="absolute -top-1 h-4 w-0.5 rounded bg-ink" style={{ left: pct(avg) }} />}
      </div>
      <Meta className="mt-1 text-xs text-ink-dim" items={detail} />
    </li>
  );
}

function StripRow({
  label,
  days,
  get,
  meta,
}: {
  label: string;
  days: string[];
  get: (d: string) => string | undefined;
  meta: Record<string, MarkMeta>;
}) {
  return (
    <tr>
      <th scope="row" className="pr-1 text-left text-[11px] font-semibold text-ink-dim">
        {label}
      </th>
      {days.map((d) => {
        const st = get(d);
        if (!st) return <td key={d} className="h-8 w-8 rounded-md border border-dashed border-line" title={`${label}: тэмдэглээгүй`} />;
        return (
          <td key={d} className="h-8 w-8" title={`${label}: ${meta[st]?.label ?? ""}`}>
            <MarkBox status={st} meta={meta} />
          </td>
        );
      })}
    </tr>
  );
}

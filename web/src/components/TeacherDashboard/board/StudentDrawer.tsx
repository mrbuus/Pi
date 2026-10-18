"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, Minus, Phone, StickyNote, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ATTENDANCE_MARKS,
  ATTENDANCE_ORDER,
  HOMEWORK_MARKS,
  TONE_SELECTED,
  TONE_TEXT,
  type AttendanceStatus,
  type HomeworkStatus,
} from "@/components/attendance/marks";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  LATE_RANGE_SHORT,
  dayLabel,
  fmtPhone,
  fromKey,
  fullDate,
  monthLabel,
  shortDay,
  ubParts,
  whenLabel,
  type LateRangeValue,
} from "./lib";

interface StudentCardData {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    code: string | null;
    phone: string | null;
    fatherPhone: string | null;
    motherPhone: string | null;
    school: string | null;
    grade: number | null;
    joinedOn: string;
    registeredAt: string;
    lastSeenAt: string | null;
  };
  month: {
    from: string;
    to: string;
    lessonDays: string[];
    attendance: { date: string; status: AttendanceStatus; lateRange: LateRangeValue | null; note: string | null }[];
  };
  homework: { date: string; status: HomeworkStatus | null; comment: string | null }[];
  notes: { date: string; status: AttendanceStatus; note: string }[];
}

function Section({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-3.5">
      <h3 className="mb-2 flex items-baseline justify-between gap-2 text-xs font-bold text-ink-dim">
        {title}
        {hint && <span className="font-medium">{hint}</span>}
      </h3>
      {children}
    </section>
  );
}

/** Сурагчийн товч мэдээлэл: компьютер дээр баруун талын самбар, утсан дээр бүтэн дэлгэц */
export default function StudentDrawer({
  classId,
  className,
  studentId,
  name,
  date,
  today,
  flags,
  onClose,
}: {
  classId: string;
  className: string;
  studentId: string;
  /** Самбарын жагсаалттай ижил нэр («Б. Нэр», давхцвал овог бүтнээр) */
  name: string;
  date: string;
  today: string;
  flags: string[];
  onClose: () => void;
}) {
  const [data, setData] = useState<StudentCardData | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    api<StudentCardData>(`/attendance/classrooms/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}?date=${date}`)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError("");
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Мэдээлэл ачаалагдсангүй"));
    return () => {
      alive = false;
    };
  }, [classId, studentId, date, retry]);

  const sel = fromKey(date);
  const s = data?.student;

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-[2px]" />
        <Dialog.Content
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.querySelector<HTMLElement>(`[data-name-id="${studentId}"]`)?.focus();
          }}
          className="elev-3 fixed inset-0 z-[71] flex flex-col bg-surface lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[30rem] lg:border-l lg:border-line"
        >
          <header className="shrink-0 border-b border-line px-4 py-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Dialog.Title className="cyrillic-heading truncate text-lg font-extrabold text-ink">{name}</Dialog.Title>
                <Dialog.Description asChild>
                  <p className="text-xs text-ink-dim">
                    <Meta items={[s ? `${s.lastName} ${s.firstName}` : null, className, s?.code ?? null]} />
                  </p>
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Хаах"
                className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
              >
                <X className="size-5" aria-hidden />
              </Dialog.Close>
            </div>

            {flags.length > 0 && (
              <div role="note" className="mt-2 flex items-start gap-2 rounded-lg border border-error/40 bg-error/[0.08] px-2.5 py-2 text-sm">
                <span aria-hidden className="mt-1.5 inline-flex size-2.5 shrink-0 rounded-full bg-error ring-2 ring-error/20" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-error">Шалгуур хангаагүй</p>
                  <ul className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 font-semibold text-ink">
                    {flags.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Сурагч, аав, ээж — гурвуулаа ҮРГЭЛЖ харагдана (дугааргүй бол «оруулаагүй») */}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(
                [
                  ["Сурагч", s?.phone ?? null],
                  ["Аав", s?.fatherPhone ?? null],
                  ["Ээж", s?.motherPhone ?? null],
                ] as const
              ).map(([label, phone]) =>
                phone ? (
                  <a
                    key={label}
                    href={`tel:${phone}`}
                    aria-label={`${label} руу залгах, ${fmtPhone(phone)}`}
                    className="flex min-h-12 min-w-0 flex-col justify-center rounded-lg border border-line px-2 py-1 hover:bg-ink/5"
                  >
                    <span className="flex items-center gap-1 text-[11px] text-ink-dim">
                      <Phone className="size-3 text-brand" aria-hidden />
                      {label}
                    </span>
                    <span className="truncate text-sm font-semibold tabular-nums text-ink">{fmtPhone(phone)}</span>
                  </a>
                ) : (
                  <span key={label} className="flex min-h-12 min-w-0 flex-col justify-center rounded-lg border border-dashed border-line px-2 py-1">
                    <span className="text-[11px] text-ink-dim">{label}</span>
                    <span className="truncate text-xs text-ink-dim">{data ? "оруулаагүй" : "…"}</span>
                  </span>
                ),
              )}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {error ? (
              <div className="p-4">
                <ErrorState message={error} onRetry={() => setRetry((r) => r + 1)} />
              </div>
            ) : !data ? (
              <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-3 p-4">
                <SkeletonLine width="40%" />
                <div className="skeleton h-12 rounded-lg" />
                <SkeletonLine width="55%" />
                <div className="skeleton h-28 rounded-lg" />
              </div>
            ) : (
              <DrawerBody data={data} date={date} today={today} y={sel.getFullYear()} m={sel.getMonth()} />
            )}
          </div>

          <footer className="flex shrink-0 justify-end border-t border-line px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <Link
              href={`/app/students/${encodeURIComponent(studentId)}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-bold text-brand hover:bg-brand-bright/10"
            >
              Бүтэн хуудас
              <ExternalLink className="size-4" aria-hidden />
            </Link>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DrawerBody({ data, date, today, y, m }: { data: StudentCardData; date: string; today: string; y: number; m: number }) {
  const s = data.student;
  const byDay = new Map(data.month.attendance.map((a) => [a.date, a]));
  const days = [...new Set([...data.month.lessonDays, ...data.month.attendance.map((a) => a.date)])].sort();
  const counts: Record<AttendanceStatus, number> = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
  for (const a of data.month.attendance) counts[a.status]++;

  const facts: Array<[string, string]> = [
    ["Сургууль", s.school || "Оруулаагүй"],
    ["Анги", s.grade ? `${s.grade}-р анги` : "Оруулаагүй"],
    ["Сурч эхэлсэн", fullDate(s.joinedOn)],
    ["Бүртгүүлсэн", fullDate(ubParts(s.registeredAt).key)],
    ["Сайтад сүүлд орсон", whenLabel(s.lastSeenAt, today)],
  ];

  return (
    <>
      <Section title={`Ирц, ${monthLabel(y, m)}`}>
        {days.length ? (
          <>
            <ul className="flex flex-wrap gap-1">
              {days.map((k) => {
                const a = byDay.get(k);
                const meta = a ? ATTENDANCE_MARKS[a.status] : null;
                const Icon = meta?.icon;
                const future = k > today;
                const before = k < s.joinedOn;
                const muted = !a && (future || before);
                const state = a
                  ? `${meta!.label}${a.lateRange ? ` ${LATE_RANGE_SHORT[a.lateRange]}` : ""}`
                  : before
                    ? "элсэхээс өмнө"
                    : future
                      ? "хараахан болоогүй"
                      : "тэмдэглээгүй";
                return (
                  <li
                    key={k}
                    title={`${dayLabel(k)}, ${state}`}
                    className={cn(
                      "flex h-12 w-9 flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px] tabular-nums",
                      meta ? TONE_SELECTED[meta.tone] : muted ? "border-dashed border-line text-ink-dim/60" : "border-line text-ink-dim",
                      k === date && "ring-2 ring-brand-bright ring-offset-1 ring-offset-surface",
                    )}
                  >
                    <span className="font-semibold leading-none">{fromKey(k).getDate()}</span>
                    {Icon ? <Icon className="size-3.5" aria-hidden /> : muted ? <span className="h-3.5" /> : <Minus className="size-3.5 opacity-60" aria-hidden />}
                    <span className="sr-only">
                      {dayLabel(k)}, {state}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-dim">
              {ATTENDANCE_ORDER.map((a) => {
                const Icon = ATTENDANCE_MARKS[a].icon;
                return (
                  <span key={a} className="inline-flex items-center gap-1">
                    <Icon className={cn("size-3.5", TONE_TEXT[ATTENDANCE_MARKS[a].tone])} aria-hidden />
                    {ATTENDANCE_MARKS[a].label} <b className="font-bold tabular-nums text-ink">{counts[a]}</b>
                  </span>
                );
              })}
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-dim">Энэ сард хичээл ороогүй</p>
        )}
      </Section>

      <Section title="Сүүлийн даалгавар">
        {data.homework.length ? (
          <ul className="divide-y divide-line">
            {data.homework.map((h) => {
              const meta = h.status ? HOMEWORK_MARKS[h.status] : null;
              const Icon = meta?.icon;
              return (
                <li key={h.date} className="grid min-h-10 grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2 py-1.5 text-sm">
                  <span className="text-ink">{shortDay(h.date)}</span>
                  <span className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
                      {Icon && meta ? (
                        <>
                          <Icon className={cn("size-4 shrink-0", TONE_TEXT[meta.tone])} aria-hidden />
                          {meta.label}
                        </>
                      ) : (
                        <span className="text-ink-dim">Тэмдэглээгүй</span>
                      )}
                    </span>
                    {h.comment && <span className="block truncate text-xs text-ink-dim">{h.comment}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-dim">Даалгаврын тэмдэглэгээ алга</p>
        )}
      </Section>

      <Section title="Ирцийн тэмдэглэл">
        {data.notes.length ? (
          <ul className="space-y-2">
            {data.notes.map((n) => (
              <li key={n.date} className="flex gap-2 text-sm">
                <StickyNote className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                <div className="min-w-0">
                  <p className="text-ink">{n.note}</p>
                  <p className="text-xs text-ink-dim">
                    <Meta items={[shortDay(n.date), ATTENDANCE_MARKS[n.status].label]} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-dim">Тэмдэглэл алга</p>
        )}
      </Section>

      <Section title="Мэдээлэл">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-ink-dim">{k}</dt>
              <dd className="text-sm font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}

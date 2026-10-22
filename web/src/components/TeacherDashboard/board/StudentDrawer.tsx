"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Minus, Phone, StickyNote, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  ATTENDANCE_MARKS,
  HOMEWORK_MARKS,
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
  addMonths,
  dayLabel,
  fmtPhone,
  fromKey,
  fullDate,
  monthKeyLabel,
  shortDay,
  stampLabel,
  ubParts,
  whenLabel,
  type LateRangeValue,
  type StatusCounts,
} from "./lib";
import { CountGrid, CountRow, attendanceCounts, homeworkCounts } from "./parts";

interface MonthAtt {
  date: string;
  status: AttendanceStatus;
  lateRange: LateRangeValue | null;
  note: string | null;
  /** Өөр ангид тэмдэглэсэн бол тэр ангийн нэр */
  classroom: string | null;
  markedBy: string | null;
}
interface MonthHw {
  date: string;
  status: HomeworkStatus | null;
  comment: string | null;
  classroom: string | null;
  markedBy: string | null;
}

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
    /** Энэ ангид элссэн өдөр — өмнөх хичээл «тэмдэглээгүй» гэж тоологдохгүй */
    classJoinedOn: string;
    attendance: MonthAtt[];
    homework: MonthHw[];
    counts: StatusCounts;
  };
  history: { first: string | null; totals: StatusCounts; sent: number };
}

/** Сурагчийн тэмдэглэл (api/src/notes — StudentNote, ерөнхий төрөл) */
interface NoteBlock {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
}

const NOTE_MAX = 4000;

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

/** Сурагчийн drawer: компьютер дээр баруун талын самбар, утсан дээр бүтэн дэлгэц */
export default function StudentDrawer({
  classId,
  className,
  studentId,
  name,
  date,
  today,
  homework,
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
  /** Танхимын анги: дэвтрийн даалгаврын тэмдэглэгээг харуулна */
  homework: boolean;
  flags: string[];
  onClose: () => void;
}) {
  const [month, setMonth] = useState(() => date.slice(0, 7));
  const [card, setCard] = useState<{ month: string; data: StudentCardData } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    api<StudentCardData>(
      `/attendance/classrooms/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}?date=${date}&month=${month}`,
    )
      .then((d) => {
        if (!alive) return;
        setCard({ month, data: d });
        setError("");
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Мэдээлэл ачаалагдсангүй"));
    return () => {
      alive = false;
    };
  }, [classId, studentId, date, month, retry]);

  const data = card?.data ?? null;
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
            {error && !data ? (
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
              <>
                <TotalsSection data={data} homework={homework} />
                <MonthSection
                  data={data}
                  month={month}
                  loading={card?.month !== month}
                  error={card?.month !== month ? error : ""}
                  onRetry={() => setRetry((r) => r + 1)}
                  onMonth={setMonth}
                  date={date}
                  today={today}
                  homework={homework}
                  currentClass={className}
                />
                <NotesSection studentId={studentId} today={today} />
                <FactsSection data={data} today={today} />
              </>
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

/* ───────── Бүх хугацааны нийт ───────── */

function TotalsSection({ data, homework }: { data: StudentCardData; homework: boolean }) {
  const t = data.history.totals;
  return (
    <Section title="Нийт" hint={data.history.first ? `Эхний бичлэг: ${fullDate(data.history.first)}` : undefined}>
      {data.history.first ? (
        <CountGrid className="gap-y-1">
          <CountRow label="Ирц" items={attendanceCounts(t)} />
          <CountRow label="Даалгавар" items={homeworkCounts(homework ? t : null, { sent: data.history.sent })} />
        </CountGrid>
      ) : (
        <p className="text-sm text-ink-dim">Ирц, даалгаврын тэмдэглэгээ хараахан алга</p>
      )}
    </Section>
  );
}

/* ───────── Сараар: өдөр бүрийн ирц + даалгавар ───────── */

function MonthSection({
  data,
  month,
  loading,
  error,
  onRetry,
  onMonth,
  date,
  today,
  homework,
  currentClass,
}: {
  data: StudentCardData;
  month: string;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onMonth: (m: string) => void;
  date: string;
  today: string;
  homework: boolean;
  currentClass: string;
}) {
  const headingId = useId();
  // Хамгийн эхний бичлэг (эсвэл элссэн сар) ба өнөөдөр/сонгосон өдрийн сар хооронд
  const first = [data.history.first, data.student.joinedOn].filter((k): k is string => !!k).sort()[0] ?? date;
  const minMonth = first.slice(0, 7);
  const maxMonth = [today.slice(0, 7), date.slice(0, 7)].sort()[1];
  const canPrev = month > minMonth;
  const canNext = month < maxMonth;

  const m = data.month;
  const att = new Map(m.attendance.map((a) => [a.date, a]));
  const hw = new Map(m.homework.map((h) => [h.date, h]));
  const days = [
    ...new Set([...m.lessonDays, ...m.attendance.map((a) => a.date), ...(homework ? m.homework.filter((h) => h.status).map((h) => h.date) : [])]),
  ].sort();
  // Өдрийн тайлбар: ирцийн тайлбар, даалгаврын тайлбар, өөр ангид тэмдэглэсэн (шинэ нь дээр)
  const remarks = days
    .map((k) => ({ k, a: att.get(k), h: homework ? hw.get(k) : undefined }))
    .filter(({ a, h }) => a?.note || h?.comment || a?.classroom || h?.classroom)
    .reverse();

  const nav = (dir: -1 | 1) => (
    <button
      type="button"
      onClick={() => onMonth(addMonths(month, dir))}
      disabled={dir === -1 ? !canPrev : !canNext}
      aria-label={dir === -1 ? "Өмнөх сар" : "Дараагийн сар"}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-ink/5 disabled:opacity-30 sm:size-9"
    >
      {dir === -1 ? <ChevronLeft className="size-5" aria-hidden /> : <ChevronRight className="size-5" aria-hidden />}
    </button>
  );

  return (
    <section aria-labelledby={headingId} className="border-b border-line px-4 py-3">
      <div className="-mx-2 mb-1.5 flex items-center gap-1">
        {nav(-1)}
        <h3 id={headingId} className="cyrillic-heading flex min-w-0 flex-1 items-center justify-center gap-1.5 text-sm font-bold text-ink">
          {monthKeyLabel(month)}
          {loading && !error && <LoaderCircle className="size-3.5 animate-spin text-brand motion-reduce:animate-none" aria-label="Ачаалж байна" />}
        </h3>
        {nav(1)}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-2">
          <div className="skeleton h-16 rounded-lg" />
          <SkeletonLine width="70%" />
        </div>
      ) : days.length ? (
        <>
          <ul className="flex flex-wrap gap-1" aria-label={`${monthKeyLabel(month)}, хичээл бүрийн ирц ба даалгавар`}>
            {days.map((k) => {
              const a = att.get(k);
              const h = homework ? hw.get(k) : undefined;
              const am = a ? ATTENDANCE_MARKS[a.status] : null;
              const hm = h?.status ? HOMEWORK_MARKS[h.status] : null;
              const AttIcon = am?.icon;
              const HwIcon = hm?.icon;
              const muted = !a && !hm && (k > today || k < m.classJoinedOn);
              const attText = a
                ? `${am!.label}${a.lateRange ? ` ${LATE_RANGE_SHORT[a.lateRange]}` : ""}`
                : k > today
                  ? "хараахан болоогүй"
                  : k < m.classJoinedOn
                    ? "элсэхээс өмнө"
                    : "ирц тэмдэглээгүй";
              const hwText = homework ? (hm ? `даалгавар ${hm.label.toLowerCase()}` : "даалгавар тэмдэглээгүй") : "";
              const where = a?.classroom ?? h?.classroom ?? null;
              const label = [dayLabel(k), attText, hwText, where ? `${where} анги` : ""].filter(Boolean).join(", ");
              return (
                <li
                  key={k}
                  title={label}
                  className={cn(
                    "flex w-10 flex-col items-center justify-center gap-0.5 rounded-lg border py-1 text-[11px] tabular-nums",
                    homework ? "h-[3.75rem]" : "h-12",
                    muted ? "border-dashed border-line text-ink-dim/60" : "border-line bg-surface text-ink",
                    where && "border-info/50",
                    k === date && "ring-2 ring-brand-bright ring-offset-1 ring-offset-surface",
                  )}
                >
                  <span className="font-semibold leading-none">{fromKey(k).getDate()}</span>
                  {AttIcon && am ? (
                    <AttIcon className={cn("size-3.5", TONE_TEXT[am.tone])} aria-hidden />
                  ) : muted ? (
                    <span className="h-3.5" />
                  ) : (
                    <Minus className="size-3.5 text-ink-dim/60" aria-hidden />
                  )}
                  {homework &&
                    (HwIcon && hm ? (
                      <HwIcon className={cn("size-3.5", TONE_TEXT[hm.tone])} aria-hidden />
                    ) : muted ? (
                      <span className="h-3.5" />
                    ) : (
                      <Minus className="size-3.5 text-ink-dim/60" aria-hidden />
                    ))}
                  <span className="sr-only">{label}</span>
                </li>
              );
            })}
          </ul>

          <CountGrid className="mt-2.5 gap-y-1">
            <CountRow label="Ирц" items={attendanceCounts(m.counts, { unmarked: true })} />
            {homework && <CountRow label="Даалгавар" items={homeworkCounts(m.counts, { unmarked: true })} />}
          </CountGrid>

          {remarks.length > 0 && (
            <ul className="mt-3 space-y-2 border-t border-line pt-2.5" aria-label="Өдрийн тайлбар">
              {remarks.map(({ k, a, h }) => (
                <li key={k} className="flex gap-2 text-sm">
                  <StickyNote className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                  <div className="min-w-0">
                    {a?.note && <p className="break-words text-ink">Ирц: {a.note}</p>}
                    {h?.comment && <p className="break-words text-ink">Даалгавар: {h.comment}</p>}
                    <p className="text-xs text-ink-dim">
                      <Meta
                        items={[
                          shortDay(k),
                          a ? ATTENDANCE_MARKS[a.status].label : null,
                          h?.status ? HOMEWORK_MARKS[h.status].label : null,
                          (a?.classroom ?? h?.classroom) ? `${a?.classroom ?? h?.classroom} анги` : null,
                          a?.markedBy ?? h?.markedBy ?? null,
                        ]}
                      />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-sm text-ink-dim">{currentClass} ангид энэ сард хичээл ороогүй</p>
      )}
    </section>
  );
}

/* ───────── Тэмдэглэл: огноотой блок, шинэ нь дээр (эзэн 2026-10-22) ───────── */

function NotesSection({ studentId, today }: { studentId: string; today: string }) {
  const inputId = useId();
  const [notes, setNotes] = useState<NoteBlock[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let alive = true;
    api<NoteBlock[]>(`/students/${encodeURIComponent(studentId)}/notes?type=GENERAL`)
      .then((list) => {
        if (!alive) return;
        setNotes(Array.isArray(list) ? list : []);
        setLoadError("");
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : "Тэмдэглэл ачаалагдсангүй"));
    return () => {
      alive = false;
    };
  }, [studentId, retry]);

  const body = draft.trim();
  const add = async () => {
    if (!body || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const note = await api<NoteBlock>(`/students/${encodeURIComponent(studentId)}/notes`, {
        method: "POST",
        body: { type: "GENERAL", body },
      });
      setNotes((prev) => [note, ...(prev ?? [])]);
      setDraft("");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Хадгалж чадсангүй");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Тэмдэглэл" hint={notes && notes.length > 0 ? `${notes.length}` : undefined}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Шинэ тэмдэглэл
        </label>
        <textarea
          id={inputId}
          value={draft}
          maxLength={NOTE_MAX}
          rows={3}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void add();
            }
          }}
          placeholder="Сурагчийн талаар тэмдэглэл бичих"
          className="block w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus-visible:border-brand-bright"
        />
        <div className="mt-2 flex min-h-11 items-center gap-2">
          {saveError ? (
            <span role="alert" className="inline-flex min-w-0 items-center gap-1 text-xs text-error">
              <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0">{saveError}</span>
            </span>
          ) : draft.length > NOTE_MAX - 400 ? (
            <span className="text-xs tabular-nums text-ink-dim">
              {draft.length}/{NOTE_MAX}
            </span>
          ) : null}
          <button
            type="submit"
            disabled={!body || saving}
            className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand-bright px-4 text-sm font-bold text-on-brand transition-opacity disabled:opacity-50 sm:min-h-9"
          >
            {saving && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
            {saving ? "Хадгалж байна" : "Нэмэх"}
          </button>
        </div>
      </form>

      {loadError && !notes ? (
        <div className="mt-2">
          <ErrorState message={loadError} onRetry={() => setRetry((r) => r + 1)} />
        </div>
      ) : !notes ? (
        <div aria-busy="true" aria-label="Ачаалж байна" className="mt-2 space-y-2">
          <div className="skeleton h-16 rounded-lg" />
        </div>
      ) : notes.length === 0 ? (
        <p className="mt-1 text-sm text-ink-dim">Тэмдэглэл алга, дээр бичээд «Нэмэх» дарна</p>
      ) : (
        <ul className="mt-2 space-y-2" aria-label="Тэмдэглэлүүд, шинэ нь дээр">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-line bg-bg/50 px-3 py-2.5">
              <p className="text-xs text-ink-dim">
                <Meta
                  items={[
                    <time key="t" dateTime={n.createdAt} className="tabular-nums">
                      {stampLabel(n.createdAt, today)}
                    </time>,
                    n.authorName ? (
                      <span key="a" className="font-semibold text-ink">
                        {n.authorName}
                      </span>
                    ) : null,
                  ]}
                />
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ───────── Мэдээлэл ───────── */

function FactsSection({ data, today }: { data: StudentCardData; today: string }) {
  const s = data.student;
  const facts: Array<[string, string]> = [
    ["Сургууль", s.school || "Оруулаагүй"],
    ["Анги", s.grade ? `${s.grade}-р анги` : "Оруулаагүй"],
    ["Сурч эхэлсэн", fullDate(s.joinedOn)],
    ["Бүртгүүлсэн", fullDate(ubParts(s.registeredAt).key)],
    ["Сайтад сүүлд орсон", whenLabel(s.lastSeenAt, today)],
  ];
  return (
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
  );
}

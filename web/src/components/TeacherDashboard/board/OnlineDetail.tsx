"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CircleCheck, CircleX, Clock, FileImage, Laptop, LoaderCircle, MessageSquareText, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cleanTitle } from "@/components/homework-practice/lib";
import PagesReader from "@/components/student-hub/PagesReader";
import { HOMEWORK_MARKS, HOMEWORK_ORDER, TONE_SELECTED, type HomeworkStatus } from "@/components/attendance/marks";
import { Meta } from "@/components/ui/Meta";
import { ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMnDateTime } from "@/lib/dateMn";

type AnswerView = string | Record<string, string> | null;

interface DetailItem {
  n: number;
  problemId: string;
  mine: AnswerView;
  correct: AnswerView;
  result: "CORRECT" | "WRONG" | "BLANK" | null;
}
interface DetailAttempt {
  status: "IN_PROGRESS" | "SUBMITTED";
  startedAt: string;
  submittedAt: string | null;
  durationSec: number | null;
  activeSec: number;
  awaySec: number;
  leaveCount: number;
  openCount: number;
  checksUsed: number;
  late: boolean;
  score: number | null;
  total: number | null;
  items: DetailItem[];
}
interface DetailTest {
  testId: string;
  title: string;
  variant: string | null;
  problems: number;
  /** Хариуны түлхүүр (Б хувилбар) — сурагч бодоогүй ч харагдана */
  key?: { n: number; answer: AnswerView }[];
  attempt: DetailAttempt | null;
  exam: { score: number; max: number } | null;
}
interface DetailRedo {
  attemptId: string;
  testId: string;
  title: string;
  variant: string | null;
  /** CLASS = ангид бодсон (А), HOME = гэртээ (Б) */
  kind: "CLASS" | "HOME";
  status: "IN_PROGRESS" | "SUBMITTED";
  submittedAt: string | null;
  activeSec: number;
  leaveCount: number;
  score: number | null;
  total: number | null;
}
interface Detail {
  date: string;
  previousLessonDate: string | null;
  student: { id: string; firstName: string; lastName: string };
  tests: DetailTest[];
  photo: { fileKey: string; pages: number; uploadedAt: string; late?: boolean } | null;
  redos?: DetailRedo[];
  deadline?: { dueAt: string; allowLate: boolean; custom: boolean };
}

/** «11.05 21:30» — 24 цагийн хэлбэр */
const stamp = (iso: string) =>
  formatMnDateTime(iso, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** 75 мин → «1ц 15м»; 40 сек → «40с» */
function span(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}с`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}м${s % 60 ? ` ${s % 60}с` : ""}`;
  return `${Math.floor(m / 60)}ц${m % 60 ? ` ${m % 60}м` : ""}`;
}

/** «A», «35», «a=3 b=5» */
function show(v: AnswerView): string {
  if (v === null) return "";
  if (typeof v === "string") return v;
  return Object.entries(v)
    .map(([k, x]) => `${k}=${x || "_"}`)
    .join(" ");
}

/**
 * «Онлайн» дэлгэрэнгүй (эзэн 2026-11-05): бүтэн дэлгэц.
 * - Дээр: сурагч, сэдэв (тухайн хичээлд өгсөн бүх гэрийн тест — дарж солино), илгээсэн цаг, хугацаа.
 * - Зүүн багана: сонгосон тестийн Б хувилбарын хариу «1 A, 2 B…» (сурагч онлайнаар бодсон бол
 *   түүний хариу зөв/буруугаар).
 * - Баруун: илгээсэн дэвтрийн хуудсууд (томруулах, гүйлгэх, эргүүлэх).
 * - Доор ҮРГЭЛЖ: Хийсэн / Дутуу / Хийгээгүй + сэтгэгдэл — самбартай нэг хадгалалт.
 */
export default function OnlineDetail({
  classId,
  className,
  studentId,
  name,
  date,
  hw,
  hwNote,
  onHw,
  onHwNote,
  onClose,
}: {
  classId: string;
  className: string;
  studentId: string;
  name: string;
  date: string;
  hw: HomeworkStatus | null;
  hwNote: string;
  onHw: (id: string, v: HomeworkStatus | null) => void;
  onHwNote: (id: string, text: string, typed: boolean) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [note, setNote] = useState(hwNote);

  useEffect(() => {
    let alive = true;
    api<Detail>(
      `/classrooms/${encodeURIComponent(classId)}/homework-marks/online/${encodeURIComponent(studentId)}?date=${date}`,
    )
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError("");
      })
      .catch((e) => alive && setError(e instanceof Error && e.message ? e.message : "Мэдээлэл ачаалагдсангүй"));
    return () => {
      alive = false;
    };
  }, [classId, studentId, date, retry]);

  const tests = data?.tests ?? [];
  // Анхдагч: бодсон эхний тест (байхгүй бол эхний тест)
  const current = tests.find((t) => t.testId === pick) ?? tests.find((t) => t.attempt) ?? tests[0] ?? null;
  const a = current?.attempt ?? null;
  const byN = new Map((a?.items ?? []).map((it) => [it.n, it]));
  const key = current?.key ?? a?.items.map((it) => ({ n: it.n, answer: it.correct })) ?? [];
  const given = data?.previousLessonDate ? `${data.previousLessonDate.slice(5).replace("-", ".")}-ны даалгавар` : null;

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/40" />
        <Dialog.Content
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.querySelector<HTMLElement>(`[data-name-id="${studentId}"]`)?.focus();
          }}
          className="fixed inset-0 z-[71] flex h-[100dvh] flex-col bg-surface"
        >
          {/* ── Дээд: хэн, аль сэдэв, хэзээ илгээсэн ── */}
          <header className="shrink-0 space-y-2 border-b border-line px-3 py-2.5 sm:px-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Dialog.Title className="cyrillic-heading flex items-center gap-2 truncate text-lg font-extrabold text-ink">
                  <Laptop className="size-5 shrink-0 text-brand" aria-hidden />
                  <span className="truncate">{name}</span>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <p className="text-xs text-ink-dim">
                    <Meta items={[className, given]} />
                  </p>
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Хаах"
                className="-mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
              >
                <X className="size-5" aria-hidden />
              </Dialog.Close>
            </div>

            {/* Сэдэв: тухайн хичээлд өгсөн бүх гэрийн тест (Б хувилбар) — дарахад хариу нь солигдоно */}
            {tests.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xs font-semibold text-ink-dim">Сэдэв</span>
                <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]" aria-label="Гэрийн даалгаврын тест">
                  {tests.map((t) => {
                    const on = t.testId === current?.testId;
                    return (
                      <li key={t.testId} className="shrink-0">
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => setPick(t.testId)}
                          className={cn(
                            "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold sm:min-h-9",
                            on ? "border-brand-bright bg-brand-bright/10 text-brand-soft" : "border-line bg-surface text-ink hover:border-ink/30",
                          )}
                        >
                          <span className="cyrillic-tight max-w-[14rem] truncate">{cleanTitle(t.title, t.variant)}</span>
                          {t.attempt?.status === "SUBMITTED" && <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {data && (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-dim">
                <span className="inline-flex items-center gap-1">
                  <FileImage className="size-3.5" aria-hidden />
                  {data.photo ? (
                    <>
                      Зураг илгээсэн <b className="tabular-nums text-ink">{stamp(data.photo.uploadedAt)}</b>
                      {data.photo.late && <b className="text-error">Хоцорсон</b>}
                    </>
                  ) : (
                    "Зураг илгээгээгүй"
                  )}
                </span>
                {a && (
                  <span className="inline-flex items-center gap-1">
                    <Laptop className="size-3.5" aria-hidden />
                    {a.submittedAt ? (
                      <>
                        Онлайн <b className="tabular-nums text-ink">{a.score !== null && a.total !== null ? `${a.score}/${a.total}` : "–"}</b>, илгээсэн{" "}
                        <b className="tabular-nums text-ink">{stamp(a.submittedAt)}</b>
                        {a.late && <b className="text-error">Хоцорсон</b>}
                      </>
                    ) : (
                      "Онлайнаар бодож байна, илгээгээгүй"
                    )}
                  </span>
                )}
                {data.deadline && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" aria-hidden />
                    Хугацаа <b className="tabular-nums text-ink">{stamp(data.deadline.dueAt)}</b>
                    {!data.deadline.allowLate && "(дараа нь хаагдана)"}
                  </span>
                )}
              </p>
            )}
            {a && (
              <p className="text-xs text-ink-dim">
                <Meta
                  items={[
                    `бодсон ${span(a.activeSec)}`,
                    a.leaveCount ? <span key="leave" className={cn(a.leaveCount > 3 && "font-semibold text-warning")}>вэбээс гарсан {a.leaveCount} удаа</span> : "вэбээс гараагүй",
                    `нээсэн ${a.openCount} удаа`,
                    a.checksUsed ? `шалгасан ${a.checksUsed} удаа` : null,
                  ]}
                />
              </p>
            )}
          </header>

          {/* ── Дунд: зүүн хариу, баруун зураг ── */}
          <div className="min-h-0 flex-1">
            {error && !data && (
              <div className="p-4">
                <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />
              </div>
            )}
            {!data && !error && (
              <p role="status" className="flex items-center gap-2 p-4 text-sm text-ink-dim">
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                Ачаалж байна
              </p>
            )}
            {data && (
              <div className="grid h-full grid-cols-[4.75rem_minmax(0,1fr)] gap-2 p-2 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-3 sm:p-3">
                <section aria-label="Хариу" className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
                  <h3 className="shrink-0 border-b border-line px-2 py-1.5 text-xs font-bold text-ink-dim">
                    Хариу{current?.variant ? ` ${current.variant}` : ""}
                  </h3>
                  {key.length === 0 ? (
                    <p className="p-2 text-xs text-ink-dim">{tests.length ? "Хариу алга" : "Онлайн тест өгөөгүй"}</p>
                  ) : (
                    <ol className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
                      {key.map((k) => {
                        const it = byN.get(k.n);
                        const bad = it?.result === "WRONG";
                        const blank = it ? it.result === "BLANK" || (it.mine === null && it.result === null) : false;
                        return (
                          <li key={k.n} className={cn("flex min-h-9 items-center gap-1.5 px-2 text-sm tabular-nums", bad && "bg-error/[0.07]")}>
                            <span className="w-5 shrink-0 text-right text-xs text-ink-dim">{k.n}</span>
                            <span className="min-w-0 flex-1 break-words py-1 font-bold leading-tight text-ink">{show(k.answer) || "–"}</span>
                            {it?.result === "CORRECT" && <CircleCheck className="size-4 shrink-0 text-success" aria-label="Сурагч зөв" />}
                            {(bad || (it && blank)) && (
                              <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-error">
                                <CircleX className="size-4" aria-label={bad ? "Сурагч буруу" : "Сурагч хариулаагүй"} />
                                <span className="hidden sm:inline">{bad ? show(it.mine) : "–"}</span>
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                  {!!data.redos?.length && (
                    <div className="shrink-0 border-t border-line px-2 py-1.5 text-[11px] text-ink-dim">
                      <p className="font-bold">Дахин бодсон</p>
                      {data.redos.map((r) => (
                        <p key={r.attemptId} className="truncate tabular-nums">
                          {r.kind === "CLASS" ? "А" : "Б"} {r.score !== null && r.total !== null ? `${r.score}/${r.total}` : "бодож байна"}
                        </p>
                      ))}
                    </div>
                  )}
                </section>

                {data.photo ? (
                  <PagesReader key={data.photo.fileKey} keys={[data.photo.fileKey]} pages={data.photo.pages} className="h-full" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line p-4 text-center text-sm text-ink-dim">
                    <FileImage className="size-8 opacity-50" aria-hidden />
                    Дэвтрийн зураг илгээгээгүй
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Доод: үнэлгээ + сэтгэгдэл, үргэлж харагдана ── */}
          <footer className="shrink-0 space-y-2 border-t border-line bg-surface px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
            <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Даалгавар, ${name}`}>
              {HOMEWORK_ORDER.map((v) => {
                const m = HOMEWORK_MARKS[v];
                const Icon = m.icon;
                const on = hw === v;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onHw(studentId, on ? null : v)}
                    className={cn(
                      "inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border text-sm font-bold transition-colors active:opacity-80",
                      on ? TONE_SELECTED[m.tone] : "border-line bg-surface text-ink hover:border-ink/30",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <label className="flex items-start gap-2 rounded-xl border border-line bg-bg px-3 py-2 focus-within:border-brand-bright">
              <MessageSquareText className="mt-1 size-4 shrink-0 text-ink-dim" aria-hidden />
              <span className="sr-only">Сэтгэгдэл</span>
              <textarea
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  onHwNote(studentId, e.target.value, true);
                }}
                rows={2}
                placeholder="Сэтгэгдэл бичих"
                className="min-h-11 w-full resize-none bg-transparent text-base text-ink outline-none placeholder:text-ink-dim sm:text-sm"
              />
            </label>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

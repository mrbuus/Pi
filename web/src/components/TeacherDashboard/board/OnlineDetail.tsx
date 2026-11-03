"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CircleCheck, CircleX, ExternalLink, Laptop, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cleanTitle } from "@/components/homework-practice/lib";
import PhotoPages from "@/components/student-hub/PhotoPages";
import { HOMEWORK_MARKS, type HomeworkStatus } from "@/components/attendance/marks";
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
  attempt: DetailAttempt | null;
  exam: { score: number; max: number } | null;
}
interface Detail {
  date: string;
  previousLessonDate: string | null;
  student: { id: string; firstName: string; lastName: string };
  tests: DetailTest[];
  photo: { fileKey: string; pages: number; uploadedAt: string } | null;
}

const stamp = (iso: string) => formatMnDateTime(iso, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

/** 75 мин → «1ц 15м»; 40 сек → «40с»; 125 сек → «2м 5с» */
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

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-surface px-2.5 py-1.5">
      <p className="truncate text-[11px] text-ink-dim">{label}</p>
      <p className={cn("truncate text-sm font-bold tabular-nums", warn ? "text-warning" : "text-ink")}>{value}</p>
    </div>
  );
}

/**
 * «Онлайн» дэлгэрэнгүй (эзэн 2026-11-03): сурагчийн онлайн гэрийн даалгавар — тестийн нэр дээд талд
 * (дарахад тэр тестийн хариу), оноо «зөв/нийт», бодсон хугацаа, вэбээс гарсан тоо, хариуны ганц
 * багана (бодлогын дугаар + үсэг), мөн илгээсэн дэвтрийн зураг — нэмэлт дарахгүйгээр харагдана.
 * Бодлогын агуулга харуулахгүй.
 */
export default function OnlineDetail({
  classId,
  className,
  studentId,
  name,
  date,
  hw,
  hwNote,
  onClose,
}: {
  classId: string;
  className: string;
  studentId: string;
  name: string;
  date: string;
  /** Багшийн тэр өдрийн даалгаврын тэмдэглэгээ ба тайлбар — хариуны доор харагдана */
  hw: HomeworkStatus | null;
  hwNote: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [pick, setPick] = useState<string | null>(null);

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

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-[2px]" />
        <Dialog.Content
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.querySelector<HTMLElement>(`[data-name-id="${studentId}"]`)?.focus();
          }}
          className="elev-3 fixed inset-0 z-[71] flex flex-col bg-surface lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[34rem] lg:border-l lg:border-line"
        >
          <header className="shrink-0 border-b border-line px-4 py-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Dialog.Title className="cyrillic-heading flex items-center gap-2 truncate text-lg font-extrabold text-ink">
                  <Laptop className="size-5 shrink-0 text-brand" aria-hidden />
                  <span className="truncate">{name}</span>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <p className="text-xs text-ink-dim">
                    <Meta items={[className, data?.previousLessonDate ? `${data.previousLessonDate.slice(5).replace("-", ".")}-ны даалгавар` : null]} />
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

            {/* Тестийн нэр — дээд талд; дарахад тэр тестийн хариу */}
            {tests.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Онлайн гэрийн даалгаврын тест">
                {tests.map((t) => {
                  const on = t.testId === current?.testId;
                  return (
                    <li key={t.testId} className="min-w-0 max-w-full">
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setPick(t.testId)}
                        className={cn(
                          "inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold sm:min-h-9",
                          on ? "border-brand-bright bg-brand-bright/10 text-brand-soft" : "border-line bg-surface text-ink hover:border-ink/30",
                        )}
                      >
                        <span className="cyrillic-tight min-w-0 truncate">{cleanTitle(t.title, t.variant)}</span>
                        {t.attempt?.status === "SUBMITTED" ? (
                          <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
            {error && !data && <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />}
            {!data && !error && (
              <p role="status" className="flex items-center gap-2 py-6 text-sm text-ink-dim">
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                Ачаалж байна
              </p>
            )}
            {data && tests.length === 0 && !data.photo && (
              <p className="py-6 text-center text-sm text-ink-dim">Энэ хичээлд онлайн гэрийн даалгавар алга</p>
            )}

            {data && current && (
              <div className="space-y-3">
                {!a && !current.exam && (
                  <p className="rounded-lg border border-dashed border-line px-3 py-3 text-sm text-ink-dim">Онлайнаар бодоогүй</p>
                )}

                {!a && current.exam && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
                    <p className="text-sm text-ink">
                      Оноо{" "}
                      <b className="font-bold tabular-nums">
                        {current.exam.score}/{current.exam.max}
                      </b>
                    </p>
                    <Link
                      href={`/app/tests/${encodeURIComponent(current.testId)}/results`}
                      className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand hover:underline sm:min-h-8"
                    >
                      Дүн нээх
                      <ExternalLink className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                )}

                {a && (
                  <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <Stat
                        label="Зөв"
                        value={a.score !== null && a.total !== null ? `${a.score}/${a.total}` : a.status === "IN_PROGRESS" ? "Бодож байна" : "–"}
                      />
                      <Stat label="Бодсон хугацаа" value={span(a.activeSec)} />
                      <Stat label="Вэбээс гарсан" value={a.leaveCount ? `${a.leaveCount} удаа` : "Гараагүй"} warn={a.leaveCount > 3} />
                      <Stat label="Эхэлсэн" value={stamp(a.startedAt)} />
                      <Stat label={a.submittedAt ? "Илгээсэн" : "Төлөв"} value={a.submittedAt ? stamp(a.submittedAt) : "Илгээгээгүй"} warn={a.late} />
                      <Stat label="Нээсэн" value={`${a.openCount} удаа`} />
                    </div>
                    <p className="text-xs text-ink-dim">
                      <Meta
                        items={[
                          a.late ? "Хоцорч илгээсэн" : null,
                          a.awaySec > 0 ? `вэбээс гарсан ${span(a.awaySec)}` : null,
                          a.durationSec !== null ? `эхэлснээс илгээх хүртэл ${span(a.durationSec)}` : null,
                          a.checksUsed ? `шалгасан ${a.checksUsed} удаа` : null,
                        ]}
                      />
                    </p>
                  </>
                )}

                <div className={cn("grid gap-4", a && data.photo && "sm:grid-cols-[minmax(0,1fr)_9.5rem]")}>
                  {/* Дэвтрийн зураг — нэмэлт дарахгүйгээр харагдана */}
                  {data.photo && (
                    <section aria-label="Илгээсэн дэвтрийн зураг" className="min-w-0 sm:order-1">
                      <h3 className="mb-1.5 text-xs font-bold text-ink-dim">
                        Дэвтрийн зураг
                        <span className="ml-2 font-medium tabular-nums">{stamp(data.photo.uploadedAt)}</span>
                      </h3>
                      <PhotoPages
                        keys={[data.photo.fileKey]}
                        pages={data.photo.pages}
                        title={`${name} — дэвтрийн зураг`}
                        subtitle={className}
                        autoLoad
                      />
                    </section>
                  )}

                  {/* Хариуны ганц багана: бодлогын дугаар + үсэг; алдсан бол зөв хариу */}
                  {a && (
                    <section aria-label="Хариу" className="min-w-0 sm:order-2">
                      <h3 className="mb-1.5 text-xs font-bold text-ink-dim">Хариу</h3>
                      <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                        {a.items.map((it) => {
                          const bad = it.result === "WRONG";
                          const blank = it.result === "BLANK" || (it.mine === null && it.result === null);
                          return (
                            <li
                              key={it.problemId}
                              className={cn(
                                "flex min-h-8 items-center gap-2 px-2.5 text-sm tabular-nums",
                                bad && "bg-error/[0.07]",
                              )}
                            >
                              <span className="w-6 shrink-0 text-right text-xs text-ink-dim">{it.n}</span>
                              <span className={cn("min-w-0 flex-1 truncate font-bold", blank ? "text-ink-dim" : "text-ink")}>
                                {blank ? "–" : show(it.mine)}
                              </span>
                              {it.result === "CORRECT" && <CircleCheck className="size-4 shrink-0 text-success" aria-label="Зөв" />}
                              {(bad || it.result === "BLANK") && (
                                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-error">
                                  <CircleX className="size-4" aria-label={bad ? "Буруу" : "Хариулаагүй"} />
                                  {it.correct !== null && <span className="text-ink-dim">{show(it.correct)}</span>}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  )}
                </div>

                {!data.photo && a && (
                  <p className="text-xs text-ink-dim">Дэвтрийн зураг илгээгээгүй</p>
                )}

                {(hw || hwNote.trim()) && (
                  <section aria-label="Даалгаврын тэмдэглэл" className="rounded-lg border border-line bg-panel px-3 py-2.5">
                    <h3 className="mb-1 text-xs font-bold text-ink-dim">Даалгаврын тэмдэглэл</h3>
                    {hw && <p className="text-sm font-semibold text-ink">{HOMEWORK_MARKS[hw].label}</p>}
                    {hwNote.trim() && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink">{hwNote.trim()}</p>}
                  </section>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

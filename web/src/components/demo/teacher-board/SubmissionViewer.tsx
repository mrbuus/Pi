"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, ChevronLeft, ChevronRight, Clock, Eye, Lock, NotebookPen, RefreshCw, Send, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Dot, Meta } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";
import { hashStr, type DayRecord, type DemoClass, type DemoLesson, type DemoStudent, type HwStatus } from "../world";
import DocViewer from "./DocViewer";
import type { Comment } from "./mock";
import { Avatar, IconBtn } from "./parts";
import ProblemGrid, { resultSentence } from "./ProblemGrid";
import { HW_META, HW_ORDER, StatusGroup } from "./StatusBoxes";
import { resultOf, sentLabel } from "./store";

interface Props {
  cls: DemoClass;
  lesson: DemoLesson;
  student: DemoStudent;
  rec: DayRecord | null;
  /** Илгээлттэй сурагчдын дунд хэддэх нь (0-ээс) */
  position: number;
  total: number;
  late: boolean;
  /** Тухайн өдрийн хүчинтэй хугацаа «YYYY-MM-DDTHH:mm» */
  deadline: string | null;
  onHw: (v: HwStatus | null) => void;
  comments: Comment[];
  onComment: (text: string) => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onClose: () => void;
}

/**
 * Илгээлтийн цонх: зүүн талд хуудас үзэгч, баруун талд даалгаврын төлөв →
 * гэрийн даалгаврын онлайн дүн (бодлого бүрээр) → хувийн сэтгэгдэл. Утсан дээр
 * бүтэн дэлгэц: дээр хуудас, доор самбар. ← → товчоор дараагийн илгээлт.
 */
export default function SubmissionViewer({
  cls,
  lesson,
  student,
  rec,
  position,
  total,
  late,
  deadline,
  onHw,
  comments,
  onComment,
  onPrev,
  onNext,
  onClose,
}: Props) {
  const [draft, setDraft] = useState("");
  const thread = useRef<HTMLDivElement>(null);
  const sub = rec?.submission ?? null;
  const hw = lesson.homework;
  const result = hw ? resultOf(student, hw) : null;

  // Сурагч солигдоход самбарын эхэнд (төлөв); шинэ сэтгэгдэл нэмэхэд доош нь гүйлгэнэ
  const seen = useRef({ id: student.id, n: comments.length });
  useEffect(() => {
    const el = thread.current;
    if (!el) return;
    if (seen.current.id !== student.id) el.scrollTop = 0;
    else if (comments.length > seen.current.n) el.scrollTop = el.scrollHeight;
    seen.current = { id: student.id, n: comments.length };
  }, [comments.length, student.id]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
    const go = e.key === "ArrowLeft" ? onPrev : onNext;
    if (go) {
      e.preventDefault();
      go();
    }
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onComment(text);
    setDraft("");
  };

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/50 backdrop-blur-[2px]" />
        <Dialog.Content
          onKeyDown={onKeyDown}
          onCloseAutoFocus={(e) => {
            // Одоо үзэж байсан сурагчийн илгээлтийн товч руу фокусыг буцаана
            e.preventDefault();
            document.querySelector<HTMLElement>(`[data-open-id="${student.id}"]`)?.focus();
          }}
          className="elev-3 fixed inset-0 z-[71] flex flex-col overflow-hidden bg-surface lg:inset-y-5 lg:left-1/2 lg:w-[min(88rem,calc(100vw-2.5rem))] lg:-translate-x-1/2 lg:rounded-2xl lg:border lg:border-line"
        >
          <header className="flex shrink-0 items-center gap-1 border-b border-line py-1.5 pl-3 pr-1.5 sm:gap-2 sm:px-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="cyrillic-heading truncate text-base font-bold text-ink">{student.name}</Dialog.Title>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-dim">
                <Dialog.Description asChild>
                  <p>
                    {sub ? `${sub.pages} хуудас, ${sentLabel(sub.submittedAt, lesson.dateKey)} илгээсэн` : "Илгээгээгүй"}
                  </p>
                </Dialog.Description>
                {late && (
                  <span
                    title={deadline ? `Хугацаа: ${sentLabel(deadline, lesson.dateKey)}` : undefined}
                    className="inline-flex items-center gap-1 rounded-full border border-warning/60 bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-ink"
                  >
                    <Clock className="size-3 text-warning" aria-hidden />
                    Хоцорч илгээсэн
                  </span>
                )}
                {sub?.resubmitted && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-info/60 bg-info/15 px-2 py-0.5 text-[11px] font-semibold text-ink">
                    <RefreshCw className="size-3 text-info" aria-hidden />
                    Дахин илгээсэн
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <IconBtn label="Өмнөх илгээлт" onClick={() => onPrev?.()} disabled={!onPrev}>
                <ChevronLeft className="size-5" aria-hidden />
              </IconBtn>
              <span aria-live="polite" className="min-w-12 text-center text-sm font-semibold tabular-nums text-ink">
                {position + 1}/{total}
              </span>
              <IconBtn label="Дараах илгээлт" onClick={() => onNext?.()} disabled={!onNext}>
                <ChevronRight className="size-5" aria-hidden />
              </IconBtn>
            </div>
            <Dialog.Close
              aria-label="Хаах"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </header>

          <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)]">
            <div className="h-[46%] min-h-0 shrink-0 lg:h-auto">
              {sub && <DocViewer key={`${lesson.dateKey}-${student.id}`} seed={hashStr(`${lesson.dateKey}|${student.id}`)} pages={sub.pages} />}
            </div>

            <aside aria-label="Төлөв, дүн, сэтгэгдэл" className="flex min-h-0 flex-1 flex-col border-t border-line lg:border-l lg:border-t-0">
              <div ref={thread} className="min-h-0 flex-1 overflow-y-auto">
                {/* 1. Даалгаврын төлөв — самбартай нэг өгөгдөл */}
                <section className="border-b border-line p-3">
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-dim">
                    <NotebookPen className="size-3.5" aria-hidden />
                    Даалгаврын төлөв
                  </h3>
                  <StatusGroup
                    label={`Даалгаврын төлөв, ${student.name}`}
                    values={HW_ORDER}
                    metaOf={HW_META}
                    value={rec?.hw ?? null}
                    onChange={onHw}
                    className="grid-cols-3"
                  />
                </section>

                {/* 2. Гэрийн даалгавар: онлайн тестийн дүн бодлого бүрээр */}
                {hw && (
                  <section className="border-b border-line p-3">
                    <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-dim">
                      <BookOpen className="size-3.5" aria-hidden />
                      Гэрийн даалгавар
                    </h3>
                    <div className="rounded-lg border border-line bg-bg p-2.5">
                      <p className="text-sm font-bold text-ink">{hw.title}</p>
                      <p className="text-xs text-ink-dim">
                        <Meta items={[hw.book, `${hw.problems} бодлого`]} />
                      </p>
                      {result ? (
                        <>
                          <p className="mt-2 text-sm text-ink">{resultSentence(result)}</p>
                          <div className="mt-2.5">
                            <ProblemGrid result={result} />
                          </div>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-ink-dim">Онлайнаар бодоогүй</p>
                      )}
                      <Link
                        href={`/demo/classes/${cls.id}`}
                        className="mt-2.5 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand hover:underline sm:min-h-8"
                      >
                        Ангийн дүн
                        <ChevronRight className="size-4" aria-hidden />
                      </Link>
                    </div>
                  </section>
                )}

                {/* 3. Хувийн сэтгэгдэл */}
                <section className="p-3">
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-dim">
                    <Lock className="size-3.5" aria-hidden />
                    Хувийн сэтгэгдэл
                  </h3>
                  <ul className="space-y-2.5">
                    {comments.length === 0 && <li className="text-sm text-ink-dim">Одоогоор сэтгэгдэл алга</li>}
                    {comments.map((c) => {
                      const mine = c.from === "teacher";
                      return (
                        <li key={c.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                          <Avatar name={c.author} className="mt-0.5 size-6 text-[10px]" />
                          <div className={cn("min-w-0 max-w-[85%]", mine && "text-right")}>
                            <p className={cn("flex items-center gap-1.5 text-xs text-ink-dim", mine && "justify-end")}>
                              <span className="font-semibold text-ink">{c.author}</span>
                              <Dot />
                              <time>{c.time}</time>
                            </p>
                            <p className={cn("mt-0.5 rounded-xl px-3 py-2 text-left text-sm text-ink", mine ? "bg-brand-bright/15" : "bg-ink/[0.06]")}>
                              {c.text}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>

              <form onSubmit={send} className="flex shrink-0 items-center gap-1 border-t border-line px-2 pt-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-label="Хувийн сэтгэгдэл бичих"
                  placeholder="Хувийн сэтгэгдэл бичих"
                  maxLength={300}
                  enterKeyHint="send"
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm text-ink placeholder:text-ink-dim/70"
                />
                <IconBtn
                  label="Сэтгэгдэл илгээх"
                  type="submit"
                  disabled={!draft.trim()}
                  className="text-brand hover:bg-brand-bright/10 hover:text-brand sm:size-11"
                >
                  <Send className="size-4" aria-hidden />
                </IconBtn>
              </form>
              <p className="flex shrink-0 items-center gap-1.5 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 text-[11px] text-ink-dim">
                <Eye className="size-3.5 shrink-0" aria-hidden />
                Төлөв, сэтгэгдлийг сурагч шууд харна
              </p>
            </aside>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

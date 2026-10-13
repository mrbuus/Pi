"use client";

import { CircleAlert, CircleCheck, LoaderCircle, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/kit/button";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import ChapterPicker from "./ChapterPicker";
import Dialog from "./Dialog";
import { draftApi, type PublishResult } from "./draftApi";
import { liveIssues, type DraftSetSummary } from "./model";
import type { Row } from "./useDraftEditor";

type TestType = "CUSTOM" | "DAILY" | "EESH_MOCK";
const TEST_TYPES: { value: TestType; label: string }[] = [
  { value: "CUSTOM", label: "Энгийн" },
  { value: "DAILY", label: "Өдөр тутмын" },
  { value: "EESH_MOCK", label: "ЭЕШ сорил" },
];

const input =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink focus:border-brand-bright focus:outline-none focus:ring-2 focus:ring-brand-bright/25";

function Choice({
  selected,
  onSelect,
  title,
  hint,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 flex-1 flex-col items-start rounded-2xl border-2 px-3.5 py-2.5 text-left transition",
        selected ? "border-brand-bright bg-brand-tint/70" : "border-line hover:border-brand-bright/40",
      )}
    >
      <span className="text-sm font-bold text-ink">{title}</span>
      <span className="text-xs text-ink-dim">{hint}</span>
    </button>
  );
}

/**
 * Нийтлэх: бодлогууд сонгосон бүлэгт Problem болно, хүсвэл Test (ноорог эсвэл
 * нийтэлсэн). Дутуу блоктой бол нийтлэхгүй — дугаараар нь жагсаана.
 */
export default function PublishDialog({
  open,
  onOpenChange,
  set,
  rows,
  beforePublish,
  onPublished,
  onJump,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  set: DraftSetSummary;
  rows: Row[];
  beforePublish: () => Promise<void>;
  onPublished: (result: PublishResult) => void;
  onJump: (blockId: string) => void;
}) {
  const [chapter, setChapter] = useState<{ id: string; title: string } | null>(
    set.chapter ? { id: set.chapter.id, title: set.chapter.title } : null,
  );
  const [makeTest, setMakeTest] = useState(true);
  const [title, setTitle] = useState(set.title);
  const [type, setType] = useState<TestType>("CUSTOM");
  const [isDraft, setIsDraft] = useState(true);
  const [minutes, setMinutes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [serverIssues, setServerIssues] = useState<{ n: number; blockId: string; messages: string[] }[]>([]);
  const [done, setDone] = useState<PublishResult | null>(null);

  const incomplete = rows
    .map((r, i) => ({ n: i + 1, blockId: r.id, messages: liveIssues(r.local) }))
    .filter((r) => r.messages.length);
  const issues = incomplete.length ? incomplete : serverIssues;
  const unsaved = rows.some((r) => r.state === "conflict");
  const canPublish = rows.length > 0 && !issues.length && !!chapter && !unsaved && (!makeTest || !!title.trim());

  async function publish() {
    setBusy(true);
    setError("");
    try {
      await beforePublish();
      const result = await draftApi.publish(set.id, {
        chapterId: chapter!.id,
        ...(makeTest
          ? {
              test: {
                title: title.trim(),
                type,
                isDraft,
                ...(Number(minutes) > 0 ? { timeLimitMin: Math.min(600, Math.round(Number(minutes))) } : {}),
              },
            }
          : {}),
      });
      setDone(result);
      onPublished(result);
    } catch (e) {
      const body = e instanceof ApiError ? (e.body as { code?: string; blocks?: typeof serverIssues }) : undefined;
      if (body?.code === "DRAFT_INCOMPLETE" && body.blocks) setServerIssues(body.blocks);
      setError(e instanceof Error ? e.message : "Нийтэлж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title="Нийтэллээ">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
            <CircleCheck className="size-7" aria-hidden />
          </span>
          <p className="text-base font-bold text-ink">
            {done.count} бодлого «{done.chapterTitle}» бүлэгт нэмэгдлээ
          </p>
          {done.testId && (
            <p className="text-sm text-ink-dim">{isDraft ? "Ноорог тест үүслээ — ангид оноохоос өмнө сурагчид харагдахгүй" : "Тест нийтлэгдлээ"}</p>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {done.testId && (
              <Button asChild>
                <Link href={`/app/tests/${done.testId}/edit`}>Тестийг нээх</Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Хаах
            </Button>
          </div>
        </div>
      </Dialog>
    );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Нийтлэх"
      description={set.publishCount > 0 ? "Өмнө нийтэлсэн — дахин нийтэлбэл шинэ хуулбар үүснэ" : `${rows.length} бодлого сурагчдад нээгдэх санд орно`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Болих
          </Button>
          <Button disabled={!canPublish || busy} onClick={() => void publish()}>
            {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            Нийтлэх
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {issues.length > 0 && (
          <div role="alert" className="rounded-2xl border border-error/30 bg-error/5 p-3.5">
            <p className="flex items-center gap-2 text-sm font-bold text-error">
              <CircleAlert className="size-4" aria-hidden /> {issues.length} бодлого дутуу
            </p>
            <ul className="mt-2 space-y-1">
              {issues.slice(0, 8).map((issue) => (
                <li key={issue.blockId}>
                  <button
                    type="button"
                    onClick={() => onJump(issue.blockId)}
                    className="min-h-9 text-left text-sm text-ink underline-offset-2 hover:underline"
                  >
                    <span className="font-bold">{issue.n}-р</span> — {issue.messages[0]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <section>
          <h3 className="mb-2 text-sm font-bold text-ink">Бүлэг</h3>
          <ChapterPicker
            idPrefix="publish"
            subject={set.subject}
            value={chapter?.id ?? null}
            onChange={(_, c) => setChapter(c)}
          />
        </section>

        <section className="space-y-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={makeTest}
              onChange={(e) => setMakeTest(e.target.checked)}
              className="size-5 accent-brand-bright"
            />
            <span className="text-sm font-bold text-ink">Тест болгох</span>
          </label>
          {makeTest && (
            <div className="space-y-3 rounded-2xl border border-line p-3.5">
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink-dim">
                Тестийн нэр
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} maxLength={200} />
              </label>
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <label className="flex flex-col gap-1 text-xs font-semibold text-ink-dim">
                  Төрөл
                  <select value={type} onChange={(e) => setType(e.target.value as TestType)} className={input}>
                    {TEST_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-ink-dim">
                  Хугацаа, мин
                  <input
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    placeholder="Хязгааргүй"
                    className={input}
                  />
                </label>
              </div>
              <div role="radiogroup" aria-label="Тестийн төлөв" className="flex flex-col gap-2 sm:flex-row">
                <Choice selected={isDraft} onSelect={() => setIsDraft(true)} title="Ноорог тест" hint="Ангид оноох хүртэл нуугдмал" />
                <Choice selected={!isDraft} onSelect={() => setIsDraft(false)} title="Нийтлэх" hint="Шалгалтын жагсаалтад шууд" />
              </div>
            </div>
          )}
        </section>

        {unsaved && <p className="text-sm text-error">Зөрчилтэй бодлогыг эхлээд шийднэ үү</p>}
        {error && !issues.length && (
          <p role="alert" className="text-sm font-semibold text-error">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

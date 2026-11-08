"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ClipboardCheck, CloudCheck, Eye, EyeOff, LoaderCircle, Pencil, RotateCw, Trash2, TriangleAlert, X } from "lucide-react";
import { useRef, useState } from "react";
import { TONE_SELECTED, type Tone } from "@/components/attendance/marks";
import MathText from "@/components/MathText";
import InfoHint from "@/components/ui/InfoHint";
import { cn } from "@/lib/cn";
import { formatPercent, parseProblemCount, quizAverage, QUIZ_MAX_PROBLEMS } from "@/lib/quizScore";
import type { HomeworkQuizState } from "./useHomeworkQuiz";

/** Өнгөний мужийн тайлбар («i»): 0 <= улаан < 50 <= улбар шар < 80 <= ногоон <= 100 (эзэн 2026-11-08) */
function Legend() {
  const chip = (tone: Tone, text: string) => (
    <span className={cn("rounded border px-1.5 py-px text-xs font-semibold", TONE_SELECTED[tone])}>{text}</span>
  );
  return (
    <span className="block space-y-1.5 text-left">
      <span className="block font-semibold text-ink">Онооны өнгө, хувиар</span>
      <span className="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-ink">
        <MathText>{"$0 \\le$"}</MathText>
        {chip("error", "улаан")}
        <MathText>{"$< 50 \\le$"}</MathText>
        {chip("warning", "улбар шар")}
        <MathText>{"$< 80 \\le$"}</MathText>
        {chip("success", "ногоон")}
        <MathText>{"$\\le 100$"}</MathText>
      </span>
      <span className="block text-ink-dim">Дунджийг зөвхөн оноо оруулсан сурагчаар бодно</span>
    </span>
  );
}

/** Бодлогын тоо асуух цонх: эхлүүлэх ба засах (засахад «Шалгалтыг устгах») */
function CountDialog({
  open,
  onOpenChange,
  initial,
  editing,
  scored,
  onSave,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: number | null;
  editing: boolean;
  /** Оноо оруулсан сурагчийн тоо (устгахын өмнө хэлнэ) */
  scored: number;
  onSave: (n: number) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [text, setText] = useState(initial === null ? "" : String(initial));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const r = parseProblemCount(text);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(r.value!);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await onRemove();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Устгаж чадсангүй");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/40" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            input.current?.focus();
            input.current?.select();
          }}
          className="fixed inset-x-0 bottom-0 z-[71] max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[24rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        >
          <div className="mb-3 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-bold text-ink">{editing ? "Шалгалтын бодлогын тоо" : "Шалгалтаар даалгавар шалгах"}</Dialog.Title>
              <Dialog.Description className="text-xs text-ink-dim">
                {editing ? "Тоог өөрчлөхөд өнгө дахин бодогдоно" : "Ангид хэдэн бодлого өгснөө бичнэ үү"}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Хаах" className="-mr-2 -mt-1 inline-flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-dim">Бодлогын тоо</span>
              <input
                ref={input}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="done"
                autoComplete="off"
                maxLength={3}
                value={text}
                placeholder="ж: 10"
                aria-invalid={!!error || undefined}
                onChange={(e) => {
                  setText(e.target.value.replace(/\D/g, "").slice(0, 3));
                  setError("");
                }}
                className="block min-h-12 w-full rounded-xl border border-line bg-bg px-3 text-base font-bold tabular-nums text-ink placeholder:font-normal placeholder:text-ink-dim/70"
              />
            </label>
            <p className="mt-1 text-xs text-ink-dim">1-ээс {QUIZ_MAX_PROBLEMS} хүртэл</p>
            {error && (
              <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-error">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || text === ""}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-on-brand disabled:opacity-60"
            >
              {busy && !confirm && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
              {editing ? "Хадгалах" : "Эхлүүлэх"}
            </button>
          </form>

          {editing && (
            <div className="mt-4 border-t border-line pt-3">
              {confirm ? (
                <div role="alertdialog" aria-label="Шалгалтыг устгах уу" className="space-y-2">
                  <p className="text-sm text-ink">
                    {scored > 0 ? `${scored} сурагчийн оруулсан оноо хамт устна. Устгах уу?` : "Шалгалтыг устгах уу?"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirm(false)}
                      disabled={busy}
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line text-sm font-semibold text-ink hover:bg-ink/5"
                    >
                      Болих
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove()}
                      disabled={busy}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-error bg-error/10 text-sm font-bold text-error hover:bg-error/15 disabled:opacity-60"
                    >
                      {busy && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                      Устгах
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirm(true)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-error hover:bg-error/10"
                >
                  <Trash2 className="size-4" aria-hidden />
                  Шалгалтыг устгах
                </button>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * «Шалгалтаар даалгавар шалгах» (эзэн 2026-11-08) — шүүлтүүрийн мөрийн доор. Шалгалтгүй үед
 * ганц товч; эхлүүлсний дараа бодлогын тоо, ангийн дундаж (зөвхөн оноотой сурагчаар), «i»
 * тайлбар, хадгалалтын төлөв, «Нуух». Нуухад оноо устахгүй — «Онлайн» нүд буцаж гарна.
 */
export default function QuizBar({ q, studentIds }: { q: HomeworkQuizState; studentIds: string[] }) {
  const [dialog, setDialog] = useState<null | "start" | "edit">(null);
  const quiz = q.quiz;

  if (q.status === "loading") return <div aria-hidden className="skeleton h-11 w-64 rounded-lg" />;
  if (q.status === "error") {
    return (
      <button
        type="button"
        onClick={q.reload}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink-dim hover:text-ink sm:min-h-9"
      >
        <RotateCw className="size-4" aria-hidden />
        Шалгалтын мэдээлэл ачаалагдсангүй, дахин оролдох
      </button>
    );
  }

  const roster = studentIds.map((id) => q.scores.get(id) ?? null);
  const avg = quiz ? quizAverage(roster, quiz.problemCount) : null;
  const scored = roster.filter((s) => s !== null).length;

  const dialogEl = dialog && (
    <CountDialog
      key={dialog}
      open
      onOpenChange={(o) => !o && setDialog(null)}
      initial={dialog === "edit" && quiz ? quiz.problemCount : null}
      editing={dialog === "edit"}
      scored={scored}
      onSave={q.setProblemCount}
      onRemove={q.remove}
    />
  );

  if (!quiz) {
    return (
      <>
        <button
          type="button"
          onClick={() => setDialog("start")}
          aria-haspopup="dialog"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-ink/30 sm:min-h-9"
        >
          <ClipboardCheck className="size-4 text-brand" aria-hidden />
          Шалгалтаар даалгавар шалгах
        </button>
        {dialogEl}
      </>
    );
  }

  if (q.hidden) {
    return (
      <>
        <button
          type="button"
          onClick={() => q.setHidden(false)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-ink/30 sm:min-h-9"
        >
          <Eye className="size-4 text-brand" aria-hidden />
          Шалгалтын оноо харах
          <span className="font-medium tabular-nums text-ink-dim">
            ({scored}/{studentIds.length})
          </span>
        </button>
        {dialogEl}
      </>
    );
  }

  const { saving, failed, invalid } = q.save;
  return (
    <section aria-label="Шалгалтаар даалгавар шалгах" className="rounded-xl border border-brand-bright/40 bg-brand-bright/[0.06] px-2 py-1.5 sm:px-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
          <ClipboardCheck className="size-4 text-brand" aria-hidden />
          Шалгалт
        </span>
        <button
          type="button"
          onClick={() => setDialog("edit")}
          aria-haspopup="dialog"
          aria-label={`${quiz.problemCount} бодлого, бодлогын тоог өөрчлөх`}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line bg-surface px-2 text-sm font-semibold tabular-nums text-ink hover:border-ink/30 sm:min-h-8"
        >
          {quiz.problemCount} бодлого
          <Pencil className="size-3.5 text-ink-dim" aria-hidden />
        </button>
        <span className="inline-flex items-center gap-1 text-sm">
          <span className="text-ink-dim">Дундаж</span>
          {avg ? (
            <span className={cn("rounded-md border px-1.5 font-bold tabular-nums", TONE_SELECTED[avg.tone])}>{formatPercent(avg.pct)}</span>
          ) : (
            <span className="font-bold text-ink-dim">–</span>
          )}
          <span className="tabular-nums text-xs text-ink-dim">
            ({scored}/{studentIds.length})
          </span>
          <InfoHint label="Өнгөний тайлбар">
            <Legend />
          </InfoHint>
        </span>
        <span className="ml-auto inline-flex items-center gap-1">
          <span role="status" className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-ink-dim sm:text-xs">
            {saving > 0 ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
                Хадгалж байна
              </>
            ) : failed > 0 ? (
              <span className="inline-flex items-center gap-1 text-error" title={q.save.lastError}>
                <TriangleAlert className="size-3.5" aria-hidden />
                {failed} оноо хадгалагдсангүй
              </span>
            ) : invalid > 0 ? (
              <span className="inline-flex items-center gap-1 text-error">
                <TriangleAlert className="size-3.5" aria-hidden />
                {invalid} оноо буруу
              </span>
            ) : q.save.savedAt ? (
              <>
                <CloudCheck className="size-3.5 text-success" aria-hidden />
                {/* Утсан дээр зөвхөн дүрс — мөр нэмэгдэхгүй */}
                <span className="sr-only sm:not-sr-only">Хадгалагдсан</span>
              </>
            ) : (
              <>
                <CloudCheck className="size-3.5" aria-hidden />
                <span className="sr-only sm:not-sr-only">Автоматаар хадгалагдана</span>
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => q.setHidden(true)}
            aria-label="Шалгалтын оноог нуух, оноо устахгүй"
            title="Нуух (оноо устахгүй)"
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-ink-dim hover:bg-ink/5 hover:text-ink sm:min-h-8"
          >
            <EyeOff className="size-4" aria-hidden />
            <span className="hidden sm:inline">Нуух</span>
          </button>
        </span>
      </div>
      {dialogEl}
    </section>
  );
}

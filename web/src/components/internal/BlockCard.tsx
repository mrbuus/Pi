"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleAlert,
  CircleDashed,
  Copy,
  ImagePlus,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { memo, useLayoutEffect, useRef, useState, type ClipboardEvent } from "react";
import { toast } from "sonner";
import MathText from "@/components/MathText";
import InfoHint from "@/components/ui/InfoHint";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { uploadFile } from "@/lib/api";
import { cn } from "@/lib/cn";
import { KIND_LABEL, LETTERS, liveIssues, stripImageMark, type BlockContent, type DraftKind } from "./model";
import ProblemView, { DraftImage, SolutionView } from "./ProblemView";
import type { Row } from "./useDraftEditor";

export type BlockAction = "duplicate" | "up" | "down" | "delete" | "retry" | "theirs" | "mine";

const field =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-dim/70 transition focus:border-brand-bright focus:outline-none focus:ring-2 focus:ring-brand-bright/25";
const menuItem =
  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-ink outline-none data-[highlighted]:bg-ink/5 data-[disabled]:pointer-events-none data-[disabled]:opacity-40";

/** Текстийн талбар агуулгаараа өндөрсөнө (Safari-д field-sizing байхгүй) */
function useAutosize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return ref;
}

function Paper({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="selectable mt-2 rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[15px] leading-relaxed text-ink">
      <MathText showErrorInTeacherView>{text}</MathText>
    </div>
  );
}

function SaveMark({ row }: { row: Row }) {
  if (row.state === "saving" || row.state === "dirty")
    return <LoaderCircle className="size-4 animate-spin text-ink-dim motion-reduce:animate-none" aria-label="Хадгалж байна" />;
  if (row.state === "error" || row.state === "conflict")
    return <CircleAlert className="size-4 text-error" aria-label="Хадгалагдаагүй" />;
  return null;
}

function BlockCardImpl({
  row,
  n,
  total,
  open,
  autoFocus,
  onToggle,
  onEdit,
  onAction,
}: {
  row: Row;
  n: number;
  total: number;
  open: boolean;
  autoFocus: boolean;
  onToggle: (id: string) => void;
  onEdit: (id: string, patch: Partial<BlockContent>) => void;
  onAction: (id: string, action: BlockAction) => void;
}) {
  const c = row.local;
  const issues = liveIssues(c);
  const set = (patch: Partial<BlockContent>) => onEdit(row.id, patch);

  return (
    <article
      id={`block-${row.id}`}
      aria-label={`${n}-р бодлого`}
      className={cn(
        "chunky min-w-0 scroll-mt-28 px-4 py-4 transition-[border-color] sm:px-5",
        open && "border-brand-bright/60",
        row.state === "conflict" && "border-error/50",
      )}
    >
      <header className="flex min-h-11 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onToggle(row.id)}
          aria-expanded={open}
          aria-label={open ? `${n}-р бодлогын засварыг хаах` : `${n}-р бодлогыг засах`}
          className={cn(
            "flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-base font-extrabold transition",
            open ? "bg-brand-bright text-on-brand" : "bg-brand-tint text-brand-soft hover:bg-brand-bright/20",
          )}
        >
          {n}
        </button>
        {open ? (
          <KindSwitch kind={c.kind} onChange={(kind) => set(kindPatch(c, kind))} />
        ) : (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-dim">{KIND_LABEL[c.kind]}</span>
        )}
        {!open && c.tag && <Badge className="max-w-[12rem] truncate">{c.tag}</Badge>}
        {!open && c.points > 1 && <Badge>{c.points} оноо</Badge>}
        {row.server.publishedProblemId && <Badge tone="success">Нийтэлсэн</Badge>}
        {!open && issues.length > 0 && (
          <Badge tone="danger" title={issues.join("\n")}>
            <CircleAlert aria-hidden /> Дутуу
          </Badge>
        )}
        <span className="ml-auto flex items-center gap-1">
          <SaveMark row={row} />
          {open && (
            <Button variant="secondary" size="sm" aria-label="Болсон" className="max-sm:size-11 max-sm:px-0" onClick={() => onToggle(row.id)}>
              <Check aria-hidden className="sm:hidden" />
              <span className="max-sm:hidden">Болсон</span>
            </Button>
          )}
          <BlockMenu n={n} total={total} open={open} onToggle={() => onToggle(row.id)} onAction={(a) => onAction(row.id, a)} />
        </span>
      </header>

      {row.state === "conflict" && row.conflict && (
        <div role="alert" className="mt-3 rounded-2xl border border-error/30 bg-error/5 p-3 text-sm">
          <p className="font-semibold text-error">{row.conflict.updatedByName} энэ бодлогыг саяхан өөрчилсөн</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onAction(row.id, "theirs")}>
              Түүний хувилбар
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAction(row.id, "mine")}>
              Миний хувилбар
            </Button>
          </div>
        </div>
      )}
      {row.state === "error" && (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">Хадгалагдсангүй, дахин оролдож байна</span>
          <Button size="sm" variant="ghost" onClick={() => onAction(row.id, "retry")}>
            Одоо оролдох
          </Button>
        </div>
      )}

      {open ? (
        <BlockForm row={row} autoFocus={autoFocus} set={set} issues={issues} />
      ) : (
        <div className="mt-3 space-y-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onToggle(row.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle(row.id);
              }
            }}
            aria-label={`${n}-р бодлогыг засах`}
            className="-mx-2 cursor-text rounded-xl px-2 py-1 transition hover:bg-ink/[0.025]"
          >
            <ProblemView content={c} />
          </div>
          <SolutionView solution={c.solution} />
        </div>
      )}
    </article>
  );
}

function kindPatch(c: BlockContent, kind: DraftKind): Partial<BlockContent> {
  if (kind === c.kind) return {};
  if (kind === "CHOICE")
    return { kind, answer: null, choices: c.choices.length >= 2 ? c.choices : ["", "", "", "", ""] };
  return { kind, answer: null };
}

function KindSwitch({ kind, onChange }: { kind: DraftKind; onChange: (k: DraftKind) => void }) {
  return (
    <div role="group" aria-label="Бодлогын төрөл" className="inline-flex rounded-xl bg-ink/5 p-1">
      {(["CHOICE", "NUMERIC"] as const).map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={kind === k}
          onClick={() => onChange(k)}
          className={cn(
            "min-h-9 rounded-lg px-2.5 text-sm font-semibold transition sm:px-3",
            kind === k ? "bg-surface text-ink shadow-sm" : "text-ink-dim hover:text-ink",
          )}
        >
          <span className="max-sm:hidden">{KIND_LABEL[k]}</span>
          <span className="sm:hidden">{k === "CHOICE" ? "Сонгох" : "Тоон"}</span>
        </button>
      ))}
    </div>
  );
}

function BlockMenu({
  n,
  total,
  open,
  onToggle,
  onAction,
}: {
  n: number;
  total: number;
  open: boolean;
  onToggle: () => void;
  onAction: (a: BlockAction) => void;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={`${n}-р бодлогын үйлдэл`}
        className="inline-flex size-11 items-center justify-center rounded-2xl text-ink-dim transition hover:bg-ink/5 hover:text-ink data-[state=open]:bg-ink/5"
      >
        <MoreHorizontal className="size-5" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 rounded-2xl border border-line bg-surface p-1.5 shadow-lg enter-pop"
        >
          {!open && (
            <DropdownMenu.Item className={menuItem} onSelect={onToggle}>
              <Pencil className="size-4 text-ink-dim" aria-hidden /> Засах
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item className={menuItem} onSelect={() => onAction("duplicate")}>
            <Copy className="size-4 text-ink-dim" aria-hidden /> Хуулбарлах
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menuItem} disabled={n === 1} onSelect={() => onAction("up")}>
            <ArrowUp className="size-4 text-ink-dim" aria-hidden /> Дээш зөөх
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menuItem} disabled={n === total} onSelect={() => onAction("down")}>
            <ArrowDown className="size-4 text-ink-dim" aria-hidden /> Доош зөөх
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className={cn(menuItem, "text-error")} onSelect={() => onAction("delete")}>
            <Trash2 className="size-4" aria-hidden /> Устгах
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function BlockForm({
  row,
  autoFocus,
  set,
  issues,
}: {
  row: Row;
  autoFocus: boolean;
  set: (patch: Partial<BlockContent>) => void;
  issues: string[];
}) {
  const c = row.local;
  const statementRef = useAutosize(c.statement);
  const solutionRef = useAutosize(c.solution ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showSolution, setShowSolution] = useState(!!c.solution);
  const base = `blk-${row.id}`;

  useLayoutEffect(() => {
    if (autoFocus) statementRef.current?.focus();
  }, [autoFocus, statementRef]);

  async function attach(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Зөвхөн зураг (png, jpg, webp) хавсаргана");
      return;
    }
    setUploading(true);
    try {
      const { key } = await uploadFile(file);
      set({ imageKey: key, statement: stripImageMark(c.statement) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Зураг оруулж чадсангүй");
    } finally {
      setUploading(false);
    }
  }

  function onPasteImage(e: ClipboardEvent<HTMLTextAreaElement>) {
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      void attach(file);
    }
  }

  return (
    <div className="mt-4 space-y-5">
      <div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <label htmlFor={`${base}-st`} className="text-sm font-semibold text-ink">
            Бодлого
          </label>
          <InfoHint label="Томьёо бичих заавар">
            Томьёог $...$ дотор бичнэ: \frac{"{a}{b}"}, \sqrt{"{x}"}, x^{"{2}"}
            <br />
            Зургийг энд шууд буулгаж болно
          </InfoHint>
        </div>
        <textarea
          id={`${base}-st`}
          ref={statementRef}
          rows={2}
          value={c.statement}
          onChange={(e) => set({ statement: e.target.value })}
          onPaste={onPasteImage}
          placeholder="Бодлогын өгүүлбэр, томьёо $...$ дотор"
          className={cn(field, "min-h-20 resize-none font-mono text-[14px]")}
          spellCheck={false}
        />
        <Paper text={c.statement} />
      </div>

      {c.kind === "CHOICE" ? (
        <fieldset>
          <legend className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
            Сонголт
            <InfoHint label="Сонголтын заавар">
              Зөв хариуг үсгэн дээр нь дарж сонгоно
              <br />
              Сонголт зурагт байвал хоосон үлдээгээд зургаа хавсаргана
            </InfoHint>
          </legend>
          <div className="space-y-2">
            {c.choices.map((text, i) => {
              const letter = LETTERS[i];
              const correct = c.answer === letter;
              return (
                <div key={i} className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,38%)]">
                  <button
                    type="button"
                    aria-pressed={correct}
                    aria-label={`${letter} сонголтыг зөв хариу болгох`}
                    onClick={() => set({ answer: correct ? null : letter })}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-full border-2 text-sm font-extrabold transition",
                      correct
                        ? "border-success bg-success text-on-success"
                        : "border-line text-brand-soft hover:border-success/60",
                    )}
                  >
                    {letter}
                  </button>
                  <input
                    aria-label={`${letter} сонголт`}
                    value={text}
                    onChange={(e) => {
                      const choices = [...c.choices];
                      choices[i] = e.target.value;
                      set({ choices });
                    }}
                    placeholder={i === 0 ? "$5$" : ""}
                    className={cn(field, "min-h-11 font-mono text-[14px]")}
                    spellCheck={false}
                  />
                  <div
                    aria-hidden
                    className={cn(
                      "hidden min-h-11 items-center rounded-xl bg-bg px-3 py-2 text-[15px] text-ink sm:flex",
                      !text.includes("$") && "sm:invisible",
                    )}
                  >
                    {text.includes("$") && <MathText showErrorInTeacherView>{text}</MathText>}
                  </div>
                </div>
              );
            })}
          </div>
          {c.choices.some((t) => t.includes("$")) && (
            <ol aria-label="Сонголтын харагдац" className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-bg px-3 py-2 text-[15px] text-ink sm:hidden">
              {c.choices.map((text, i) => (
                <li key={i} className="flex min-w-0 items-baseline gap-1.5">
                  <span className="font-bold text-brand-soft">{LETTERS[i]}.</span>
                  <span className="min-w-0 break-words">{text.trim() && <MathText showErrorInTeacherView>{text}</MathText>}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-2 flex flex-wrap gap-1 pl-[3.25rem]">
            {c.choices.length < 5 && (
              <Button size="sm" variant="ghost" onClick={() => set({ choices: [...c.choices, ""] })}>
                <Plus aria-hidden /> Сонголт
              </Button>
            )}
            {c.choices.length > 2 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const choices = c.choices.slice(0, -1);
                  const removed = LETTERS[choices.length];
                  set({ choices, ...(c.answer === removed ? { answer: null } : {}) });
                }}
              >
                <X aria-hidden /> {LETTERS[c.choices.length - 1]} хасах
              </Button>
            )}
          </div>
        </fieldset>
      ) : (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor={`${base}-ans`} className="text-sm font-semibold text-ink">
              Хариу
            </label>
            <InfoHint label="Тоон хариуны заавар">
              Зөвхөн тоо: 12, -3, 4.5
              <br />
              Нүдтэй ([a], [bc]) бодлогод цифрүүдийг дарааллаар нь залгаж бичнэ
            </InfoHint>
          </div>
          <input
            id={`${base}-ans`}
            value={c.answer ?? ""}
            onChange={(e) => set({ answer: e.target.value })}
            inputMode="decimal"
            placeholder="12"
            className={cn(field, "min-h-11 max-w-56 font-mono")}
          />
        </div>
      )}

      {showSolution || c.solution ? (
        <div>
          <label htmlFor={`${base}-sol`} className="mb-1.5 block text-sm font-semibold text-ink">
            Бодолт
          </label>
          <textarea
            id={`${base}-sol`}
            ref={solutionRef}
            rows={2}
            value={c.solution ?? ""}
            onChange={(e) => set({ solution: e.target.value })}
            placeholder="Товч бодолт, томьёо $...$ дотор"
            className={cn(field, "min-h-16 resize-none font-mono text-[14px]")}
            spellCheck={false}
          />
          <Paper text={c.solution ?? ""} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!showSolution && !c.solution && (
          <Button size="sm" variant="outline" onClick={() => setShowSolution(true)}>
            <Plus aria-hidden /> Бодолт
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void attach(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {!c.imageKey && (
          <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <LoaderCircle className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
            Зураг
          </Button>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-ink-dim">
          Сэдэв
          <input
            value={c.tag ?? ""}
            onChange={(e) => set({ tag: e.target.value || null })}
            placeholder="Квадрат тэгшитгэл"
            className={cn(field, "min-h-11 py-2 text-sm")}
            maxLength={120}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-dim">
          Оноо
          <select
            value={c.points}
            onChange={(e) => set({ points: Number(e.target.value) })}
            className={cn(field, "min-h-11 py-2 text-sm")}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      {c.imageKey && (
        <div className="relative inline-block">
          <DraftImage imageKey={c.imageKey} />
          <button
            type="button"
            aria-label="Зургийг хасах"
            onClick={() => set({ imageKey: null })}
            className="absolute -right-2 -top-2 inline-flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-dim shadow-sm transition hover:text-error"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {issues.length > 0 && (
        <ul className="space-y-1 border-t border-line pt-3" aria-label="Нийтлэхийн өмнө засах">
          {issues.map((issue) => (
            <li key={issue} className="flex items-center gap-2 text-sm text-ink-dim">
              <CircleDashed className="size-4 shrink-0 text-ink-dim/70" aria-hidden />
              {issue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const BlockCard = memo(BlockCardImpl);
export default BlockCard;

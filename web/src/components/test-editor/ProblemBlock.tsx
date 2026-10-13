"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  ImagePlus,
  Library,
  ListPlus,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { memo, useRef, useState } from "react";
import ChoiceContent from "@/components/ChoiceContent";
import ChoiceImageField from "@/components/ChoiceImageField";
import MathText from "@/components/MathText";
import ProblemFigure from "@/components/ProblemFigure";
import CodeReveal from "@/components/ui/CodeReveal";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import {
  decodeSlotValue,
  encodeSlotDigits,
  parseFillSlots,
  slotsTotalLength,
} from "@/components/exam/fillSlots";
import { uploadFile } from "@/lib/api";
import { cn } from "@/lib/cn";
import { LETTERS, type BlockContent, type BlockItem, type ServerProblem } from "./model";

const FORMAT_LABEL: Record<string, string> = { CHOICE: "Сонгох", FILL_NUMBER: "Нөхөх", OPEN: "Задгай" };

export type InsertKind = "CHOICE" | "FILL_NUMBER" | "BANK";

/** Нүдний бүлэг бүрийн эхлэх байрлал (цифрийн стрингд) */
function withStarts(groups: { key: string; length: number }[]) {
  const out: { key: string; length: number; start: number }[] = [];
  let start = 0;
  for (const g of groups) {
    out.push({ ...g, start });
    start += g.length;
  }
  return out;
}

const menuItem =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink outline-none data-[highlighted]:bg-ink/5";

/**
 * Тестийн нэг бодлого — блок. Унших горимд бодлого бүтнээрээ (текст, зураг,
 * сонголт, зөв хариу) харагдана. ЗӨВХӨН дугаарын товч дээр дарахад засах горим
 * нээгдэнэ — бичвэр дээр дарах/сонгох/гүйлгэх нь юу ч өөрчлөхгүй.
 * Засах горимд: LaTeX + шууд харагдац, сонголт/зөв хариу, нөхөх нүд, зураг,
 * оноо, байрлал, дээр/доор нь нэмэх, тестээс хасах — бүгд нэг дор.
 */
function ProblemBlockImpl({
  index,
  total,
  item,
  problem,
  content,
  changed,
  active,
  canEditContent,
  structureLocked,
  answerLocked,
  error,
  onActivate,
  onContent,
  onCommit,
  onPoints,
  onMove,
  onInsert,
  onRemove,
  onPreview,
}: {
  index: number;
  total: number;
  item: BlockItem;
  problem: ServerProblem | null;
  content: BlockContent;
  changed: boolean;
  active: boolean;
  /** Байгаа бодлогын агуулгыг засах эрх (Багш+/Админ); шинэ бодлогод үргэлж */
  canEditContent: boolean;
  /** Сурагч өгсөн — дараалал/оноо/нэмэх/хасах түгжээтэй */
  structureLocked: boolean;
  /** Сурагч өгсөн тестийн хариу — өөрчилбөл анхааруулна */
  answerLocked: boolean;
  error?: string;
  /** Дуудагч тогтвортой (useCallback) байх ёстой — блок memo, зөвхөн өөрчлөгдсөн нь дахин зурагдана */
  onActivate: (key: string) => void;
  onContent: (key: string, patch: Partial<BlockContent>, coalesceKey?: string) => void;
  onCommit: () => void;
  onPoints: (key: string, points: number) => void;
  onMove: (key: string, toIndex: number) => void;
  onInsert: (index: number, kind: InsertKind) => void;
  onRemove: (key: string) => void;
  onPreview: (key: string) => void;
}) {
  const isNew = !problem;
  const key = item.key;
  const editable = isNew || canEditContent;
  const n = index + 1;
  const missingAnswer =
    (content.format === "CHOICE" && !content.choices.some((c) => c.isCorrect)) ||
    (content.format === "FILL_NUMBER" && !content.fill.replace(/_/g, "").trim());

  return (
    <article
      id={`block-${item.key}`}
      aria-label={`${n}-р бодлого`}
      className={cn(
        // overflow-x-auto: өргөн томьёо/хүснэгт блок дотроо гүйлгэнэ, хуудсыг тэлэхгүй
        "min-w-0 scroll-mt-44 overflow-x-auto rounded-2xl border bg-surface p-3 transition sm:p-4",
        active ? "border-brand-bright ring-2 ring-brand-bright/30" : "border-line",
        error && !active && "border-error/60",
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onActivate(key)}
          aria-pressed={active}
          aria-label={active ? `${n}-р бодлогын засварыг хаах` : `${n}-р бодлогыг засах`}
          title={active ? "Засварыг хаах" : "Засах"}
          className={cn(
            "flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-base font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright/60",
            active ? "bg-brand-bright text-on-brand" : "bg-brand-bright/15 text-brand-soft hover:bg-brand-bright/25",
          )}
        >
          {n}
        </button>
        <Badge tone="brand">{FORMAT_LABEL[content.format] ?? content.format}</Badge>
        <Badge>{item.points} оноо</Badge>
        {isNew && <Badge tone="info">Шинэ</Badge>}
        {changed && !isNew && <Badge tone="info">Засварласан</Badge>}
        {missingAnswer && (
          <Badge tone="danger">
            <TriangleAlert aria-hidden /> хариугүй
          </Badge>
        )}
        {problem && <CodeReveal code={problem.token} className="h-7 w-7" />}
        <button
          type="button"
          onClick={() => onPreview(key)}
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-ink-dim transition hover:bg-ink/5 hover:text-ink"
        >
          <Eye className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Сурагчид</span>
        </button>
      </header>

      {active ? (
        <BlockEditor
          key={index /* зөөхөд «Байрлал» талбар шинэ байрлалаас эхэлнэ */}
          item={item}
          index={index}
          total={total}
          content={content}
          editable={editable}
          structureLocked={structureLocked}
          answerLocked={answerLocked && !isNew}
          onContent={(patch, coalesceKey) => onContent(key, patch, coalesceKey)}
          onCommit={onCommit}
          onPoints={(points) => onPoints(key, points)}
          onMove={(toIndex) => onMove(key, toIndex)}
          onInsert={(where, kind) => onInsert(where === "above" ? index : index + 1, kind)}
          onRemove={() => onRemove(key)}
          onDone={() => onActivate(key)}
        />
      ) : (
        <ReadView content={content} />
      )}

      {error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-error">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
    </article>
  );
}

const ProblemBlock = memo(ProblemBlockImpl);
export default ProblemBlock;

/** Унших горим — сурагчид харагдахтай ойролцоо, зөв хариу тодорсон. */
function ReadView({ content }: { content: BlockContent }) {
  return (
    <div className="mt-2 space-y-3">
      <ProblemFigure imageKey={content.imageKey}>
        <div className="text-base leading-relaxed text-ink">
          {content.statement.trim() ? (
            <MathText showErrorInTeacherView>{content.statement}</MathText>
          ) : (
            <span className="text-sm italic text-ink-dim">Бодлогын текст хоосон</span>
          )}
        </div>
      </ProblemFigure>
      {content.format === "CHOICE" && <ChoiceList content={content} />}
      {content.format === "FILL_NUMBER" && <FillAnswer content={content} />}
    </div>
  );
}

function ChoiceList({ content }: { content: BlockContent }) {
  return (
    <ol className="grid gap-1.5 sm:grid-cols-2">
      {content.choices.map((c, i) => (
        <li
          key={i}
          className={cn(
            "flex min-w-0 items-start gap-2 rounded-xl border px-3 py-2 text-sm",
            c.isCorrect ? "border-success/50 bg-success/10 text-ink" : "border-line text-ink",
          )}
        >
          <span className={cn("font-bold", c.isCorrect ? "text-success" : "text-ink-dim")}>{LETTERS[i]}</span>
          <span className="min-w-0 flex-1">
            {c.text.trim() || c.imageKey ? (
              <ChoiceContent text={c.text} image={c.imageKey} imageClassName="max-h-32" />
            ) : (
              <span className="text-ink-dim">—</span>
            )}
          </span>
          {c.isCorrect && <Check className="h-4 w-4 shrink-0 text-success" aria-label="Зөв хариу" />}
        </li>
      ))}
    </ol>
  );
}

function FillAnswer({ content }: { content: BlockContent }) {
  const groups = parseFillSlots(content.statement);
  const total = slotsTotalLength(groups);
  if (total === 0)
    return (
      <p className="text-sm text-ink-dim">
        Хариу: <span className="font-bold text-ink">{content.fill || "—"}</span>
      </p>
    );
  const digits = decodeSlotValue(content.fill, total);
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-dim">
      Хариу:
      {withStarts(groups).map((g) => {
        const part = digits.slice(g.start, g.start + g.length);
        return (
          <span key={g.key} className="inline-flex items-center gap-1">
            <span className="font-mono text-xs">[{g.key}]</span>
            <span className="font-bold text-success">{part.map((d) => d || "_").join("")}</span>
          </span>
        );
      })}
    </p>
  );
}

// ======================= Засах горим =======================

function BlockEditor({
  item,
  index,
  total,
  content,
  editable,
  structureLocked,
  answerLocked,
  onContent,
  onCommit,
  onPoints,
  onMove,
  onInsert,
  onRemove,
  onDone,
}: {
  item: BlockItem;
  index: number;
  total: number;
  content: BlockContent;
  editable: boolean;
  structureLocked: boolean;
  answerLocked: boolean;
  onContent: (patch: Partial<BlockContent>, coalesceKey?: string) => void;
  onCommit: () => void;
  onPoints: (points: number) => void;
  onMove: (toIndex: number) => void;
  onInsert: (where: "above" | "below", kind: InsertKind) => void;
  onRemove: () => void;
  onDone: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [position, setPosition] = useState(String(index + 1));
  const fileRef = useRef<HTMLInputElement>(null);
  const k = item.key;

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const { key } = await uploadFile(file);
      onContent({ imageKey: key });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Зураг байршуулж чадсангүй");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function commitPosition() {
    const value = Number(position);
    if (Number.isInteger(value) && value >= 1 && value <= total && value !== index + 1) onMove(value - 1);
    else setPosition(String(index + 1));
  }

  const lines = content.statement.split("\n").length;

  return (
    <div className="mt-3 space-y-4">
      {editable ? (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <label htmlFor={`stmt-${k}`} className="mb-1 block text-sm font-semibold text-ink-dim">
                Бодлого (LaTeX)
              </label>
              <textarea
                id={`stmt-${k}`}
                value={content.statement}
                onChange={(e) => onContent({ statement: e.target.value }, `stmt-${k}`)}
                onBlur={onCommit}
                rows={Math.min(14, Math.max(4, lines + 1))}
                spellCheck={false}
                className="w-full rounded-xl border border-line bg-bg px-3 py-2 font-mono text-sm leading-relaxed text-ink focus:border-brand"
              />
            </div>
            <div className="min-w-0 rounded-xl border border-dashed border-line p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-dim">Харагдац</p>
              <ProblemFigure imageKey={content.imageKey}>
                <div className="text-base leading-relaxed text-ink">
                  {content.statement.trim() ? (
                    <MathText showErrorInTeacherView>{content.statement}</MathText>
                  ) : (
                    <span className="text-sm italic text-ink-dim">Бодлогын текст энд гарна</span>
                  )}
                </div>
              </ProblemFigure>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              id={`img-${k}`}
              onChange={(e) => void pickImage(e.target.files?.[0])}
            />
            <Button
              size="sm"
              variant="outline"
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus aria-hidden />
              {uploading ? "Байршуулж байна" : content.imageKey ? "Зураг солих" : "Зураг нэмэх"}
            </Button>
            {content.imageKey && (
              <Button size="sm" variant="ghost" type="button" onClick={() => onContent({ imageKey: null })}>
                <X aria-hidden /> Зураг хасах
              </Button>
            )}
            {uploadError && <span className="text-sm text-error">{uploadError}</span>}
          </div>

          {content.format === "CHOICE" && (
            <ChoiceEditor itemKey={k} content={content} onContent={onContent} onCommit={onCommit} />
          )}
          {content.format === "FILL_NUMBER" && (
            <FillEditor itemKey={k} content={content} onContent={onContent} onCommit={onCommit} />
          )}
          {answerLocked && (
            <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Сурагч өгсөн тест — хариуг өөрчилбөл өмнөх дүн дахин бодогдохгүй.
            </p>
          )}
        </>
      ) : (
        <>
          <ReadView content={content} />
          <p className="text-sm text-ink-dim">Бодлогын агуулгыг Багш+ эсвэл админ засна.</p>
        </>
      )}

      {!structureLocked && (
        <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
          <div className="inline-flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              type="button"
              aria-label="Дээш зөөх"
              disabled={index === 0}
              onClick={() => onMove(index - 1)}
            >
              <ArrowUp aria-hidden />
            </Button>
            <Button
              size="icon"
              variant="outline"
              type="button"
              aria-label="Доош зөөх"
              disabled={index === total - 1}
              onClick={() => onMove(index + 1)}
            >
              <ArrowDown aria-hidden />
            </Button>
          </div>
          <label className="text-sm text-ink-dim">
            <span className="mb-1 block">Байрлал</span>
            <input
              inputMode="numeric"
              value={position}
              onChange={(e) => setPosition(e.target.value.replace(/\D/g, ""))}
              onBlur={commitPosition}
              onKeyDown={(e) => e.key === "Enter" && commitPosition()}
              aria-label={`Байрлал (1–${total})`}
              className="min-h-11 w-20 rounded-xl border border-line bg-bg px-3 text-base text-ink focus:border-brand"
            />
          </label>
          <label className="text-sm text-ink-dim">
            <span className="mb-1 block">Оноо</span>
            <input
              inputMode="numeric"
              value={String(item.points)}
              onChange={(e) => {
                const v = Number(e.target.value.replace(/\D/g, ""));
                if (Number.isInteger(v) && v >= 1 && v <= 100) onPoints(v);
              }}
              onBlur={onCommit}
              className="min-h-11 w-20 rounded-xl border border-line bg-bg px-3 text-base text-ink focus:border-brand"
            />
          </label>
          <InsertMenu label="Дээр нь" onPick={(kind) => onInsert("above", kind)} />
          <InsertMenu label="Доор нь" onPick={(kind) => onInsert("below", kind)} />
          <Button size="sm" variant="danger" type="button" onClick={onRemove} className="min-h-11">
            <Trash2 aria-hidden /> Тестээс хасах
          </Button>
          <Button size="sm" type="button" onClick={onDone} className="ml-auto min-h-11">
            <Check aria-hidden /> Болсон
          </Button>
        </div>
      )}
      {structureLocked && (
        <div className="flex justify-end border-t border-line pt-3">
          <Button size="sm" type="button" onClick={onDone} className="min-h-11">
            <Check aria-hidden /> Болсон
          </Button>
        </div>
      )}
    </div>
  );
}

export function InsertMenu({ label, onPick }: { label: string; onPick: (kind: InsertKind) => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button size="sm" variant="outline" type="button" className="min-h-11">
          <Plus aria-hidden /> {label}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="elev-3 z-[60] min-w-56 rounded-2xl border border-line bg-surface p-1.5"
        >
          <DropdownMenu.Item className={menuItem} onSelect={() => onPick("CHOICE")}>
            <ListPlus className="h-4 w-4" aria-hidden /> Шинэ сонгох бодлого
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menuItem} onSelect={() => onPick("FILL_NUMBER")}>
            <ListPlus className="h-4 w-4" aria-hidden /> Шинэ нөхөх бодлого
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menuItem} onSelect={() => onPick("BANK")}>
            <Library className="h-4 w-4" aria-hidden /> Сангаас сонгох
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ChoiceEditor({
  itemKey,
  content,
  onContent,
  onCommit,
}: {
  itemKey: string;
  content: BlockContent;
  onContent: (patch: Partial<BlockContent>, coalesceKey?: string) => void;
  onCommit: () => void;
}) {
  const setChoice = (i: number, patch: Partial<{ text: string; isCorrect: boolean; imageKey: string | null }>, key?: string) =>
    onContent({ choices: content.choices.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }, key);
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold text-ink-dim">Сонголт ба зөв хариу</legend>
      {content.choices.map((c, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-xl border p-2",
            c.isCorrect ? "border-success/50 bg-success/5" : "border-line",
          )}
        >
          <button
            type="button"
            onClick={() => onContent({ choices: content.choices.map((x, idx) => ({ ...x, isCorrect: idx === i })) })}
            aria-pressed={c.isCorrect}
            aria-label={`${LETTERS[i]} сонголтыг зөв болгох`}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition",
              c.isCorrect ? "bg-success text-on-success" : "bg-line/30 text-ink-dim hover:bg-line/50",
            )}
          >
            {c.isCorrect ? <Check className="h-5 w-5" aria-hidden /> : LETTERS[i]}
          </button>
          <input
            value={c.text}
            onChange={(e) => setChoice(i, { text: e.target.value }, `ch-${itemKey}-${i}`)}
            onBlur={onCommit}
            spellCheck={false}
            aria-label={`${LETTERS[i]} сонголтын текст (LaTeX)`}
            placeholder={c.imageKey ? "Текст (заавал биш)" : undefined}
            className="min-h-10 min-w-40 flex-1 rounded-lg border border-line bg-bg px-3 font-mono text-sm text-ink focus:border-brand"
          />
          <span className="min-w-16 text-sm text-ink">
            {c.text.trim() && <MathText showErrorInTeacherView>{c.text}</MathText>}
          </span>
          <ChoiceImageField
            imageKey={c.imageKey}
            label={`${LETTERS[i]} сонголт`}
            onChange={(key) => {
              setChoice(i, { imageKey: key });
              onCommit();
            }}
          />
          {content.choices.length > 2 && (
            <button
              type="button"
              onClick={() => onContent({ choices: content.choices.filter((_, idx) => idx !== i) })}
              aria-label={`${LETTERS[i]} сонголтыг хасах`}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-dim transition hover:bg-error/10 hover:text-error"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      ))}
      {content.choices.length < LETTERS.length && (
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => onContent({ choices: [...content.choices, { text: "", isCorrect: false }] })}
        >
          <Plus aria-hidden /> Сонголт нэмэх
        </Button>
      )}
    </fieldset>
  );
}

function FillEditor({
  itemKey,
  content,
  onContent,
  onCommit,
}: {
  itemKey: string;
  content: BlockContent;
  onContent: (patch: Partial<BlockContent>, coalesceKey?: string) => void;
  onCommit: () => void;
}) {
  const groups = parseFillSlots(content.statement);
  const total = slotsTotalLength(groups);
  if (total === 0) {
    return (
      <label className="block text-sm text-ink-dim">
        <span className="mb-1 block font-semibold">Хариу (бодлогод [a] нүд алга)</span>
        <input
          value={content.fill}
          onChange={(e) => onContent({ fill: e.target.value }, `fill-${itemKey}`)}
          onBlur={onCommit}
          className="min-h-11 w-48 rounded-xl border border-line bg-bg px-3 text-base text-ink focus:border-brand"
        />
      </label>
    );
  }
  const digits = decodeSlotValue(content.fill, total);
  const setDigit = (i: number, raw: string) => {
    const ch = raw.slice(-1);
    if (ch && !/^[0-9-]$/.test(ch)) return;
    const next = [...digits];
    next[i] = ch;
    onContent({ fill: encodeSlotDigits(next) }, `fill-${itemKey}`);
  };
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold text-ink-dim">Хариу — нүд бүрт нэг цифр</legend>
      <div className="flex flex-wrap items-center gap-3">
        {withStarts(groups).map((g) => {
          const start = g.start;
          return (
            <span key={g.key} className="inline-flex items-center gap-1">
              <span className="font-mono text-xs text-ink-dim">[{g.key}]</span>
              {Array.from({ length: g.length }, (_, j) => (
                <input
                  key={j}
                  value={digits[start + j]}
                  onChange={(e) => setDigit(start + j, e.target.value)}
                  onBlur={onCommit}
                  inputMode="numeric"
                  maxLength={2}
                  aria-label={`${g.key[j] ?? g.key} нүд`}
                  className="h-11 w-10 rounded-lg border border-line bg-bg text-center text-lg font-bold text-ink focus:border-brand"
                />
              ))}
            </span>
          );
        })}
      </div>
    </fieldset>
  );
}

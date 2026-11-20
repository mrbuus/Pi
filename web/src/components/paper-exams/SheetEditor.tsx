"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import ExamDialog from "@/components/exams/ExamDialog";
import { errorText } from "@/components/exams/types";
import { cn } from "@/lib/cn";
import { itemName, scoreText, type BoardRow, type PaperItem, shortName, variantCells } from "./types";

type Mode = "answer" | "mark";
type Status = "CORRECT" | "WRONG" | "BLANK" | "MULTI" | "UNGRADED";
interface FoundStudent {
  id: string;
  name: string;
  code: string | null;
  classes: string[];
}

/** Монгол гар дээр латин руу сэлгэхгүйгээр шивэхэд: тоо 1–5 ба кирилл ижил үсэг → A–E */
const LETTER: Record<string, string> = {
  "1": "A",
  "2": "B",
  "3": "C",
  "4": "D",
  "5": "E",
  А: "A",
  В: "B",
  Б: "B",
  С: "C",
  Д: "D",
  Е: "E",
};
const toLetter = (raw: string): string => {
  const ch = raw.slice(-1).toUpperCase();
  return /^[A-E]$/.test(ch) ? ch : (LETTER[ch] ?? "");
};

/** Серверийн дүгнэлттэй ижил дүрэм (paper-exam-logic.ts statusOf) — хадгалахаас өмнө оноог урьдчилан харуулна */
function statusOf(a: string, item: PaperItem, variant: string | null): Status {
  if (item.voided) return "UNGRADED";
  if (a === "+") return "CORRECT";
  if (a === "-") return "WRONG";
  const key = (variant && item.answerKeys?.[variant]) || item.answerKey;
  if (!key) return "UNGRADED";
  if ((item.cells ?? 1) > 1) {
    if (a === "" || /^_+$/.test(a)) return "BLANK";
    return a === key ? "CORRECT" : "WRONG";
  }
  if (a === "") return "BLANK";
  if (a === "*") return "MULTI";
  return a === key ? "CORRECT" : "WRONG";
}
const TONE: Record<Status, string> = {
  CORRECT: "border-success bg-success/15",
  WRONG: "border-error bg-error/12",
  MULTI: "border-error bg-error/12",
  BLANK: "border-line bg-panel",
  UNGRADED: "border-line bg-panel opacity-60",
};

/**
 * Багшийн гараар засвар (эзэн 2026-11-15/16): машин уншиж чадаагүй сурагчийн дүнг нэмэх,
 * буруу уншсаныг засах, хувилбарыг солих. Хоёр горим: хариуг шивэх эсвэл зөв/алдсан тэмдэглэх.
 * Хуучин мөр устахгүй — сервер шинэ мөр үүсгэж хуучныг хүчингүй болгоно.
 *
 * Алдаа гаргуулахгүйн тулд: шивэх бүрд дараагийн нүд рүү өөрөө шилжинэ; нүд бүр зөв/бурууг
 * шууд өнгөөр харуулна; оноо хадгалахаас өмнө харагдана; өөрчлөлтгүй бол хадгалахгүй;
 * хагас бөглөсөн багц, сонгоогүй хувилбарыг хадгалуулахгүй; хаахад хадгалаагүйг сануулна.
 */
export default function SheetEditor({
  examId,
  items,
  variants,
  row,
  open,
  onOpenChange,
  onSaved,
}: {
  examId: string;
  items: PaperItem[];
  variants: string[];
  /** null = шинэ сурагч нэмэх */
  row: BoardRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const variantList = variants.length ? variants : ["A", "B"];
  const initial = useMemo(() => items.map((_, i) => row?.answers[i] ?? ""), [items, row]);
  const [mode, setMode] = useState<Mode>("answer");
  // Шинэ дүнд хувилбарыг заавал өөрөө сонгуулна (анхдагч «A»-аар буруу дүгнэхээс сэргийлнэ)
  const [variant, setVariant] = useState<string | null>(row ? (row.variant ?? null) : variantList.length === 1 ? variantList[0] : null);
  const [answers, setAnswers] = useState<string[]>(initial);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<FoundStudent[] | null>(null);
  const [student, setStudent] = useState<FoundStudent | null>(null);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const text = query.trim();
    if (row || text.length < 2) return;
    const t = window.setTimeout(() => {
      api<FoundStudent[]>(`/paper-exams/students/search?q=${encodeURIComponent(text)}`)
        .then(setFound)
        .catch(() => setFound([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [query, row]);

  const set = (i: number, v: string) => setAnswers((prev) => prev.map((a, j) => (j === i ? v : a)));
  const focus = (i: number) => {
    const el = inputs.current[i];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const statuses = answers.map((a, i) => statusOf(a, items[i], variant));
  const score = items.reduce((t, it, i) => t + (statuses[i] === "CORRECT" ? it.points : 0), 0);
  const max = items.reduce((t, it) => t + (it.voided ? 0 : it.points), 0);
  const changed = answers.filter((a, i) => a !== initial[i]).length;
  const variantChanged = !!row && variant !== (row.variant ?? null);
  const dirty = changed > 0 || variantChanged || (!row && student !== null);
  // Хагас бөглөсөн багц («21» 4 нүднээс) — аль орон хоосон нь тодорхойгүй тул хадгалуулахгүй
  const incomplete = answers.map((a, i) => {
    const cells = variantCells(items[i], variant);
    const digit = (items[i].cells ?? 1) > 1;
    return digit && a !== "" && a !== "+" && a !== "-" && a.length !== cells;
  });
  const firstIncomplete = incomplete.indexOf(true);
  const nothingToSave = !!row && changed === 0 && !variantChanged;

  const close = (next: boolean) => {
    if (!next && dirty && !busy && !window.confirm("Хадгалаагүй өөрчлөлт байна. Хаах уу?")) return;
    onOpenChange(next);
  };

  async function save() {
    setTried(true);
    if (!row && !student) {
      toast.error("Сурагчаа сонгоно уу");
      return;
    }
    if (!variant) {
      toast.error("Хувилбараа сонгоно уу");
      return;
    }
    if (firstIncomplete >= 0) {
      toast.error(`${itemName(items[firstIncomplete], items)}: бүх орныг бөглөнө үү (хоосон орон «_»)`);
      if (mode === "answer") focus(firstIncomplete);
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ totalScore: number; maxScore: number }>(`/paper-exams/${encodeURIComponent(examId)}/sheet`, {
        method: "PUT",
        body: { sheetId: row?.sheetId, studentId: row ? undefined : student?.id, variant, answers },
      });
      toast.success(
        row
          ? `Хадгаллаа: ${scoreText(row.totalScore)} → ${scoreText(r.totalScore)} оноо`
          : `Хадгаллаа: ${scoreText(r.totalScore)} / ${scoreText(r.maxScore)} оноо`,
      );
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(errorText(e, "Хадгалж чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  const sections = [
    { choice: true, title: "Сонгох даалгавар", idx: items.flatMap((it, i) => ((it.cells ?? 1) > 1 ? [] : [i])) },
    { choice: false, title: "Нөхөх даалгавар", idx: items.flatMap((it, i) => ((it.cells ?? 1) > 1 ? [i] : [])) },
  ].filter((s) => s.idx.length > 0);

  return (
    <ExamDialog
      open={open}
      onOpenChange={close}
      wide
      title={row ? `Дүн засах · ${shortName(row.lastName, row.firstName)}` : "Дүн нэмэх"}
      description="Хариу, хувилбарыг гараар засна. Хуучин дүн устахгүй"
      footer={
        <>
          <div className="mr-auto text-sm text-ink">
            <span className="font-display text-lg font-bold tabular-nums">
              {variant ? scoreText(score) : ""}
              <span className="text-sm font-normal text-ink-dim"> / {scoreText(max)} оноо</span>
            </span>
            {row && <span className="ml-2 text-ink-dim">өмнө нь {scoreText(row.totalScore)}</span>}
            {changed > 0 && <span className="ml-2 text-ink-dim">{changed} бодлого өөрчилсөн</span>}
          </div>
          <Button variant="ghost" onClick={() => close(false)}>
            Болих
          </Button>
          <Button onClick={save} disabled={busy || nothingToSave}>
            Хадгалах
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!row && (
          <div className="space-y-2">
            <input
              value={query}
              autoFocus
              onChange={(e) => {
                setQuery(e.target.value);
                setStudent(null);
              }}
              placeholder="Сурагчийн нэр эсвэл код"
              className={cn(
                "h-11 w-full rounded-xl border bg-panel px-3 text-ink outline-none focus:border-brand",
                tried && !student ? "border-error" : "border-line",
              )}
            />
            {student ? (
              <p className="text-sm font-semibold text-success">
                {student.name} · {student.code} · {student.classes.join(", ")}
              </p>
            ) : (
              found && (
                <ul className="max-h-40 overflow-auto rounded-xl border border-line">
                  {found.length === 0 && <li className="px-3 py-2 text-sm text-ink-dim">Олдсонгүй</li>}
                  {found.map((s) => (
                    <li key={s.id}>
                      <button onClick={() => setStudent(s)} className="row-interactive w-full px-3 py-2 text-left text-sm">
                        {s.name} <span className="text-ink-dim">· {s.code} · {s.classes.join(", ")}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Хувилбар">
            <span className="mr-1 text-sm font-semibold text-ink">Хувилбар</span>
            {variantList.map((v) => (
              <button
                key={v}
                aria-pressed={variant === v}
                onClick={() => setVariant(v)}
                className={cn(
                  "min-h-11 min-w-12 rounded-lg border-2 text-lg font-bold",
                  variant === v
                    ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                    : tried && !variant
                      ? "border-error text-ink-dim"
                      : "border-line text-ink-dim",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1 rounded-xl border border-line p-1" role="group" aria-label="Оруулах арга">
            {(
              [
                ["answer", "Хариу шивэх"],
                ["mark", "Зөв / алдсан"],
              ] as const
            ).map(([m, text]) => (
              <button
                key={m}
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn("min-h-10 rounded-lg px-3 text-sm font-semibold", mode === m ? "bg-brand text-on-brand" : "text-ink-dim")}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {row && variantChanged && variant && (
          <p className="rounded-xl bg-brand-bright/10 px-3 py-2 text-sm font-semibold text-ink">
            Хувилбарыг {row.variant || "тодорхойгүй"} → {variant} болгож байна. Хариуг {variant} хувилбарын түлхүүрээр дүгнэхэд{" "}
            {scoreText(row.totalScore)} → {scoreText(score)} оноо болно
          </p>
        )}
        {!variant && <p className="text-sm font-semibold text-ink-dim">Эхлээд хувилбараа сонгоно уу. Нүдний өнгө, оноо хувилбараас хамаарна</p>}

        {sections.map((sec) => (
          <section key={sec.title}>
            {sections.length > 1 && <h3 className="mb-2 text-sm font-bold text-ink">{sec.title}</h3>}
            <ol
              className={cn(
                "grid gap-2",
                mode === "mark"
                  ? "grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]"
                  : sec.choice
                    ? "grid-cols-[repeat(auto-fill,minmax(4rem,1fr))]"
                    : "grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))]",
              )}
            >
              {sec.idx.map((i) => {
                const it = items[i];
                const cells = variantCells(it, variant);
                const digit = (it.cells ?? 1) > 1;
                const a = answers[i];
                const held = a === "+" || a === "-" || a === "*";
                const tone = variant ? TONE[statuses[i]] : "border-line bg-panel";
                // «Зөв / алдсан» горимд одоогийн дүгнэлт: шивсэн хариутай бодлогод ч зөв/бурууг нь тодруулна
                const now = statuses[i] === "CORRECT" ? "+" : statuses[i] === "BLANK" ? "" : statuses[i] === "UNGRADED" ? null : "-";
                return (
                  <li key={i} className={cn("rounded-xl border px-2 py-1.5", a !== initial[i] ? "border-brand-bright" : "border-line")}>
                    <div className="mb-1 truncate text-xs font-bold text-ink-dim">{itemName(it, items)}</div>
                    {mode === "answer" ? (
                      <input
                        ref={(el) => {
                          inputs.current[i] = el;
                        }}
                        value={held ? "" : a}
                        placeholder={a === "+" ? "зөв" : a === "-" ? "алдсан" : a === "*" ? "2 хариу" : digit ? "_".repeat(cells) : ""}
                        maxLength={digit ? cells : 2}
                        inputMode={digit ? "numeric" : "text"}
                        autoCapitalize="characters"
                        autoComplete="off"
                        aria-label={`${itemName(it, items)} хариу`}
                        aria-invalid={incomplete[i] || undefined}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (digit) {
                            const v = raw.replace(/[^0-9_-]/g, "").slice(0, cells);
                            set(i, v);
                            if (v.length === cells) focus(i + 1);
                          } else if (raw === "") {
                            set(i, "");
                          } else {
                            const v = toLetter(raw);
                            if (!v) return;
                            set(i, v);
                            focus(i + 1);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && e.currentTarget.value === "") {
                            e.preventDefault();
                            if (held) set(i, "");
                            else focus(i - 1);
                          } else if (e.key === "Enter" || e.key === "ArrowDown") {
                            e.preventDefault();
                            focus(i + 1);
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            focus(i - 1);
                          }
                        }}
                        className={cn(
                          "h-11 w-full rounded-lg border-2 text-center text-lg font-bold tracking-widest text-ink outline-none focus:border-brand",
                          tried && incomplete[i] ? "border-error bg-error/12" : tone,
                        )}
                      />
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            ["+", "Зөв", "border-success bg-success/15 text-success"],
                            ["-", "Алдсан", "border-error bg-error/12 text-error"],
                            ["", "Хоосон", "border-ink-dim bg-panel text-ink"],
                          ] as const
                        ).map(([v, text, on]) => (
                          <button
                            key={text}
                            onClick={() => now !== v && set(i, v)}
                            aria-pressed={now === v}
                            className={cn("h-10 rounded-lg border text-[11px] font-bold", now === v ? on : "border-line text-ink-dim")}
                          >
                            {text}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        <p className="text-xs text-ink-dim">
          {mode === "answer"
            ? "Хариуг A–E үсгээр эсвэл 1–5 тоогоор шивнэ, дараагийн нүд рүү өөрөө шилжинэ. Нөхөх багцад орон бүрийн цифрийг дараалан шивнэ, хоосон орон «_». Ногоон нь зөв, улаан нь буруу"
            : "Дүнг нь солиход л тэр бодлогын шивсэн хариу арилж, зөв/алдсан тэмдэг хадгалагдана. Хөндөөгүй бодлогын хариу хэвээр үлдэнэ"}
        </p>
      </div>
    </ExamDialog>
  );
}

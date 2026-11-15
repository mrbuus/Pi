"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import ExamDialog from "@/components/exams/ExamDialog";
import { errorText } from "@/components/exams/types";
import { cn } from "@/lib/cn";
import { itemName, type BoardRow, type PaperItem } from "./types";

type Mode = "answer" | "mark";
interface FoundStudent {
  id: string;
  name: string;
  code: string | null;
  classes: string[];
}

/**
 * Багшийн гараар засвар (эзэн 2026-11-15): машин уншиж чадаагүй сурагчийн дүнг нэмэх эсвэл
 * буруу уншсаныг засах. Хоёр горим: хариуг шууд шивэх (A–E, цифр) эсвэл бодлого бүрт
 * зөв/алдсан тэмдэглэх. Хуучин мөр устахгүй — сервер шинэ мөр үүсгэж хуучныг хүчингүй болгоно.
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
  const [mode, setMode] = useState<Mode>("answer");
  const [variant, setVariant] = useState(row?.variant ?? variants[0] ?? "A");
  const [answers, setAnswers] = useState<string[]>(() => items.map((_, i) => clean(row?.answers[i])));
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<FoundStudent[] | null>(null);
  const [student, setStudent] = useState<FoundStudent | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function save() {
    if (!row && !student) {
      toast.error("Сурагчаа сонгоно уу");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ totalScore: number; maxScore: number }>(`/paper-exams/${encodeURIComponent(examId)}/sheet`, {
        method: "PUT",
        body: { sheetId: row?.sheetId, studentId: row ? undefined : student?.id, variant, answers },
      });
      toast.success(`Хадгаллаа · ${r.totalScore} / ${r.maxScore} оноо`);
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(errorText(e, "Хадгалж чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ExamDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={row ? `Дүн засах · ${row.lastName} ${row.firstName}` : "Дүн нэмэх"}
      description="Машин уншиж чадаагүй эсвэл буруу уншсан хуудсыг гараар оруулна. Хуучин дүн устахгүй"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Болих
          </Button>
          <Button onClick={save} disabled={busy}>
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
              onChange={(e) => {
                setQuery(e.target.value);
                setStudent(null);
              }}
              placeholder="Сурагчийн нэр эсвэл код"
              className="h-11 w-full rounded-xl border border-line bg-panel px-3 text-ink outline-none focus:border-brand"
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
          <div className="flex gap-1 rounded-xl border border-line p-1" role="group" aria-label="Горим">
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
          <div className="ml-auto flex items-center gap-1" role="group" aria-label="Хувилбар">
            <span className="mr-1 text-sm text-ink-dim">Хувилбар</span>
            {(variants.length ? variants : ["A", "B"]).map((v) => (
              <button
                key={v}
                aria-pressed={variant === v}
                onClick={() => setVariant(v)}
                className={cn(
                  "min-h-10 min-w-11 rounded-lg border-2 font-bold",
                  variant === v ? "border-brand-bright bg-brand-bright/15 text-brand-soft" : "border-line text-ink-dim",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <ol className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
          {items.map((it, i) => {
            const cells = it.cells ?? 1;
            const a = answers[i];
            return (
              <li key={i} className="rounded-xl border border-line px-2 py-1.5">
                <div className="mb-1 truncate text-xs font-bold text-ink-dim">{itemName(it, items)}</div>
                {mode === "answer" ? (
                  <input
                    value={a === "+" || a === "-" ? "" : a}
                    placeholder={a === "+" ? "зөв" : a === "-" ? "алдсан" : cells > 1 ? "_".repeat(cells) : "A–E"}
                    maxLength={cells}
                    inputMode={cells > 1 ? "numeric" : "text"}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase();
                      set(i, cells > 1 ? v.replace(/[^0-9_-]/g, "") : v.replace(/[^A-E]/g, ""));
                    }}
                    className="h-10 w-full rounded-lg border border-line bg-panel text-center font-bold tracking-widest text-ink outline-none focus:border-brand"
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
                        onClick={() => set(i, v)}
                        className={cn("h-10 rounded-lg border text-[11px] font-bold", a === v ? on : "border-line text-ink-dim")}
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
        <p className="text-xs text-ink-dim">
          Нөхөх багцад орон бүрийн цифрийг дараалан шивнэ (хоосон орон «_»). Зөв/алдсан горимд хариу биш зөвхөн дүн хадгалагдана
        </p>
      </div>
    </ExamDialog>
  );
}

/** Хадгалагдсан хариуг засварт: «*» давхар будсан → хоосон */
function clean(a: string | undefined): string {
  if (!a || a === "*") return "";
  return a;
}

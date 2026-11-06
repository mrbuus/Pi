"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import LedgerDialog, { inputCls } from "@/components/payments/LedgerDialog";
import { mnt } from "@/components/payments/ledgerFormat";
import { errMsg } from "@/components/payments/paymentHelpers";
import StudentPicker from "./StudentPicker";
import { KIND_LABEL, STUDENT_KINDS, type AllocKind, type BankRow, type StudentCard } from "./types";

type Draft = { key: number; kind: AllocKind; amount: string; student: StudentCard | null };

let seq = 0;
const draft = (kind: AllocKind, amount: number, student: StudentCard | null = null): Draft => ({ key: ++seq, kind, amount: String(amount), student });

/**
 * Саналаас эхлэх хуваалт: «сургалт + ном» хольсон бол хоёр хэсэг, ах дүүгийн хамтын
 * шилжүүлэг бол хүүхэд бүрд тэнцүү (1,000-аар бүхэлчилж үлдэгдлийг сүүлд) —
 * хүн дүнг нь засна (жишээ нь 3,400,000 = 1,500,000 + 1,900,000).
 */
export function initialDrafts(row: BankRow): Draft[] {
  const s = row.suggestion;
  const kids = (s?.candidates ?? []).map((c) => c.student).filter((x): x is StudentCard => !!x);
  if (s?.split?.length) return s.split.map((p) => draft(p.kind, p.amount, STUDENT_KINDS.includes(p.kind) ? kids[0] ?? null : null));
  if (s?.decision === "SPLIT" && kids.length >= 2) {
    const each = Math.floor(row.amount / kids.length / 1000) * 1000;
    return kids.map((k, i) => draft("TUITION", i === kids.length - 1 ? row.amount - each * (kids.length - 1) : each, k));
  }
  const kind: AllocKind = row.direction === "DEBIT" ? "EXPENSE" : s?.kind ?? "TUITION";
  return [draft(kind, row.amount, STUDENT_KINDS.includes(kind) && kids.length === 1 ? kids[0] : null)];
}

export default function AllocateDialog({
  row,
  open,
  onOpenChange,
  onSaved,
}: {
  row: BankRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (alsoResolved: number) => void;
}) {
  const [parts, setParts] = useState<Draft[]>(() => initialDrafts(row));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setParts(initialDrafts(row));
      setError(null);
    }
  }, [open, row]);

  const kinds = (Object.keys(KIND_LABEL) as AllocKind[]).filter((k) => (row.direction === "DEBIT" ? k !== "TUITION" : k !== "EXPENSE"));
  const sum = parts.reduce((t, p) => t + (parseInt(p.amount.replace(/\D/g, ""), 10) || 0), 0);
  const rest = row.amount - sum;
  const missingKid = parts.some((p) => p.kind === "TUITION" && !p.student);
  const suggested = (row.suggestion?.candidates ?? []).map((c) => c.student).filter((x): x is StudentCard => !!x);
  const update = (key: number, patch: Partial<Draft>) => setParts((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ alsoResolved: number }>(`/reconcile/rows/${encodeURIComponent(row.id)}/allocate`, {
        method: "POST",
        body: {
          parts: parts.map((p) => ({
            kind: p.kind,
            amount: parseInt(p.amount.replace(/\D/g, ""), 10) || 0,
            ...(STUDENT_KINDS.includes(p.kind) && p.student ? { studentId: p.student.id } : {}),
          })),
        },
      });
      toast.success("Хуваарилагдлаа");
      onOpenChange(false);
      onSaved(res.alsoResolved);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <LedgerDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Хуваарилах"
      description={`${mnt(row.amount)} — ${row.description || "утгагүй"}`}
      footer={
        <Button onClick={save} disabled={saving || rest !== 0 || missingKid} className="w-full sm:w-auto">
          {saving ? "Хадгалж байна" : "Хадгалах"}
        </Button>
      }
    >
      <div className="space-y-4">
        {parts.map((p, i) => (
          <fieldset key={p.key} className="space-y-2 rounded-2xl border border-line p-3">
            <legend className="sr-only">Хэсэг {i + 1}</legend>
            <div className="flex gap-2">
              <select
                aria-label="Зориулалт"
                value={p.kind}
                onChange={(e) => update(p.key, { kind: e.target.value as AllocKind })}
                className={`${inputCls} min-w-0 flex-1`}
              >
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
              {parts.length > 1 && (
                <button
                  type="button"
                  onClick={() => setParts((ps) => ps.filter((x) => x.key !== p.key))}
                  aria-label="Хэсгийг хасах"
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-dim hover:bg-error/5 hover:text-error"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <input
                aria-label="Дүн"
                inputMode="numeric"
                value={p.amount ? Number(p.amount).toLocaleString("en-US") : ""}
                onChange={(e) => update(p.key, { amount: e.target.value.replace(/[^\d]/g, "") })}
                className={`${inputCls} pr-8 text-right tabular-nums`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-dim">₮</span>
            </div>
            {STUDENT_KINDS.includes(p.kind) && (
              <StudentPicker id={`kid-${p.key}`} value={p.student} onChange={(s) => update(p.key, { student: s })} suggestions={suggested} />
            )}
          </fieldset>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setParts((ps) => [...ps, draft(ps.at(-1)?.kind ?? "TUITION", Math.max(rest, 0))])}
            disabled={parts.length >= 10}
          >
            <Plus /> Хэсэг нэмэх
          </Button>
          <span className={`text-sm font-semibold tabular-nums ${rest === 0 ? "text-success" : "text-error"}`}>
            {rest === 0 ? "Дүн таарч байна" : rest > 0 ? `${mnt(rest)} хуваарилагдаагүй` : `${mnt(-rest)} илүү`}
          </span>
        </div>
        {missingKid && <p className="text-sm text-ink-dim">Сургалтын төлбөрт хүүхэд сонгоно уу</p>}
        {error && (
          <p role="alert" className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
      </div>
    </LedgerDialog>
  );
}

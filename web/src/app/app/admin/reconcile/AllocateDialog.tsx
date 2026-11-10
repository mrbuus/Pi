"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import LedgerDialog, { inputCls } from "@/components/payments/LedgerDialog";
import { dayLabel, mnt } from "@/components/payments/ledgerFormat";
import { errMsg } from "@/components/payments/paymentHelpers";
import PayerInfo from "./PayerInfo";
import StudentPicker from "./StudentPicker";
import { KIND_LABEL, STUDENT_KINDS, sheetWriteText, splitSender, type SheetWrite, type AllocKind, type BankRow, type StudentCard } from "./types";

type Draft = { key: number; kind: AllocKind; amount: string; student: StudentCard | null };

let seq = 0;
const draft = (kind: AllocKind, amount: number, student: StudentCard | null = null): Draft => ({ key: ++seq, kind, amount: String(amount), student });

/**
 * Саналаас эхлэх хуваалт. Ах дүүгийн хамтын шилжүүлэгт ажилтан шийтэд бүртгэсэн
 * дүнгүүд байвал тэдгээрээр (жишээ нь 270,000 + 350,000); үгүй бол тэнцүү хувааж
 * «санал» гэж тэмдэглэнэ — хүн бодит дүнгээ оруулна.
 */
export function initialDrafts(row: BankRow): { drafts: Draft[]; guessed: boolean } {
  const s = row.suggestion;
  const cands = (s?.candidates ?? []).filter((c) => !!c.student);
  const kids = cands.map((c) => c.student!);
  if (s?.split?.length)
    return { drafts: s.split.map((p) => draft(p.kind, p.amount, STUDENT_KINDS.includes(p.kind) ? kids[0] ?? null : null)), guessed: false };
  if (s?.decision === "SPLIT" && kids.length >= 2) {
    const sheet = cands.map((c) => (c.sheetPays.length === 1 ? c.sheetPays[0].amount : null));
    if (sheet.every((x) => x != null)) {
      const sum = sheet.reduce((t, x) => t + x!, 0);
      if (sum <= row.amount) {
        const drafts = cands.map((c, i) => draft("TUITION", sheet[i]!, c.student));
        if (row.amount - sum > 0) drafts.push(draft("OTHER", row.amount - sum));
        return { drafts, guessed: false };
      }
    }
    const each = Math.floor(row.amount / kids.length / 1000) * 1000;
    return { drafts: kids.map((k, i) => draft("TUITION", i === kids.length - 1 ? row.amount - each * (kids.length - 1) : each, k)), guessed: true };
  }
  const kind: AllocKind = row.direction === "DEBIT" ? "EXPENSE" : s?.kind ?? "TUITION";
  return { drafts: [draft(kind, row.amount, STUDENT_KINDS.includes(kind) && kids.length === 1 ? kids[0] : null)], guessed: false };
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
  const [parts, setParts] = useState<Draft[]>(() => initialDrafts(row).drafts);
  const [guessed, setGuessed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      const init = initialDrafts(row);
      setParts(init.drafts);
      setGuessed(init.guessed);
      setError(null);
    }
  }, [open, row]);

  const kinds = (Object.keys(KIND_LABEL) as AllocKind[]).filter((k) => (row.direction === "DEBIT" ? k !== "TUITION" : k !== "EXPENSE"));
  const sum = parts.reduce((t, p) => t + (parseInt(p.amount.replace(/\D/g, ""), 10) || 0), 0);
  const rest = row.amount - sum;
  const missingKid = parts.some((p) => p.kind === "TUITION" && !p.student);
  const suggested = (row.suggestion?.candidates ?? []).map((c) => c.student).filter((x): x is StudentCard => !!x);
  const sheetOf = (studentId: string | undefined) => row.suggestion?.candidates.find((c) => c.studentId === studentId)?.sheetPays ?? [];
  const update = (key: number, patch: Partial<Draft>) => setParts((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ alsoResolved: number; sheetWrites?: SheetWrite[] }>(`/reconcile/rows/${encodeURIComponent(row.id)}/allocate`, {
        method: "POST",
        body: {
          parts: parts.map((p) => ({
            kind: p.kind,
            amount: parseInt(p.amount.replace(/\D/g, ""), 10) || 0,
            ...(STUDENT_KINDS.includes(p.kind) && p.student ? { studentId: p.student.id } : {}),
          })),
        },
      });
      toast.success("Хуваарилагдлаа", { description: sheetWriteText(res.sheetWrites) ?? undefined });
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
      description={`${mnt(row.amount)} — ${splitSender(row.description).main || "утгагүй"}`}
      footer={
        <Button onClick={save} disabled={saving || rest !== 0 || missingKid} className="w-full sm:w-auto">
          {saving ? "Хадгалж байна" : "Хадгалах"}
        </Button>
      }
    >
      <div className="space-y-4">
        <PayerInfo row={row} />
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
            {p.student && sheetOf(p.student.id).length > 0 && (
              <p className="flex items-center gap-1.5 text-sm text-ink-dim">
                <FileSpreadsheet className="size-4 shrink-0 text-info" aria-hidden />
                Шийтэд: {sheetOf(p.student.id).map((x) => `${mnt(x.amount)} (${dayLabel(x.date)})`).join(", ")}
              </p>
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
        {guessed && <p className="text-sm text-ink-dim">Дүнг тэнцүү хувааж санал болгосон — бодит дүнгээ оруулна уу</p>}
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

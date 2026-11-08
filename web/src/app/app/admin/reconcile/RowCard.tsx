"use client";

import { useState } from "react";
import { Check, CircleAlert, CircleCheck, FileSpreadsheet, Split, Undo2, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import LedgerDialog from "@/components/payments/LedgerDialog";
import { mnt, stampLabel } from "@/components/payments/ledgerFormat";
import { errMsg } from "@/components/payments/paymentHelpers";
import AllocateDialog from "./AllocateDialog";
import PayerInfo from "./PayerInfo";
import StudentDetailDialog from "./StudentDetailDialog";
import { MoreButton } from "./StudentPicker";
import { SIGNAL_LABEL, STUDENT_KINDS, splitSender, type AllocPart, type BankRow, type Candidate } from "./types";

const signals = (c: Candidate) => [...new Set(c.signals.map((s) => SIGNAL_LABEL[s]))].join(" + ");

/** Яагаад хүн шийдэх хэрэгтэй болсныг товч хэлнэ */
const DECISION_HINT: Record<string, string> = {
  SUGGEST: "Нэг шинжээр таарсан — зөв бол товшоод батална уу",
  CHOOSE: "Тохирох хүүхэд хэд хэд байна — сонгоно уу",
  NONE: "Хүүхэд танигдсангүй",
};

/** Банкны нэг гүйлгээ: шийдэгдээгүй бол санал + товч, шийдэгдсэн бол хуваарилалт + «Буцаах». */
/** onDone: тэр мөр жагсаалтаас гарна (хуудас дахин ачаалахгүй); alsoResolved — сурсан данс/утсаар нэмж шийдэгдсэн */
export default function RowCard({ row, onDone }: { row: BankRow; onDone: (rowId: string, alsoResolved?: number) => void }) {
  const [dialog, setDialog] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [busy, setBusy] = useState(false);
  const s = row.suggestion;
  const open = !row.resolvedAt;
  const { main } = splitSender(row.description);
  /** «⋯» дарсан санал болгосон хүүхэд */
  const [detailId, setDetailId] = useState<string | null>(null);

  async function quick(parts: AllocPart[]) {
    setBusy(true);
    try {
      const res = await api<{ alsoResolved: number }>(`/reconcile/rows/${encodeURIComponent(row.id)}/allocate`, { method: "POST", body: { parts } });
      toast.success("Хуваарилагдлаа");
      onDone(row.id, res.alsoResolved);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    setBusy(true);
    try {
      await api(`/reconcile/rows/${encodeURIComponent(row.id)}/undo`, { method: "POST" });
      toast.success("Буцаалаа — «Шийдэх» жагсаалтад орлоо");
      setConfirmUndo(false);
      onDone(row.id);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  // Нэг товшилтоор батлах: зөвхөн нэг хэсэгтэй, хуваах шаардлагагүй санал
  const kidKind = s && STUDENT_KINDS.includes(s.kind) ? s.kind : "TUITION";
  const canQuickKid = open && s && !s.split && s.decision !== "SPLIT" && row.direction === "CREDIT";
  const needsSplit = open && s && (s.split || s.decision === "SPLIT");
  const nonKidKind = open && s && !STUDENT_KINDS.includes(s.kind) && !s.split ? s.kind : null;

  return (
    <article className="space-y-2.5 rounded-2xl border border-line bg-surface p-3 sm:p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className={`text-lg font-extrabold tabular-nums ${row.direction === "DEBIT" ? "text-error" : "text-ink"}`}>
          {row.direction === "DEBIT" ? "-" : ""}
          {mnt(row.amount)}
        </span>
        <span className="text-sm tabular-nums text-ink-dim">{stampLabel(row.bookedAt)}</span>
      </header>
      <p className="break-words text-base font-semibold leading-snug text-ink">
        {main || <span className="font-normal text-ink-dim">Утгагүй гүйлгээ</span>}
      </p>
      <PayerInfo row={row} />

      {open && s && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={s.kind === "TUITION" ? "brand" : "neutral"}>{s.kindLabel}</Badge>
            {s.reason !== s.kindLabel && !s.reason.startsWith(`${s.kindLabel}:`) && <span className="text-sm text-ink-dim">{s.reason}</span>}
            {row.direction === "CREDIT" && !s.split && DECISION_HINT[s.decision] && (s.kind === "TUITION" || s.candidates.length > 0) && (
              <span className="text-sm text-ink-dim">{DECISION_HINT[s.decision]}</span>
            )}
          </div>
          {s.unrecorded && (
            <p className="flex items-start gap-1.5 text-sm text-ink-dim">
              <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
              Шийтэд бүртгэгдээгүй — батлахад шинэ төлбөр болж нэмэгдэнэ
            </p>
          )}
          {s.hiddenPaidUp > 0 && (
            <p className="flex items-start gap-1.5 text-sm text-ink-dim">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              Жилийн төлбөрөө бүрэн төлсөн {s.hiddenPaidUp} хүүхдийг санал болгосонгүй
            </p>
          )}
          {s.decision === "SPLIT" && (
            <p className="flex items-start gap-1.5 text-sm text-ink-dim">
              <Users className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
              Хэд хэдэн хүүхдийн нэр бий — хувааж онооно
            </p>
          )}
          {canQuickKid && s.candidates.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {s.candidates.map((c) => (
                <li key={c.studentId} className="flex items-stretch rounded-xl border border-line">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => quick([{ kind: kidKind, amount: row.amount, studentId: c.studentId }])}
                    className="row-interactive flex min-h-11 flex-col items-start rounded-l-xl px-3 py-1.5 text-left disabled:opacity-50"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <Check className="size-4 text-success" aria-hidden />
                      <Meta items={[c.student?.name ?? "Хүүхэд", c.student?.classroom, c.student?.archived ? "Гарсан" : null]} />
                    </span>
                    <span className="text-xs text-ink-dim">
                      <Meta items={[signals(c), c.sheetPays.length ? `Шийтэд ${c.sheetPays.map((x) => mnt(x.amount)).join(", ")}` : null]} />
                    </span>
                  </button>
                  <MoreButton name={c.student?.name ?? "Хүүхэд"} onClick={() => setDetailId(c.studentId)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {row.inSheet && (
        <p className="flex items-start gap-1.5 text-sm text-ink-dim">
          <FileSpreadsheet className={`mt-0.5 size-4 shrink-0 ${row.sheetMissing ? "text-error" : "text-info"}`} aria-hidden />
          {row.sheetMissing
            ? "Шийтэд байгааг баталж чадсангүй (энэ хүүхдэд ижил дүнтэй бүртгэл олдсонгүй) — шалгана уу"
            : "Ажилтан шийтэд хөтөлсөн"}
        </p>
      )}

      {!open && !row.inSheet && (
        <ul className="space-y-1">
          {row.allocations.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <Badge tone={a.kind === "TUITION" ? "brand" : "neutral"}>{a.kindLabel}</Badge>
              {a.student && (
                <span className="font-semibold text-ink">
                  <Meta items={[a.student.name, a.student.classroom]} />
                </span>
              )}
              {row.allocations.length > 1 && <span className="tabular-nums text-ink-dim">{mnt(a.amount)}</span>}
              {a.kind === "TUITION" && (
                <span className="text-xs text-ink-dim">{a.inSheet ? "Шийтэд бүртгэлтэй" : "Шинэ төлбөр"}</span>
              )}
              {a.auto && <span className="text-xs text-ink-dim">Автоматаар</span>}
            </li>
          ))}
        </ul>
      )}

      <footer className="flex flex-wrap gap-2 pt-0.5">
        {open && needsSplit && (
          <Button size="sm" onClick={() => setDialog(true)} disabled={busy}>
            <Split /> Хуваах
          </Button>
        )}
        {nonKidKind && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => quick([{ kind: nonKidKind, amount: row.amount }])}>
            <Check /> {s!.kindLabel} гэж батлах
          </Button>
        )}
        {open && (
          <Button size="sm" variant="outline" onClick={() => setDialog(true)} disabled={busy}>
            {s?.candidates.length ? "Өөрөөр хуваарилах" : "Хүүхэд хайж оноох"}
          </Button>
        )}
        {!open && (
          <Button size="sm" variant="ghost" onClick={() => setConfirmUndo(true)} disabled={busy}>
            <Undo2 /> {row.inSheet ? "Буцааж шийдэх" : "Буцаах"}
          </Button>
        )}
        {open && !s && (
          <span className="flex items-center gap-1.5 text-sm text-ink-dim">
            <CircleAlert className="size-4" aria-hidden /> Санал алга
          </span>
        )}
      </footer>

      <StudentDetailDialog
        studentId={detailId}
        open={!!detailId}
        onOpenChange={(o) => !o && setDetailId(null)}
        onPick={
          canQuickKid && detailId
            ? () => {
                const id = detailId;
                setDetailId(null);
                quick([{ kind: kidKind, amount: row.amount, studentId: id }]);
              }
            : undefined
        }
      />
      <AllocateDialog row={row} open={dialog} onOpenChange={setDialog} onSaved={(n) => onDone(row.id, n)} />
      <LedgerDialog
        open={confirmUndo}
        onOpenChange={setConfirmUndo}
        title="Хуваарилалтыг буцаах уу"
        description="Гүйлгээ «Шийдэх» жагсаалтад буцаж орно. Шийтээс орсон төлбөр хэвээр үлдэнэ"
        footer={
          <Button variant="danger" onClick={undo} disabled={busy} className="w-full sm:w-auto">
            {busy ? "Буцааж байна" : "Буцаах"}
          </Button>
        }
      >
        <p className="text-sm text-ink-dim">Энэ гүйлгээнээс шинээр үүссэн төлбөр байвал хүчингүй болно</p>
      </LedgerDialog>
    </article>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Clock, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatMnt } from "@/lib/orgInfo";
import { Meta } from "@/components/ui/Meta";
import { Button } from "@/components/ui/kit/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import PaymentEditModal from "./PaymentEditModal";
import { studentHref } from "./LedgerRowItem";
import { METHOD_LABEL, errMsg, matchTuitionPlan } from "./paymentHelpers";
import type { Pass, Payment } from "./types";

const fieldCls = "min-h-11 rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Баталгаажуулах төлбөрүүд (QPay-ийн дутуу, сурагчийн өөрөө илгээсэн данс) —
 * эрх олгох, тайлбар, батлах/цуцлах/засах. Өмнөх «Батлах» табын бүх функц.
 */
export default function PendingPanel({ onChanged }: { onChanged?: () => void }) {
  const [rows, setRows] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [passPick, setPassPick] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Payment | null>(null);

  const load = useCallback(() => {
    api<Payment[]>("/payments?status=PENDING")
      .then((d) => {
        setRows(d);
        setError(null);
      })
      .catch((e) => setError(errMsg(e)));
    api<Pass[]>("/catalog/passes", { auth: false })
      .then(setPasses)
      .catch(() => setPasses([]));
  }, []);
  useEffect(load, [load]);

  async function act(id: string, kind: "confirm" | "reject") {
    try {
      await api(`/payments/${id}/${kind}`, {
        method: "POST",
        body:
          kind === "confirm"
            ? { ...(passPick[id] ? { passId: passPick[id] } : {}), ...(notes[id]?.trim() ? { note: notes[id].trim() } : {}) }
            : {},
      });
      toast.success(kind === "confirm" ? "Төлбөр баталгаажлаа" : "Төлбөр цуцлагдлаа");
      load();
      onChanged?.();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!rows) return <LoadingState rows={3} label="Батлах төлбөр" />;
  if (!rows.length)
    return <EmptyState icon={Check} title="Батлах төлбөр алга" hint="Сурагч дансаар шилжүүлээд илгээсэн эсвэл QPay-ийн дутуу төлбөр энд ирнэ" />;

  return (
    <>
      <ul className="space-y-3">
        {rows.map((p) => {
          const match = matchTuitionPlan(p.amount);
          return (
            <li key={p.id} className="chunky space-y-3 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-info/15 text-info">
                  <Clock className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  {p.user ? (
                    <Link href={studentHref(p.user.id)} className="font-bold text-ink hover:underline">
                      {p.user.firstName} {p.user.lastName}
                    </Link>
                  ) : (
                    <span className="font-bold text-ink">Тодорхойгүй</span>
                  )}
                  <p className="text-sm text-ink-dim">
                    <Meta items={[p.user?.phone, p.forMonth]} />
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-extrabold tabular-nums text-ink">{formatMnt(p.amount)}</p>
                  <p className="text-xs text-ink-dim">{METHOD_LABEL[p.method] ?? p.method}</p>
                </div>
              </div>
              <p className={`flex items-start gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${match ? "bg-success/10 text-success" : "bg-ink/5 text-ink"}`}>
                {match ? (
                  <Check className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-error" aria-hidden />
                )}
                {match ? `Багцтай тохирч байна: ${match.tier.label}, ${match.plan.label}` : "Үнийн багцтай тохирохгүй дүн — шалгана уу"}
              </p>
              {p.description && <p className="text-sm text-ink-dim">{p.description}</p>}
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
                <label className="sr-only" htmlFor={`pass-${p.id}`}>
                  Олгох эрх
                </label>
                <select
                  id={`pass-${p.id}`}
                  value={passPick[p.id] ?? ""}
                  onChange={(e) => setPassPick((m) => ({ ...m, [p.id]: e.target.value }))}
                  className={`${fieldCls} col-span-2 lg:col-span-1`}
                >
                  <option value="">Эрх олгохгүй</option>
                  {passes.map((pass) => (
                    <option key={pass.id} value={pass.id}>
                      {pass.name} — {pass.durationDays} хоног
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor={`note-${p.id}`}>
                  Баталгаажуулалтын тайлбар
                </label>
                <input
                  id={`note-${p.id}`}
                  value={notes[p.id] ?? ""}
                  onChange={(e) => setNotes((m) => ({ ...m, [p.id]: e.target.value }))}
                  placeholder="Тайлбар"
                  className={`${fieldCls} col-span-2 lg:col-span-1`}
                />
                <Button onClick={() => act(p.id, "confirm")}>
                  <Check aria-hidden /> Батлах
                </Button>
                <Button variant="danger" onClick={() => act(p.id, "reject")}>
                  <X aria-hidden /> Цуцлах
                </Button>
                <Button variant="outline" onClick={() => setEditing(p)} className="col-span-2 lg:col-span-1">
                  Засах
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <PaymentEditModal
        open={!!editing}
        payment={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          toast.success("Төлбөр засагдлаа");
          load();
        }}
      />
    </>
  );
}

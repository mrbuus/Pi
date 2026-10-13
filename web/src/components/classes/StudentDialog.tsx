"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, History, Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/app/app/admin/classrooms/ClassroomsClient";
import { Badge } from "@/components/ui/kit/badge";
import { Meta } from "@/components/ui/Meta";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMnDate, formatMnDateTime } from "@/lib/dateMn";
import { FLAG_KINDS, flagMeta } from "./meta";
import { CompetencyHint, FlagChip, RiskChip } from "./parts";
import type { FlagHistoryRow, StudentRow } from "./types";

const CONFIDENCE: Record<string, string> = { low: "Итгэл бага", medium: "Итгэл дунд", high: "Итгэл өндөр" };
const MISSING_LABEL: Record<string, string> = {
  exam: "шалгалт",
  practice: "бие даасан бодлого (10+)",
  homework: "даалгавар (3+)",
  attendance: "ирц (3+)",
};

/**
 * Нэг сурагчийн чадамжийн задаргаа + зан төлөвийн шошго (нэмэх/хасах, түүх).
 * Хасахад түүх устахгүй (api: removedAt).
 */
export default function StudentDialog({
  student,
  classroomId,
  onClose,
  onChanged,
}: {
  student: StudentRow;
  classroomId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [history, setHistory] = useState<FlagHistoryRow[] | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [kind, setKind] = useState("");
  const [note, setNote] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeNote, setRemoveNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = `${student.lastName} ${student.firstName}`;
  const c = student.competency;
  const activeKinds = new Set(student.flags.map((f) => f.kind));
  const free = FLAG_KINDS.filter((k) => !activeKinds.has(k));

  const loadHistory = useCallback(async () => {
    setHistoryError("");
    try {
      setHistory(await api<FlagHistoryRow[]>(`/class-dashboard/students/${encodeURIComponent(student.id)}/flags`));
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Түүхийг ачаалж чадсангүй");
    }
  }, [student.id]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(t);
  }, [loadHistory]);

  async function add() {
    if (!kind || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/class-dashboard/students/${encodeURIComponent(student.id)}/flags`, {
        method: "POST",
        body: { kind, note: note.trim() || null, classroomId },
      });
      setKind("");
      setNote("");
      onChanged();
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Шошго нэмж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/class-dashboard/flags/${encodeURIComponent(id)}/remove`, {
        method: "POST",
        body: { note: removeNote.trim() || null },
      });
      setRemoving(null);
      setRemoveNote("");
      onChanged();
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Шошго хасаж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={name} onClose={onClose} busy={busy}>
      <Link
        href={`/app/students/${encodeURIComponent(student.id)}`}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        <ExternalLink className="h-4 w-4" aria-hidden /> Хувийн хэрэг нээх
      </Link>

      {/* Чадамж */}
      <section aria-labelledby="comp-h" className="rounded-xl border border-line p-3">
        <div className="flex items-center gap-2">
          <h3 id="comp-h" className="font-bold text-ink">Чадамжийн оноо</h3>
          <Badge tone="neutral">v0 туршилтын</Badge>
          <CompetencyHint />
        </div>
        {c.score === null ? (
          <p className="mt-2 text-sm text-ink-dim">
            Мэдээлэл хангалтгүй — шалгалтын дүн эсвэл 10+ бие даасан бодлого хэрэгтэй
          </p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="font-display text-3xl font-bold tabular-nums text-ink">{c.score}</span>
              <span className="text-sm text-ink-dim">/100</span>
              <Meta
                className="text-sm text-ink-dim"
                items={[
                  c.level,
                  c.confidence ? CONFIDENCE[c.confidence] : null,
                  c.change !== null && c.change !== 0 ? (
                    <span key="ch" className={c.change > 0 ? "font-semibold text-success" : "font-semibold text-error"}>
                      {c.change > 0 ? `+${c.change}` : c.change} (4 долоо хоног)
                    </span>
                  ) : null,
                ]}
              />
            </div>
            <ul className="mt-3 space-y-2">
              {c.drivers.map((d) => (
                <li key={d.key} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink">{d.label}</span>
                    <span className="tabular-nums text-ink-dim">
                      {d.value}% <span className="text-xs">жин {Math.round(d.weight * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
                    <span className="block h-full rounded-full bg-brand-bright" style={{ width: `${d.value}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            {c.guessPenalty > 0 && (
              <p className="mt-2 text-sm text-ink">
                Буудсан хариултын торгууль: <span className="font-semibold tabular-nums">−{c.guessPenalty}</span>
              </p>
            )}
            {c.trend.length > 1 && (
              <div className="mt-3 flex h-10 items-end gap-1" role="img" aria-label="Чадамжийн 8 долоо хоногийн хандлага">
                {c.trend.map((p) => (
                  <span
                    key={p.at}
                    title={`${formatMnDate(p.at)} — ${p.value}`}
                    className="flex-1 rounded-sm bg-brand-bright/70"
                    style={{ height: `${Math.max(8, p.value)}%` }}
                  />
                ))}
              </div>
            )}
          </>
        )}
        {c.missing.length > 0 && (
          <p className="mt-2 text-xs text-ink-dim">Тооцоонд ороогүй: {c.missing.map((m) => MISSING_LABEL[m] ?? m).join(", ")}</p>
        )}
        <p className="mt-2 text-xs text-ink-dim">ЭЕШ-ийн таамаг — эзний алгоритм нэмэгдэх хүртэл гаргахгүй</p>
      </section>

      {/* Шошго */}
      <section aria-labelledby="flags-h" className="rounded-xl border border-line p-3">
        <h3 id="flags-h" className="font-bold text-ink">Шошго</h3>
        {student.risk.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {student.risk.map((r) => (
              <RiskChip key={r} risk={r} />
            ))}
          </div>
        )}
        {student.flags.length === 0 ? (
          <p className="mt-2 text-sm text-ink-dim">Идэвхтэй шошго алга</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {student.flags.map((f) => (
              <li key={f.id} className="rounded-lg border border-line p-2">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <FlagChip kind={f.kind} />
                    {f.note && <p className="mt-1 break-words text-sm text-ink">{f.note}</p>}
                    <Meta className="mt-0.5 text-xs text-ink-dim" items={[f.createdByName, formatMnDate(f.createdAt)]} />
                  </div>
                  {removing !== f.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setRemoving(f.id);
                        setRemoveNote("");
                      }}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-error hover:bg-error/10"
                      aria-label={`${flagMeta(f.kind).label} шошгыг хасах`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden /> Хасах
                    </button>
                  )}
                </div>
                {removing === f.id && (
                  <div className="mt-2 space-y-2">
                    <label htmlFor={`rm-${f.id}`} className="block text-xs font-semibold text-ink">
                      Яагаад хасаж байна (заавал биш)
                    </label>
                    <input
                      id={`rm-${f.id}`}
                      value={removeNote}
                      maxLength={300}
                      onChange={(e) => setRemoveNote(e.target.value)}
                      className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(f.id)}
                        className="min-h-11 flex-1 rounded-xl bg-error px-3 text-sm font-semibold text-on-error disabled:opacity-50"
                      >
                        {busy ? "Хасаж байна" : "Хасах"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setRemoving(null)}
                        className="min-h-11 flex-1 rounded-xl border border-line px-3 text-sm font-semibold text-ink"
                      >
                        Болих
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {free.length > 0 && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-sm font-semibold text-ink">Шошго нэмэх</p>
            <div role="radiogroup" aria-label="Шошгоны төрөл" className="mt-2 flex flex-wrap gap-1.5">
              {free.map((k) => {
                const m = flagMeta(k);
                const Icon = m.icon;
                const on = kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setKind(on ? "" : k)}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ring-1 ring-inset transition",
                      on ? cn(m.tone, "ring-2") : "bg-surface text-ink-dim ring-line hover:text-ink",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {m.label}
                  </button>
                );
              })}
            </div>
            {kind && (
              <div className="mt-2 space-y-2">
                <label htmlFor="flag-note" className="block text-xs font-semibold text-ink">
                  Товч тэмдэглэл
                </label>
                <textarea
                  id="flag-note"
                  value={note}
                  maxLength={300}
                  rows={2}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Жишээ нь: 10-р сарын сорилд 5 бодлогыг буудсан"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void add()}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-bright px-4 text-sm font-semibold text-on-brand disabled:opacity-50 sm:w-auto"
                >
                  <Plus className="h-4 w-4" aria-hidden /> {busy ? "Хадгалж байна" : "Шошго нэмэх"}
                </button>
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="mt-2">
            <ErrorState message={error} />
          </div>
        )}
      </section>

      {/* Түүх */}
      <section aria-labelledby="hist-h" className="rounded-xl border border-line p-3">
        <h3 id="hist-h" className="flex items-center gap-1.5 font-bold text-ink">
          <History className="h-4 w-4 text-brand-soft" aria-hidden /> Шошгоны түүх
        </h3>
        {historyError && <ErrorState message={historyError} onRetry={() => void loadHistory()} />}
        {!history && !historyError && <SkeletonRows rows={2} className="mt-2" />}
        {history && history.length === 0 && <p className="mt-2 text-sm text-ink-dim">Түүх хоосон</p>}
        {history && history.length > 0 && (
          <ul className="mt-2 divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <FlagChip kind={h.kind} />
                  {h.removedAt ? <Badge tone="neutral">Хассан</Badge> : <Badge tone="brand">Идэвхтэй</Badge>}
                </div>
                {h.note && <p className="mt-1 break-words text-ink">{h.note}</p>}
                <Meta className="mt-0.5 text-xs text-ink-dim" items={[`Нэмсэн: ${h.createdByName}`, formatMnDateTime(h.createdAt)]} />
                {h.removedAt && (
                  <Meta
                    className="mt-0.5 text-xs text-ink-dim"
                    items={[`Хассан: ${h.removedByName ?? "Ажилтан"}`, formatMnDateTime(h.removedAt), h.removeNote]}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Dialog>
  );
}

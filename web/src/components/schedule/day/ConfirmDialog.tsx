"use client";

import { BadgeCheck, ChevronDown, ClipboardCheck, Plus, Undo2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/kit/drawer";
import { Meta } from "@/components/ui/Meta";
import { stampUB } from "@/components/lesson-records/types";
import { formatMinutes } from "../types";
import TestPicker from "./TestPicker";
import { fullTestTitle, shortClass, type DayEntry, type TestInfo } from "./types";

interface Row {
  testId: string;
  excluded: string[];
}

const chip =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition disabled:opacity-50";

/**
 * Хичээлийн дараа батлах (Багш+, Админ): бодитоор хийсэн тест (төлөвлөгөөнөөс
 * урьдчилан бөглөгдөнө) + тест бүрд хассан бодлогын дугаар (ихэнх ангид хасдаггүй
 * тул жижиг товч). ClassTestSession + LessonRecord нэг дор бичигдэнэ.
 */
export default function ConfirmDialog({
  entry,
  date,
  tests,
  onClose,
  onDone,
}: {
  entry: DayEntry | null;
  date: string;
  tests: Record<string, TestInfo>;
  onClose: () => void;
  onDone: () => void;
}) {
  return (
    <Drawer open={entry !== null} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto w-full max-w-2xl" aria-describedby={undefined}>
        {entry && <Body key={`${entry.scheduleId}|${date}`} entry={entry} date={date} tests={tests} onClose={onClose} onDone={onDone} />}
      </DrawerContent>
    </Drawer>
  );
}

function Body({
  entry: e,
  date,
  tests,
  onClose,
  onDone,
}: {
  entry: DayEntry;
  date: string;
  tests: Record<string, TestInfo>;
  onClose: () => void;
  onDone: () => void;
}) {
  const doneRows = e.done.flatMap((d) => (d.testId ? [{ testId: d.testId, excluded: d.excludedProblemIds }] : []));
  const [rows, setRows] = useState<Row[]>(
    doneRows.length ? doneRows : (e.plan?.testIds ?? []).map((testId) => ({ testId, excluded: [] })),
  );
  const [extra, setExtra] = useState<Record<string, TestInfo>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [undoArmed, setUndoArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const info = (id: string) => tests[id] ?? extra[id];
  const manual = e.done.filter((d) => !d.testId);

  // Нэмсэн тестийн бодлогын дарааллыг (хасах дугаар) татна
  const missing = rows.map((r) => r.testId).filter((id) => !info(id));
  const missingKey = missing.join(",");
  useEffect(() => {
    if (!missingKey) return;
    let alive = true;
    api<TestInfo[]>(`/schedule/plan-tests?ids=${encodeURIComponent(missingKey)}`)
      .then((list) => alive && setExtra((prev) => ({ ...prev, ...Object.fromEntries(list.map((t) => [t.testId, t])) })))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [missingKey]);

  const toggleNumber = (testId: string, problemId: string) =>
    setRows((list) =>
      list.map((r) =>
        r.testId !== testId
          ? r
          : { ...r, excluded: r.excluded.includes(problemId) ? r.excluded.filter((x) => x !== problemId) : [...r.excluded, problemId] },
      ),
    );

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(false);
    }
  }
  const confirm = () =>
    run(async () => {
      await api(`/lesson-records/${e.scheduleId}/confirm`, {
        method: "PUT",
        body: { date, tests: rows.map((r) => ({ testId: r.testId, excludedProblemIds: r.excluded })) },
      });
    });
  const unconfirm = () =>
    run(async () => {
      await api(`/lesson-records/${e.scheduleId}/confirm?date=${date}`, { method: "DELETE" });
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-line px-4 pb-3 pt-2">
        <DrawerTitle className="flex items-center gap-2 text-lg font-bold text-ink">
          <ClipboardCheck className="size-5 text-success" aria-hidden />
          {shortClass(e.classroomName)} — батлах
        </DrawerTitle>
        <p className="text-xs text-ink-dim">
          <Meta
            items={[
              date.slice(5).replace("-", "."),
              `${formatMinutes(e.startMinute)}–${formatMinutes(e.endMinute)}`,
              e.record && `${e.record.confirmedByName} баталсан ${stampUB(e.record.confirmedAt)}`,
            ]}
          />
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <h3 className="text-xs font-bold text-ink-dim">Хийсэн тест</h3>
        {rows.length === 0 && <p className="text-sm text-ink-dim">Тест сонгоогүй — ирц, багшийг л батална</p>}
        <ul className="space-y-2">
          {rows.map((r) => {
            const t = info(r.testId);
            const isOpen = open === r.testId;
            return (
              <li key={r.testId} className="rounded-xl border border-line">
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink" title={t ? fullTestTitle(t) : undefined}>
                      {t?.short ?? "Тест"}
                    </span>
                    {r.excluded.length > 0 && t && (
                      <span className="text-xs font-semibold text-error">
                        Хассан:{" "}
                        {t.problemIds
                          .map((id, i) => (r.excluded.includes(id) ? i + 1 : null))
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : r.testId)}
                    aria-expanded={isOpen}
                    disabled={!t}
                    className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-ink-dim hover:bg-ink/5 hover:text-ink disabled:opacity-50"
                  >
                    Хассан бодлого
                    <ChevronDown className={cn("size-3.5 transition", isOpen && "rotate-180")} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRows((list) => list.filter((x) => x.testId !== r.testId))}
                    aria-label={`${t?.short ?? "Тест"} хасах`}
                    className="inline-flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                {isOpen && t && (
                  <div className="border-t border-line px-3 py-2.5">
                    <p className="mb-2 text-xs text-ink-dim">Ангид хийгээгүй бодлогын дугаарыг дар</p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.problemIds.map((id, i) => {
                        const on = r.excluded.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={on}
                            aria-label={`${i + 1}-р бодлого ${on ? "хассан" : ""}`}
                            onClick={() => toggleNumber(r.testId, id)}
                            className={cn(
                              "inline-flex size-10 items-center justify-center rounded-lg border text-sm font-bold tabular-nums",
                              on ? "border-error bg-error/10 text-error line-through" : "border-line bg-panel text-ink",
                            )}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {manual.length > 0 && (
          <p className="text-xs text-ink-dim">
            Гараар бүртгэсэн: {manual.map((m) => m.manualTitle).filter(Boolean).join(", ")}
          </p>
        )}

        {adding ? (
          <div className="rounded-xl border border-line p-3">
            <TestPicker
              classroomId={e.classroomId}
              date={date}
              selected={rows.map((r) => r.testId)}
              keepIds={rows.map((r) => r.testId)}
              onChange={(ids) =>
                setRows((list) => ids.map((id) => list.find((r) => r.testId === id) ?? { testId: id, excluded: [] }))
              }
            />
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={cn(chip, "border-dashed border-line text-ink-dim hover:border-brand hover:text-ink")}>
            <Plus className="size-4" aria-hidden />
            Тест нэмэх
          </button>
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        {error && (
          <p role="alert" className="w-full rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
        {e.record &&
          (undoArmed ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-error">Батламжийг цуцлах уу?</span>
              <button type="button" onClick={unconfirm} disabled={busy} className={cn(chip, "border-error bg-error text-on-error")}>
                Тийм
              </button>
              <button type="button" onClick={() => setUndoArmed(false)} className={cn(chip, "border-line bg-panel")}>
                Үгүй
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setUndoArmed(true)} className={cn(chip, "border-error/40 text-error hover:bg-error/10")}>
              <Undo2 className="size-4" aria-hidden />
              Батламж цуцлах
            </button>
          ))}
        <button type="button" onClick={onClose} className={cn(chip, "ml-auto border-line bg-panel text-ink")}>
          Болих
        </button>
        <button type="button" onClick={confirm} disabled={busy} className={cn(chip, "border-success bg-success text-on-success")}>
          <BadgeCheck className="size-4" aria-hidden />
          {e.record ? "Шинэчлэх" : "Батлах"}
        </button>
      </footer>
    </div>
  );
}

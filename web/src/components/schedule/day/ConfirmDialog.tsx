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

/** Батлахад бичих тайлбарын дээд урт — API-ийн DESCRIPTION_MAX-тай ижил */
const DESCRIPTION_MAX = 1000;

/**
 * «1-12, 15, 20» → [1..12, 15, 20] (API lesson-records.logic.parseProblemNumbers-тэй
 * ижил дүрэм). Танигдахгүй бол null — бичвэр нь хэвээр хадгалагдана.
 */
function parseProblemNumbers(text: string): number[] | null {
  const parts = text.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const out = new Set<number>();
  for (const part of parts) {
    const m = part.match(/^(\d{1,3})(?:[-\u2013\u2014](\d{1,3}))?$/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : Number(m[2]);
    if (a < 1 || b < a) return null;
    for (let n = a; n <= b; n++) out.add(n);
    if (out.size > 500) return null;
  }
  return [...out].sort((x, y) => x - y);
}

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
  // Багшийн бичих нэмэлт (эзэн 2026-10-27): чөлөөт сэдэв, тайлбар, бодсон бодлогын дугаар
  // Олон сэдэв (эзэн 2026-10-31): батлаагүй бол төлөвлөгөөний сэдвүүдээр эхэлнэ; бичлэгт таслалаар нэг мөр
  const [topics, setTopics] = useState<string[]>(
    e.record
      ? e.record.topic && e.record.topic !== e.topic
        ? [e.record.topic]
        : []
      : (e.plan?.customTopics ?? []),
  );
  const topic = topics.join(", ").slice(0, 200);
  const [description, setDescription] = useState(e.record?.description ?? "");
  const [numbers, setNumbers] = useState(e.record?.problemNumbersText ?? "");
  const parsedNumbers = parseProblemNumbers(numbers);
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
        body: {
          date,
          tests: rows.map((r) => ({ testId: r.testId, excludedProblemIds: r.excluded })),
          topic: topic.trim() || null,
          description: description.trim() || null,
          problemNumbers: numbers.trim() || null,
        },
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
              formatMinutes(e.startMinute),
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
          <div className="space-y-2 rounded-xl border border-line p-3">
            <h4 className="text-xs font-bold text-ink-dim">Орох тест</h4>
            <TestPicker
              classroomId={e.classroomId}
              date={date}
              selected={rows.map((r) => r.testId)}
              keepIds={rows.map((r) => r.testId)}
              onChange={(ids) =>
                setRows((list) => ids.map((id) => list.find((r) => r.testId === id) ?? { testId: id, excluded: [] }))
              }
              customTopics={topics}
              onCustomTopicsChange={setTopics}
              hideChips
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setAdding(true)} className={cn(chip, "border-dashed border-line text-ink-dim hover:border-brand hover:text-ink")}>
              <Plus className="size-4" aria-hidden />
              Тест, сэдэв нэмэх
            </button>
            {topics.length > 0 && (
              <span className="min-w-0 truncate text-sm text-ink">
                Сэдэв: <span className="font-semibold">{topic}</span>
              </span>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor={`confirm-numbers-${e.scheduleId}`} className="text-xs font-bold text-ink-dim">
            Бодсон бодлогын дугаар
          </label>
          <input
            id={`confirm-numbers-${e.scheduleId}`}
            value={numbers}
            maxLength={200}
            onChange={(ev) => setNumbers(ev.target.value)}
            onKeyDown={(ev) => ev.key === "Enter" && ev.preventDefault()}
            placeholder="Жишээ нь 1-12, 15, 20"
            inputMode="text"
            autoComplete="off"
            aria-describedby={`confirm-numbers-hint-${e.scheduleId}`}
            className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
          />
          <p id={`confirm-numbers-hint-${e.scheduleId}`} className="text-xs text-ink-dim">
            {!numbers.trim()
              ? "Заавал биш — муж, таслалаар бичнэ"
              : parsedNumbers
                ? `${parsedNumbers.length} бодлого`
                : "Тоогоор задлах боломжгүй — бичсэнээр нь хадгална"}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`confirm-desc-${e.scheduleId}`} className="text-xs font-bold text-ink-dim">
            Тайлбар
          </label>
          <textarea
            id={`confirm-desc-${e.scheduleId}`}
            value={description}
            maxLength={DESCRIPTION_MAX}
            rows={3}
            onChange={(ev) => setDescription(ev.target.value.slice(0, DESCRIPTION_MAX))}
            placeholder="Хичээлд юу хийснийг товч бичнэ"
            className="w-full resize-y rounded-lg border border-line bg-bg p-2.5 text-sm"
          />
        </div>
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

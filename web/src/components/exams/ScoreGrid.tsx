"use client";

import { memo, useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, CheckCheck, Download, FileSpreadsheet, Lock, LockOpen, Save, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import PresenceBadge from "@/components/presence/PresenceBadge";
import { usePresence } from "@/hooks/usePresence";
import ExamDialog from "./ExamDialog";
import ExcelImportDialog, { type ImportedRow } from "./ExcelImportDialog";
import {
  draftFromBase,
  draftFromRow,
  fullName,
  isZero,
  parsePaste,
  sameDraft,
  scopedItems,
  totalsOf,
  type RowDraft,
} from "./gradebook";
import {
  downloadBase64,
  errorText,
  percent,
  type Gradebook,
  type GradebookItem,
  type GradebookRow,
  type SaveResult,
} from "./types";

/* ============================================================================
 * Дүн шивэх тор (SHALGALT-TOLOVLOGOO §2) — эзний Excel-тэй ижил:
 *   ХООСОН = зөв, 0 = буруу · нүд дээр дарах эсвэл 0/Space · сум/Tab/Enter
 *   Excel-ээс блок хуулж буулгах · Ирээгүй · нийт, % шууд · сурагч бүр тусдаа
 *   хадгалагдана · онлайнаар өгсөн мөр түгжээтэй (Багш+ шалтгаантай засна)
 *   Олон багш зэрэг: ачаалсан төлвөө (base) илгээж зөвхөн өөрчилсөн нүдээ бичнэ —
 *   бусдын тэр хооронд оруулсан нүд хэвээр (ZEREG-ZASVAR §3).
 * ========================================================================== */

type Editable = "yes" | "locked" | "progress";

function editableOf(row: GradebookRow, unlocked: boolean): Editable {
  if (row.lock === "IN_PROGRESS") return "progress";
  if (row.lock === "ONLINE" && !unlocked) return "locked";
  return "yes";
}

export default function ScoreGrid({
  testId,
  book,
  onSaved,
  onClose,
  openImport = false,
}: {
  testId: string;
  book: Gradebook;
  onSaved: () => void;
  onClose: () => void;
  openImport?: boolean;
}) {
  const classroomId = book.classroomId!;
  const items = book.items;
  const presenceKey = `grades:${testId}:${classroomId}`;
  const presence = usePresence([presenceKey]);
  const firstPart2 = items.findIndex((i) => i.part === 2);
  const base = useMemo(
    () => Object.fromEntries(book.rows.map((row) => [row.studentId, draftFromRow(row)])) as Record<string, RowDraft>,
    [book.rows],
  );
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(openImport);
  const [reasonFor, setReasonFor] = useState<GradebookRow | null>(null);
  const [reason, setReason] = useState("");
  const [confirmExit, setConfirmExit] = useState(false);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const active = useRef<{ r: number; c: number }>({ r: 0, c: 0 });

  const draftOf = useCallback((row: GradebookRow) => drafts[row.studentId] ?? base[row.studentId], [drafts, base]);
  const isDirty = useCallback(
    (row: GradebookRow) => {
      const d = drafts[row.studentId];
      if (!d) return false;
      const entered = !!row.result || row.absent;
      return !entered || !sameDraft(d, base[row.studentId]);
    },
    [drafts, base],
  );
  const dirtyRows = book.rows.filter(isDirty);

  const update = useCallback(
    (row: GradebookRow, change: (d: RowDraft) => RowDraft) => {
      setDrafts((prev) => {
        const current = prev[row.studentId] ?? draftFromBase(base[row.studentId]);
        return { ...prev, [row.studentId]: change({ ...current, wrong: new Set(current.wrong) }) };
      });
      setRowErrors((prev) => {
        if (!prev[row.studentId]) return prev;
        const next = { ...prev };
        delete next[row.studentId];
        return next;
      });
    },
    [base],
  );

  const cellEditable = useCallback(
    (row: GradebookRow, item: GradebookItem) => {
      if (editableOf(row, !!unlocked[row.studentId]) !== "yes") return false;
      if (draftOf(row).absent) return false;
      return scopedItems(row, items).some((i) => i.key === item.key);
    },
    [unlocked, draftOf, items],
  );

  const setCell = useCallback(
    (r: number, c: number, wrong: boolean | "toggle") => {
      const row = book.rows[r];
      const item = items[c];
      if (!row || !item || !cellEditable(row, item)) return;
      update(row, (d) => {
        const isWrong = wrong === "toggle" ? !d.wrong.has(item.key) : wrong;
        if (isWrong) d.wrong.add(item.key);
        else d.wrong.delete(item.key);
        return d;
      });
    },
    [book.rows, items, cellEditable, update],
  );

  const focusCell = useCallback(
    (r: number, c: number) => {
      const rr = Math.max(0, Math.min(book.rows.length - 1, r));
      const cc = Math.max(0, Math.min(items.length - 1, c));
      active.current = { r: rr, c: cc };
      cellRefs.current.get(`${rr}:${cc}`)?.focus();
    },
    [book.rows.length, items.length],
  );

  const onCellKey = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, r: number, c: number) => {
      const lastC = items.length - 1;
      switch (e.key) {
        case "ArrowRight":
          focusCell(r, c + 1);
          break;
        case "ArrowLeft":
          focusCell(r, c - 1);
          break;
        case "ArrowDown":
        case "Enter":
          focusCell(r + 1, c);
          break;
        case "ArrowUp":
          focusCell(r - 1, c);
          break;
        case "Tab":
          if (e.shiftKey) {
            if (r === 0 && c === 0) return;
            focusCell(c === 0 ? r - 1 : r, c === 0 ? lastC : c - 1);
          } else {
            if (r === book.rows.length - 1 && c === lastC) return;
            focusCell(c === lastC ? r + 1 : r, c === lastC ? 0 : c + 1);
          }
          break;
        case "0":
          setCell(r, c, true);
          focusCell(r, c + 1);
          break;
        case " ":
          setCell(r, c, "toggle");
          break;
        case "Backspace":
        case "Delete":
          setCell(r, c, false);
          break;
        default:
          return;
      }
      e.preventDefault();
    },
    [items.length, book.rows.length, focusCell, setCell],
  );

  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    const block = parsePaste(text);
    const { r: r0, c: c0 } = active.current;
    let changed = 0;
    const next = { ...drafts };
    block.forEach((cells, dr) => {
      const row = book.rows[r0 + dr];
      if (!row) return;
      const current = next[row.studentId] ?? draftFromBase(base[row.studentId]);
      const d: RowDraft = { ...current, wrong: new Set(current.wrong) };
      let touched = false;
      cells.forEach((value, dc) => {
        const item = items[c0 + dc];
        if (!item || !cellEditable(row, item)) return;
        if (isZero(value)) d.wrong.add(item.key);
        else d.wrong.delete(item.key);
        touched = true;
        changed += 1;
      });
      if (touched) next[row.studentId] = d;
    });
    setDrafts(next);
    if (changed) toast.success(`${changed} нүд буулгалаа`);
    else toast.error("Буулгах боломжтой нүд алга — онлайн, ирээгүй мөрийг алгасна");
  }

  function applyImport(rows: ImportedRow[]) {
    const next = { ...drafts };
    let applied = 0;
    for (const r of rows) {
      const row = book.rows.find((x) => x.studentId === r.studentId);
      if (!row || editableOf(row, !!unlocked[row.studentId]) !== "yes") continue;
      next[r.studentId] = { wrong: new Set(r.wrong), absent: r.absent, fromExcel: true };
      applied += 1;
    }
    setDrafts(next);
    toast.success(`${applied} сурагчийн дүн хүснэгтэд буулаа — шалгаад «Хадгалах» дарна уу`);
  }

  async function save() {
    if (dirtyRows.length === 0) return;
    setSaving(true);
    const errors: Record<string, string> = {};
    let saved = 0;
    let merged = 0;
    try {
      for (const fromExcel of [false, true]) {
        const rows = dirtyRows
          .filter((row) => !!drafts[row.studentId]?.fromExcel === fromExcel)
          .map((row) => {
            const d = drafts[row.studentId];
            // Ноорог анх үүссэн үеийн төлөв (тор дахин ачаалагдсан ч өөрчлөгдөхгүй)
            const loaded = d.loaded ?? base[row.studentId];
            return {
              studentId: row.studentId,
              absent: d.absent,
              wrong: d.absent ? [] : [...d.wrong],
              ...(unlocked[row.studentId] ? { reason: unlocked[row.studentId] } : {}),
              // Гар шивэлт: ачаалсан төлөв — сервер зөвхөн өөрчилсөн нүдийг бичнэ.
              // Excel импорт мөрийг бүхэлд нь солино (base илгээхгүй).
              ...(fromExcel ? {} : { base: { wrong: [...loaded.wrong], absent: loaded.absent } }),
            };
          });
        if (rows.length === 0) continue;
        const res = await api<SaveResult>(`/exams/${encodeURIComponent(testId)}/gradebook`, {
          method: "PUT",
          body: { classroomId, source: fromExcel ? "EXCEL" : "MANUAL", rows },
        });
        for (const r of res.results) {
          if (r.ok) {
            saved += 1;
            if (r.merged) merged += 1;
          } else errors[r.studentId] = r.error;
        }
      }
    } catch (e) {
      toast.error(errorText(e, "Хадгалж чадсангүй"));
      setSaving(false);
      return;
    }
    setRowErrors(errors);
    setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => errors[id])));
    setUnlocked((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => errors[id])));
    setSaving(false);
    const failed = Object.keys(errors).length;
    if (saved)
      toast.success(`${saved} сурагчийн дүн хадгалагдлаа`, {
        ...(merged
          ? { description: `${merged} сурагчийн мөрөнд өөр багшийн тэр хооронд оруулсан нүд хэвээр үлдлээ` }
          : {}),
      });
    if (failed) toast.error(`${failed} сурагчийн дүн хадгалагдсангүй — мөрөн дээрх тайлбарыг үзнэ үү`);
    onSaved();
  }

  async function exportExcel() {
    try {
      downloadBase64(
        await api<{ filename: string; mime: string; base64: string }>(
          `/exams/${encodeURIComponent(testId)}/gradebook/excel?classroomId=${encodeURIComponent(classroomId)}`,
        ),
      );
    } catch (e) {
      toast.error(errorText(e, "Excel татаж чадсангүй"));
    }
  }

  const className = book.classes.find((c) => c.id === classroomId)?.name ?? "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => (dirtyRows.length ? setConfirmExit(true) : onClose())}
        >
          <ArrowLeft aria-hidden /> Жагсаалт
        </Button>
        <span className="font-bold text-ink">{className}</span>
        <span className="text-sm text-ink-dim">Хоосон = зөв, 0 = буруу</span>
        <PresenceBadge editors={presence[presenceKey]} verb="дүн оруулж байна" />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" type="button" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet aria-hidden /> Excel оруулах
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={() => void exportExcel()}>
            <Download aria-hidden /> Excel татах
          </Button>
          <Button size="sm" type="button" disabled={saving || dirtyRows.length === 0} onClick={() => void save()}>
            <Save aria-hidden /> {saving ? "Хадгалж байна" : `Хадгалах${dirtyRows.length ? ` (${dirtyRows.length})` : ""}`}
          </Button>
        </div>
      </div>

      {confirmExit && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">{dirtyRows.length} сурагчийн дүн хадгалагдаагүй байна.</span>
          <Button size="sm" variant="ghost" type="button" onClick={() => setConfirmExit(false)}>
            Үргэлжлүүлэх
          </Button>
          <Button size="sm" variant="danger" type="button" onClick={onClose}>
            Хадгалахгүй гарах
          </Button>
        </div>
      )}

      {book.rows.length === 0 ? (
        <p className="rounded-xl border border-line p-4 text-sm text-ink-dim">Энэ ангид идэвхтэй сурагч алга.</p>
      ) : (
        <div
          className="max-h-[70vh] overflow-auto rounded-xl border border-line bg-surface"
          onPaste={onPaste}
        >
          <table className="border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 min-w-[9.5rem] border-b border-r border-line bg-panel px-2 py-1.5 text-left text-xs font-semibold text-ink-dim sm:min-w-[12rem]">
                  Сурагч
                </th>
                <th className="sticky top-0 z-20 border-b border-line bg-panel px-2 py-1.5 text-right text-xs font-semibold text-ink-dim">
                  Оноо
                </th>
                <th className="sticky top-0 z-20 border-b border-r border-line bg-panel px-2 py-1.5 text-right text-xs font-semibold text-ink-dim">
                  %
                </th>
                {items.map((item, c) => (
                  <th
                    key={item.key}
                    scope="col"
                    title={item.part === 2 ? `2-р хэсэг, ${item.label}` : `${item.label}-р бодлого`}
                    className={cn(
                      "sticky top-0 z-20 border-b border-line bg-panel px-0 py-1.5 text-center text-[11px] font-bold tabular-nums text-ink",
                      c === firstPart2 && "border-l-2 border-l-brand-bright/50",
                      item.part === 2 && "bg-brand-bright/10",
                    )}
                  >
                    {item.label}
                  </th>
                ))}
                <th className="sticky top-0 z-20 border-b border-l border-line bg-panel px-2 py-1.5 text-xs font-semibold text-ink-dim">
                  Ирээгүй
                </th>
              </tr>
              <tr>
                <th className="sticky left-0 top-[30px] z-30 border-b border-r border-line bg-surface px-2 py-1 text-left text-[11px] font-medium text-ink-dim">
                  Оноо (жин)
                </th>
                <th className="sticky top-[30px] z-20 border-b border-line bg-surface px-2 py-1 text-right text-xs font-bold tabular-nums text-ink">
                  {book.test.maxScore}
                </th>
                <th className="sticky top-[30px] z-20 border-b border-r border-line bg-surface px-2 py-1" />
                {items.map((item, c) => (
                  <th
                    key={item.key}
                    className={cn(
                      "sticky top-[30px] z-20 border-b border-line bg-surface py-1 text-center text-[11px] font-medium tabular-nums text-ink-dim",
                      c === firstPart2 && "border-l-2 border-l-brand-bright/50",
                    )}
                  >
                    {item.points}
                  </th>
                ))}
                <th className="sticky top-[30px] z-20 border-b border-l border-line bg-surface" />
              </tr>
            </thead>
            <tbody>
              {book.rows.map((row, r) => (
                <GridRow
                  key={row.studentId}
                  r={r}
                  row={row}
                  items={items}
                  firstPart2={firstPart2}
                  draft={draftOf(row)}
                  dirty={isDirty(row)}
                  touched={!!drafts[row.studentId]}
                  editable={editableOf(row, !!unlocked[row.studentId])}
                  canOverride={book.canOverrideOnline}
                  error={rowErrors[row.studentId]}
                  cellRefs={cellRefs}
                  onFocusCell={(c) => (active.current = { r, c })}
                  onCellKey={onCellKey}
                  onToggle={(c) => setCell(r, c, "toggle")}
                  onAbsent={(absent) => update(row, (d) => ({ ...d, absent }))}
                  onAllCorrect={() => update(row, (d) => ({ ...d, wrong: new Set(), absent: false }))}
                  onUnlock={() => {
                    setReason("");
                    setReasonFor(row);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        testId={testId}
        classroomId={classroomId}
        onApply={applyImport}
      />

      <ExamDialog
        open={!!reasonFor}
        onOpenChange={(o) => !o && setReasonFor(null)}
        title="Онлайн дүнг засах"
        description={reasonFor ? `${fullName(reasonFor)} онлайнаар өгсөн. Шалтгаан аудитад бичигдэнэ.` : undefined}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setReasonFor(null)}>
              Болих
            </Button>
            <Button
              type="button"
              disabled={reason.trim().length < 3}
              onClick={() => {
                if (!reasonFor) return;
                setUnlocked((prev) => ({ ...prev, [reasonFor.studentId]: reason.trim() }));
                setReasonFor(null);
              }}
            >
              <LockOpen aria-hidden /> Засахыг нээх
            </Button>
          </>
        }
      >
        <label className="block text-sm font-semibold text-ink" htmlFor="override-reason">
          Шалтгаан
        </label>
        <textarea
          id="override-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-brand"
        />
      </ExamDialog>
    </div>
  );
}

const GridRow = memo(function GridRow({
  r,
  row,
  items,
  firstPart2,
  draft,
  dirty,
  touched,
  editable,
  canOverride,
  error,
  cellRefs,
  onFocusCell,
  onCellKey,
  onToggle,
  onAbsent,
  onAllCorrect,
  onUnlock,
}: {
  r: number;
  row: GradebookRow;
  items: GradebookItem[];
  firstPart2: number;
  draft: RowDraft;
  dirty: boolean;
  touched: boolean;
  editable: Editable;
  canOverride: boolean;
  error?: string;
  cellRefs: { current: Map<string, HTMLButtonElement> };
  onFocusCell: (c: number) => void;
  onCellKey: (e: KeyboardEvent<HTMLButtonElement>, r: number, c: number) => void;
  onToggle: (c: number) => void;
  onAbsent: (absent: boolean) => void;
  onAllCorrect: () => void;
  onUnlock: () => void;
}) {
  const scope = scopedItems(row, items);
  const scopeKeys = new Set(scope.map((i) => i.key));
  const entered = !!row.result || row.absent || touched;
  const totalOnly = !!row.result && !row.marks && !touched;
  const t = totalsOf(scope, draft.wrong);
  const total = draft.absent ? null : totalOnly ? row.result!.totalScore : entered ? t.total : null;
  const max = totalOnly ? row.result!.maxScore : t.max;
  const name = fullName(row);
  const short = `${row.firstName} ${row.lastName.slice(0, 1)}${row.lastName ? "." : ""}`;
  const muted = editable !== "yes" || draft.absent;

  return (
    <tr className={cn(dirty && "bg-warning/5")}>
      <th
        scope="row"
        title={name}
        className={cn(
          "sticky left-0 z-10 border-b border-r border-line px-2 py-1 text-left font-semibold text-ink",
          dirty ? "bg-warning/10" : "bg-surface",
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-5 shrink-0 text-right text-xs tabular-nums text-ink-dim">{r + 1}</span>
          <span className="min-w-0 flex-1 truncate">{short}</span>
          {editable === "locked" &&
            (canOverride ? (
              <button
                type="button"
                onClick={onUnlock}
                aria-label={`${name} — онлайн дүнг засахыг нээх`}
                title="Онлайнаар өгсөн — засах"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
              >
                <Lock className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <Lock className="h-4 w-4 shrink-0 text-ink-dim" aria-label="Онлайнаар өгсөн" />
            ))}
          {row.lock === "ONLINE" && editable === "yes" && (
            <LockOpen className="h-4 w-4 shrink-0 text-warning" aria-label="Онлайн дүнг засаж байна" />
          )}
        </div>
        {editable === "progress" && <Badge tone="info">Өгч байна</Badge>}
        {totalOnly && <Badge tone="neutral">Зөвхөн нийт оноо</Badge>}
        {error && (
          <p role="alert" className="mt-0.5 max-w-[12rem] whitespace-normal text-[11px] font-medium text-error">
            {error}
          </p>
        )}
      </th>
      <td className="border-b border-line px-2 py-1 text-right font-bold tabular-nums text-ink">
        {total !== null ? (
          total
        ) : draft.absent ? (
          <span className="text-xs font-medium text-ink-dim">-</span>
        ) : editable === "yes" ? (
          <button
            type="button"
            onClick={onAllCorrect}
            aria-label={`${name} — бүгд зөв гэж оруулах`}
            title="Бүгд зөв гэж оруулах"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim hover:bg-success/10 hover:text-success focus-visible:outline-2 focus-visible:outline-brand"
          >
            <CheckCheck className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <span className="text-ink-dim">-</span>
        )}
      </td>
      <td className="border-b border-r border-line px-2 py-1 text-right tabular-nums text-ink-dim">
        {total !== null ? `${percent(total, max)}%` : ""}
      </td>
      {items.map((item, c) => {
        const inScope = scopeKeys.has(item.key);
        const wrong = draft.wrong.has(item.key);
        const blankOnline = row.marks?.[item.key] === "BLANK" && wrong;
        const canEdit = editable === "yes" && !draft.absent && inScope;
        return (
          <td
            key={item.key}
            className={cn(
              "border-b border-line p-0 text-center",
              c === firstPart2 && "border-l-2 border-l-brand-bright/50",
            )}
          >
            <button
              type="button"
              ref={(el) => {
                if (el) cellRefs.current.set(`${r}:${c}`, el);
                else cellRefs.current.delete(`${r}:${c}`);
              }}
              tabIndex={r === 0 && c === 0 ? 0 : -1}
              aria-disabled={!canEdit}
              aria-label={`${name}, ${item.label}: ${!inScope ? "дүгнэгдээгүй" : wrong ? "0" : "зөв"}`}
              title={blankOnline ? "Хариулаагүй" : undefined}
              onFocus={() => onFocusCell(c)}
              onKeyDown={(e) => onCellKey(e, r, c)}
              onClick={() => canEdit && onToggle(c)}
              className={cn(
                "h-11 w-11 font-mono text-sm font-bold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-bright sm:h-9 sm:w-9",
                !inScope && "cursor-not-allowed text-ink-dim/50",
                inScope && wrong && "bg-error/15 text-error",
                inScope && wrong && blankOnline && "bg-error/8 text-error/70",
                canEdit ? "hover:bg-ink/5" : "cursor-default",
                muted && inScope && "opacity-60",
              )}
            >
              {!inScope ? "-" : wrong ? "0" : ""}
            </button>
          </td>
        );
      })}
      <td className="border-b border-l border-line px-2 py-1 text-center">
        <input
          type="checkbox"
          checked={draft.absent}
          disabled={editable !== "yes" || row.lock === "ONLINE"}
          onChange={(e) => onAbsent(e.target.checked)}
          aria-label={`${name} — ирээгүй`}
          className="h-5 w-5 accent-brand-bright"
        />
      </td>
    </tr>
  );
});

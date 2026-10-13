"use client";

import { useRef, useState } from "react";
import { ChevronRight, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import MathText from "@/components/MathText";
import ProblemFigure from "@/components/ProblemFigure";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import { useUndoable, useUnsavedGuard } from "@/hooks/useUndoable";
import { versionConflictOf, type VersionConflict } from "@/lib/revisions";
import UndoRedoButtons from "@/components/history/UndoRedoButtons";
import ConflictDialog from "@/components/history/ConflictDialog";
import { showSavedToast } from "@/components/history/saveToast";
import { errorText, type ExamSettings, type ScoringGroup } from "./types";

type FillProblem = ExamSettings["problems"][number];

/**
 * 2-р хэсгийн нэг бодлогын алхмын багц: шошго (2-1), аль нүднүүд, оноо.
 * Нийлбэр бодлогын оноотой тэнцэх ёстой (тэнцэхгүй бол улаанаар, хадгалахгүй).
 * Онлайн: багцын бүх нүд зөв → бүтэн оноо, нэг нь буруу → 0.
 *
 * Буцаах (docs/v2/BUTSAAH-TUUKH-TOLOVLOGOO.md): ↶ ↷ товч, Cmd+Z / Ctrl+Z (энэ
 * хэсэгт фокус эсвэл сүүлд дарсан үед — хуудсанд хэд хэдэн засварлагч бий),
 * хадгалаагүй үед хуудаснаас гарахад асууна, expectedVersion → 409.
 */
export default function ScoringGroupsEditor({
  testId,
  problem,
  partIndex,
  canEdit,
  locked,
  onSaved,
  onReload,
}: {
  testId: string;
  problem: FillProblem;
  /** 2-р хэсгийн хэд дэх бодлого (1-4) — шошгоны санал «k-j» */
  partIndex: number;
  canEdit: boolean;
  locked: boolean;
  onSaved: (next: ExamSettings) => void;
  /** 409 «Шинэчлэх» / буцаасны дараа тохиргоог дахин ачаалах */
  onReload?: () => void;
}) {
  const letters = problem.letters ?? [];
  // [a]… тэмдэглэгээгүй (Word импорт) бодлого: багц зөвхөн шошго, оноотой —
  // гар/Excel шивэлтэд; онлайнаар бодлого бүхэлдээ дүгнэгдэнэ.
  const boxless = letters.length === 0;
  const initial: ScoringGroup[] = problem.groups?.length
    ? problem.groups
    : [
        {
          label: `${partIndex}-1`,
          boxes: [...letters],
          points: problem.points,
        },
      ];
  const scopeRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<{ info: VersionConflict; next: ScoringGroup[] | null } | null>(null);
  const editable = canEdit && !locked;
  const history = useUndoable<ScoringGroup[]>(initial, {
    scopeRef,
    shortcuts: editable && !conflict,
  });
  const groups = history.value;
  const setGroups = history.set;
  const dirty = history.dirty;
  useUnsavedGuard(editable && dirty, "scoring-groups");

  const sum = groups.reduce(
    (s, g) => s + (Number.isFinite(g.points) ? g.points : 0),
    0,
  );
  const used = new Set(groups.flatMap((g) => g.boxes));
  const missing = letters.filter((l) => !used.has(l));
  const labels = groups.map((g) => g.label.trim());
  const labelError =
    labels.some((l) => !l) || new Set(labels).size !== labels.length;
  const valid =
    sum === problem.points &&
    missing.length === 0 &&
    !labelError &&
    (boxless || groups.every((g) => g.boxes.length > 0));

  function toggleBox(index: number, letter: string) {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i === index) {
          return g.boxes.includes(letter)
            ? { ...g, boxes: g.boxes.filter((b) => b !== letter) }
            : {
                ...g,
                boxes: letters.filter(
                  (l) => l === letter || g.boxes.includes(l),
                ),
              };
        }
        // нэг нүд нэг л багцад
        return { ...g, boxes: g.boxes.filter((b) => b !== letter) };
      }),
    );
  }

  /** overwrite — 409-ийн дараа «Миний хувилбарыг хадгалах»: зөрчилтэй талбарт миний утга */
  async function save(next: ScoringGroup[] | null, overwrite = false) {
    const base = problem.version;
    setBusy(true);
    try {
      const res = await api<ExamSettings>(
        `/exams/${encodeURIComponent(testId)}/scoring-groups`,
        {
          method: "PATCH",
          body: {
            problemId: problem.problemId,
            groups:
              next?.map((g) => ({
                label: g.label.trim(),
                boxes: g.boxes,
                points: g.points,
              })) ?? null,
            ...(base !== undefined ? { expectedVersion: base } : {}),
            ...(overwrite ? { overwrite: true } : {}),
          },
        },
      );
      setConflict(null);
      const savedVersion = res.problems.find((p) => p.problemId === problem.problemId)?.version;
      if (base !== undefined && savedVersion !== undefined) {
        showSavedToast({
          entity: "PROBLEM",
          id: problem.problemId,
          previousVersion: base,
          savedVersion,
          changed: res.saved?.changed,
          mergedWith: res.saved?.mergedWith,
          onUndone: () => onReload?.(),
        });
      } else {
        toast.success("Алхмын багц хадгалагдлаа");
      }
      history.reset(next ?? initial);
      onSaved(res);
    } catch (e) {
      const info = versionConflictOf(e);
      if (info) setConflict({ info, next });
      else toast.error(errorText(e, "Хадгалж чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={scopeRef} className="space-y-3 rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-ink">
          {problem.order}-р бодлого{" "}
          <span className="text-sm font-normal text-ink-dim">
            {problem.points} оноо
          </span>
        </p>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums",
            sum === problem.points
              ? "bg-success/15 text-success"
              : "bg-error/15 text-error",
          )}
        >
          Нийт {sum}/{problem.points}
        </span>
      </div>

      <details className="group rounded-lg border border-line bg-panel px-3 py-2">
        <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-brand-soft [&::-webkit-details-marker]:hidden">
          <ChevronRight
            className="h-4 w-4 transition-transform group-open:rotate-90"
            aria-hidden
          />{" "}
          Бодлогыг харах
        </summary>
        <div className="mt-2 text-sm">
          <ProblemFigure
            imageKey={problem.imageKey ?? null}
            alt={`${problem.order}-р бодлогын зураг`}
            isStaffView
          >
            <MathText className="block text-ink" showErrorInTeacherView>
              {problem.statementText ?? ""}
            </MathText>
          </ProblemFigure>
        </div>
      </details>

      <ul className="space-y-2">
        {groups.map((g, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`g-${problem.problemId}-${i}`}>
              Багцын шошго
            </label>
            <input
              id={`g-${problem.problemId}-${i}`}
              value={g.label}
              disabled={!editable}
              maxLength={12}
              onChange={(e) =>
                setGroups(
                  (prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x,
                    ),
                  { coalesceKey: `label-${i}` },
                )
              }
              onBlur={history.commitGroup}
              className="h-11 w-16 rounded-lg border border-line bg-surface px-2 text-center font-bold text-ink focus-visible:outline-2 focus-visible:outline-brand"
            />
            {!boxless && (
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label={`${g.label} багцын нүднүүд`}
              >
                {letters.map((letter) => {
                  const on = g.boxes.includes(letter);
                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={!editable}
                      aria-pressed={on}
                      onClick={() => toggleBox(i, letter)}
                      className={cn(
                        "h-11 w-9 rounded-lg border font-mono text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-brand sm:h-9",
                        on
                          ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                          : "border-line text-ink-dim",
                      )}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            )}
            <label className="sr-only" htmlFor={`p-${problem.problemId}-${i}`}>
              Оноо
            </label>
            <input
              id={`p-${problem.problemId}-${i}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={Number.isFinite(g.points) ? g.points : ""}
              disabled={!editable}
              onChange={(e) =>
                setGroups(
                  (prev) =>
                    prev.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            points: Math.max(
                              0,
                              Math.trunc(Number(e.target.value)),
                            ),
                          }
                        : x,
                    ),
                  { coalesceKey: `points-${i}` },
                )
              }
              onBlur={history.commitGroup}
              className="h-11 w-16 rounded-lg border border-line bg-surface px-2 text-center tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-brand"
            />
            <span className="text-xs text-ink-dim">оноо</span>
            {editable && groups.length > 1 && (
              <button
                type="button"
                aria-label={`${g.label} багцыг устгах`}
                onClick={() =>
                  setGroups((prev) => prev.filter((_, j) => j !== i))
                }
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-error hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-brand"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      {boxless && (
        <p className="text-xs text-ink-dim">
          Бодлогод нүдний тэмдэглэгээ алга — багц гар, Excel шивэлтэд л
          хэрэглэгдэнэ.
        </p>
      )}
      {(missing.length > 0 || labelError) && (
        <p role="alert" className="text-sm text-error">
          {missing.length > 0 &&
            `${missing.join(", ")} нүд аль ч багцад ороогүй. `}
          {labelError && "Шошго хоосон эсвэл давхардсан байна."}
        </p>
      )}

      {editable ? (
        <div className="flex flex-wrap items-center gap-2">
          <UndoRedoButtons
            compact
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={history.undo}
            onRedo={history.redo}
          />
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() =>
              setGroups((prev) => [
                ...prev,
                {
                  label: `${partIndex}-${prev.length + 1}`,
                  boxes: [],
                  points: 0,
                },
              ])
            }
          >
            <Plus aria-hidden /> Багц нэмэх
          </Button>
          {dirty && (
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => setGroups(initial)}
            >
              <RotateCcw aria-hidden /> Өөрчлөлтийг болих
            </Button>
          )}
          <Button
            size="sm"
            type="button"
            disabled={!valid || busy || !dirty}
            onClick={() => void save(groups)}
          >
            <Save aria-hidden /> Хадгалах
          </Button>
          {problem.groups && (
            <Button
              size="sm"
              variant="ghost"
              type="button"
              disabled={busy}
              onClick={() => void save(null)}
            >
              Бүхэлд нь нэг багц
            </Button>
          )}
        </div>
      ) : (
        locked &&
        canEdit && (
          <p className="text-xs text-ink-dim">
            Сурагч өгсөн тул алхмын багцыг өөрчлөхгүй.
          </p>
        )
      )}

      <ConflictDialog
        conflict={conflict?.info ?? null}
        busy={busy}
        onClose={() => setConflict(null)}
        onReload={() => {
          setConflict(null);
          onReload?.();
        }}
        onOverwrite={() => conflict && void save(conflict.next, true)}
      />
    </div>
  );
}

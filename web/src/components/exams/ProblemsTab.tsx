"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, CircleCheck, CircleMinus, ListChecks, TriangleAlert } from "lucide-react";
import ProblemClassifyEditor from "@/components/ProblemClassifyEditor";
import InfoHint from "@/components/ui/InfoHint";
import { Badge } from "@/components/ui/kit/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { cn } from "@/lib/cn";
import {
  BAR_FILL,
  correctTone,
  DISCRIMINATION_TEXT,
  invalidateExamAnalytics,
  useExamAnalytics,
  type DiscriminationLabel,
  type ItemAnalytics,
} from "./analytics";
import ClassChips from "./ClassChips";
import { itemName } from "./OverviewTab";
import ProblemDetail from "./ProblemDetail";

const DISC_ICON: Record<DiscriminationLabel, { icon: typeof CircleCheck; tone: "success" | "warning" | "danger" }> = {
  GOOD: { icon: CircleCheck, tone: "success" },
  WEAK: { icon: CircleMinus, tone: "warning" },
  PROBLEM: { icon: TriangleAlert, tone: "danger" },
};

/**
 * «Бодлого» таб (SHALGALT-TOLOVLOGOO §3): зүйл бүрийн зөв хувь, A–E сонголтын
 * тархалт (зөвхөн онлайн хариугаар), ялгах чадвар («Сайн ялгадаг / Сул /
 * Асуудалтай»), 2-р хэсгийн алхмын багц бүрийн хувь. Мөр дээр дарахад бодлого
 * доороо дэлгэрнэ; Багш+/Админ эндээс засна.
 */
export default function ProblemsTab({
  testId,
  classId,
  onClassChange,
  focusKey,
}: {
  testId: string;
  classId: string;
  onClassChange: (id: string) => void;
  /** «Анхаарах бодлого»-оос ирсэн зүйлийн түлхүүр — дэлгээд гүйлгэж харуулна */
  focusKey?: string | null;
}) {
  const { data, error, retry } = useExamAnalytics(testId, classId);
  const [openProblem, setOpenProblem] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const focusRef = useRef<HTMLLIElement | null>(null);

  const problemBy = useMemo(() => new Map((data?.problems ?? []).map((p) => [p.problemId, p])), [data]);
  const part1 = useMemo(() => (data?.items ?? []).filter((i) => i.part === 1), [data]);
  const part2 = useMemo(() => {
    const byProblem = new Map<string, ItemAnalytics[]>();
    for (const item of data?.items ?? []) {
      if (item.part !== 2) continue;
      byProblem.set(item.problemId, [...(byProblem.get(item.problemId) ?? []), item]);
    }
    return [...byProblem.entries()];
  }, [data]);

  // «Анхаарах» мөрнөөс ирвэл тэр бодлогыг дэлгэж харагдах хэсэгт гүйлгэнэ.
  const focusProblem = focusKey && data ? data.items.find((i) => i.key === focusKey)?.problemId ?? null : null;
  useEffect(() => {
    if (!focusProblem) return;
    const t = window.setTimeout(() => {
      setOpenProblem(focusProblem);
      focusRef.current?.scrollIntoView({ behavior: "instant", block: "center" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [focusProblem]);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <LoadingState rows={6} label="Бодлогын анализ ачаалж байна" />;

  const toggle = (problemId: string) => setOpenProblem((p) => (p === problemId ? null : problemId));
  const manualOnly = data.markedStudents - data.onlineStudents;

  const row = (item: ItemAnalytics, indent = false) => {
    const problem = problemBy.get(item.problemId);
    const open = openProblem === item.problemId;
    const isFocus = focusKey === item.key;
    return (
      <li key={item.key} ref={isFocus ? focusRef : undefined} className={cn(indent && "pl-4 sm:pl-8")}>
        <ItemRow item={item} open={open} onToggle={() => toggle(item.problemId)} />
        {open && problem && !item.group && (
          <div className="px-1 pb-3">
            <ProblemDetail problem={problem} onEdit={data.canEditContent ? () => setEditing(problem.problemId) : undefined} />
            {item.discrimination?.label === "PROBLEM" && <ProblemHint />}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <ClassChips chips={data.chips} value={classId} onChange={onClassChange} />

      {data.items.length === 0 ? (
        <EmptyState icon={ListChecks} title="Энэ шалгалтад бодлого алга" />
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-1 text-sm text-ink-dim">
            {data.markedStudents > 0 ? (
              <>
                <span className="font-semibold text-ink">{data.markedStudents}</span> сурагчийн бодлого бүрийн дүнгээр
              </>
            ) : (
              "Бодлого бүрийн дүн хараахан ороогүй"
            )}
            <InfoHint label="Бодлогын анализын тайлбар">
              Зөв хувь: ногоон 70%-иас дээш, шар 40–70%, улаан 40%-иас доош. A–E тархалт зөвхөн онлайнаар өгсөн
              сурагчийн хариугаар — гараар шивсэн дүнд зөвхөн зөв/буруу мэдэгддэг. «Сайн ялгадаг» — сайн сурагчид
              сул сурагчдаас илүү зөв бодсон; «Асуудалтай» — эсрэгээрээ, бодлогыг шалгана уу. Ялгах чадвар 10-аас
              дээш сурагчтай үед бодогдоно.
            </InfoHint>
          </p>
          {manualOnly > 0 && data.onlineStudents > 0 && (
            <p className="text-xs text-ink-dim">
              A–E тархалт: онлайнаар өгсөн {data.onlineStudents} сурагч ({manualOnly} гар шивэлт тооцогдоогүй)
            </p>
          )}

          <section aria-label="I хэсэг">
            <h3 className="mb-1 text-sm font-bold text-ink">I хэсэг</h3>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {part1.map((item) => row(item))}
            </ul>
          </section>

          {part2.length > 0 && (
            <section aria-label="II хэсэг">
              <h3 className="mb-1 text-sm font-bold text-ink">II хэсэг</h3>
              <ul className="space-y-2">
                {part2.map(([problemId, groups]) => {
                  const problem = problemBy.get(problemId);
                  const open = openProblem === problemId;
                  const single = groups.length === 1 && !groups[0].group;
                  return (
                    <li key={problemId} className="overflow-hidden rounded-xl border border-line">
                      {single ? (
                        <ul>{row(groups[0])}</ul>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => toggle(problemId)}
                            className="flex min-h-11 w-full items-center gap-2 bg-panel px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                          >
                            <ChevronRight className={cn("h-4 w-4 text-ink-dim transition-transform", open && "rotate-90")} aria-hidden />
                            {problem?.order ?? groups[0].order}-р бодлого
                            <span className="font-normal text-ink-dim">({groups.length} алхам)</span>
                          </button>
                          <ul className="divide-y divide-line border-t border-line">
                            {groups.map((g) => (
                              <li key={g.key} ref={focusKey === g.key ? focusRef : undefined}>
                                <ItemRow item={g} open={false} onToggle={() => toggle(problemId)} />
                              </li>
                            ))}
                          </ul>
                          {open && problem && (
                            <div className="border-t border-line p-2">
                              <ProblemDetail
                                problem={problem}
                                onEdit={data.canEditContent ? () => setEditing(problem.problemId) : undefined}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      {editing && (
        <ProblemClassifyEditor
          key={editing}
          problemId={editing}
          canEditContent
          onClose={() => setEditing(null)}
          onSaved={() => invalidateExamAnalytics(testId)}
        />
      )}
    </div>
  );
}

function ProblemHint() {
  return (
    <p className="mt-2 flex items-start gap-2 rounded-lg bg-error/10 p-2 text-sm text-error">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      Сайн сурагчид сул сурагчдаас илүү алдсан — бодлогыг шалга (нөхцөл, хариуны түлхүүр).
    </p>
  );
}

function ItemRow({ item, open, onToggle }: { item: ItemAnalytics; open: boolean; onToggle: () => void }) {
  const tone = correctTone(item.percent);
  const disc = item.discrimination?.label ? DISC_ICON[item.discrimination.label] : null;
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className={cn(
        "flex w-full flex-col gap-1.5 px-3 py-2 text-left transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
        open && "bg-brand-bright/5",
      )}
    >
      <span className="flex min-h-8 w-full items-center gap-3">
        <span className="w-11 shrink-0 font-bold tabular-nums text-ink">{itemName(item)}</span>
        <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line/40">
          <span className={cn("block h-full rounded-full", BAR_FILL[tone])} style={{ width: `${item.percent ?? 0}%` }} />
        </span>
        <span className="w-11 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
          {item.percent === null ? "-" : `${item.percent}%`}
        </span>
        <span className="sr-only">
          {item.correct}/{item.marked} зөв
        </span>
        {disc && item.discrimination?.label && (
          <Badge tone={disc.tone} className="hidden sm:inline-flex">
            <disc.icon aria-hidden /> {DISCRIMINATION_TEXT[item.discrimination.label]}
          </Badge>
        )}
        <ChevronRight className={cn("h-4 w-4 shrink-0 text-ink-dim transition-transform", open && "rotate-90")} aria-hidden />
      </span>
      {(item.choices || disc) && (
        <span className="flex flex-wrap items-center gap-1 pl-14">
          {item.choices &&
            Object.entries(item.choices.counts).map(([letter, count]) => {
              const correct = item.choices!.correct === letter;
              const wrongTop = item.choices!.mostWrong?.letter === letter;
              return (
                <span
                  key={letter}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] tabular-nums",
                    correct
                      ? "border-success/50 bg-success/10 font-bold text-success"
                      : wrongTop
                        ? "border-error/40 text-error"
                        : "border-line text-ink-dim",
                  )}
                >
                  {correct && <CircleCheck className="h-3 w-3" aria-label="зөв хариу" />}
                  {letter} {count}
                </span>
              );
            })}
          {item.choices && item.choices.blank > 0 && (
            <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-ink-dim">
              Хоосон {item.choices.blank}
            </span>
          )}
          {disc && item.discrimination?.label && (
            <Badge tone={disc.tone} className="sm:hidden">
              <disc.icon aria-hidden /> {DISCRIMINATION_TEXT[item.discrimination.label]}
            </Badge>
          )}
        </span>
      )}
    </button>
  );
}


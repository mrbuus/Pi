"use client";

import { ArrowRight, CircleCheck, Minus, Plus } from "lucide-react";
import MathText from "@/components/MathText";
import { fileUrl } from "@/lib/api";
import { cn } from "@/lib/cn";
import type {
  ChoiceView,
  DiffEntry,
  ProblemDiffRow,
  ProblemSnapshotView,
  TestSnapshotView,
} from "@/lib/revisions";

/**
 * Хувилбарын ялгаа: «Өмнө» / «Дараа». Бодлогын текст, сонголт LaTeX-ээр
 * (MathText). Өнгө дангаараа утга илэрхийлэхгүй — шошго, дүрс дагалдана (§6.9).
 */

function Empty() {
  return <span className="text-ink-dim">хоосон</span>;
}

function Side({ label, tone, children }: { label: string; tone: "before" | "after"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border px-3 py-2 text-sm",
        tone === "before" ? "border-error/25 bg-error/[0.04]" : "border-success/30 bg-success/[0.05]",
      )}
    >
      <p className="mb-1 text-xs font-semibold text-ink-dim">{label}</p>
      <div className="min-w-0 break-words text-ink">{children}</div>
    </div>
  );
}

function ChoiceLine({ view, label }: { view: ChoiceView; label?: string }) {
  return (
    <div className="min-w-0 text-sm">
      {label && <span className="mr-1 text-xs font-semibold text-ink-dim">{label}</span>}
      <MathText showErrorInTeacherView>{view.text || " "}</MathText>
      {view.isCorrect && (
        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
          <CircleCheck className="h-3.5 w-3.5" aria-hidden /> зөв
        </span>
      )}
      {!view.isCorrect && view.mistake && (
        <span className="ml-2 text-xs text-ink-dim">Алдааны шалтгаан: {view.mistake}</span>
      )}
      {view.note && <span className="ml-2 text-xs text-ink-dim">({view.note})</span>}
    </div>
  );
}

const CHOICE_STATUS: Record<string, string> = {
  added: "Нэмсэн",
  removed: "Хассан",
  changed: "Өөрчилсөн",
};

const PROBLEM_STATUS: Record<ProblemDiffRow["status"], string> = {
  added: "Нэмсэн",
  removed: "Хассан",
  moved: "Дараалал",
  points: "Оноо",
};

function Entry({ entry }: { entry: DiffEntry }) {
  switch (entry.kind) {
    case "math":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Side label="Өмнө" tone="before">
            {entry.before ? <MathText showErrorInTeacherView>{entry.before}</MathText> : <Empty />}
          </Side>
          <Side label="Дараа" tone="after">
            {entry.after ? <MathText showErrorInTeacherView>{entry.after}</MathText> : <Empty />}
          </Side>
        </div>
      );
    case "text":
      return (
        <p className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink">
          <span className="min-w-0 break-words text-ink-dim">{entry.before ?? <Empty />}</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-ink-dim" aria-label="болсон" />
          <span className="min-w-0 break-words font-semibold">{entry.after ?? <Empty />}</span>
        </p>
      );
    case "image":
      return (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Өмнө", key: entry.before, tone: "before" as const },
            { label: "Дараа", key: entry.after, tone: "after" as const },
          ].map((side) => (
            <Side key={side.label} label={side.label} tone={side.tone}>
              {side.key ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl(side.key)}
                  alt={`${side.label} зураг`}
                  className="max-h-32 w-full rounded-md object-contain"
                />
              ) : (
                <span className="text-ink-dim">Зураггүй</span>
              )}
            </Side>
          ))}
        </div>
      );
    case "choices": {
      const changed = entry.rows.filter((r) => r.status !== "same");
      const same = entry.rows.length - changed.length;
      return (
        <div className="space-y-2">
          <ul className="space-y-2">
            {changed.map((row) => (
              <li key={`${row.status}-${row.label}`} className="flex gap-2">
                <span className="mt-0.5 inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg border border-line px-1.5 text-sm font-bold text-ink">
                  {row.label}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-semibold text-ink-dim">{CHOICE_STATUS[row.status]}</p>
                  {row.status === "changed" ? (
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <Side label="Өмнө" tone="before">
                        {row.before && <ChoiceLine view={row.before} />}
                      </Side>
                      <Side label="Дараа" tone="after">
                        {row.after && <ChoiceLine view={row.after} />}
                      </Side>
                    </div>
                  ) : (
                    (row.after ?? row.before) && (
                      <div className={cn(row.status === "removed" && "text-ink-dim line-through decoration-error/50")}>
                        <ChoiceLine view={(row.after ?? row.before)!} />
                      </div>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
          {same > 0 && <p className="text-xs text-ink-dim">Бусад {same} сонголт өөрчлөгдөөгүй.</p>}
        </div>
      );
    }
    case "set":
      return (
        <div className="flex flex-wrap gap-1.5">
          {entry.added.map((name) => (
            <span
              key={`+${name}`}
              className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Нэмсэн:</span>
              {name}
            </span>
          ))}
          {entry.removed.map((name) => (
            <span
              key={`-${name}`}
              className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2.5 py-1 text-xs font-semibold text-error"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Хассан:</span>
              <span className="line-through decoration-error/50">{name}</span>
            </span>
          ))}
        </div>
      );
    case "problems":
      return (
        <ul className="space-y-1.5">
          {entry.rows.map((row, i) => (
            <li key={`${row.status}-${row.order}-${i}`} className="rounded-lg border border-line px-3 py-2 text-sm">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                <span>{row.order}-р бодлого</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                    row.status === "added" && "bg-success/15 text-success",
                    row.status === "removed" && "bg-error/10 text-error",
                    (row.status === "moved" || row.status === "points") && "bg-info/15 text-info",
                  )}
                >
                  {PROBLEM_STATUS[row.status]}
                  {row.status === "moved" && row.beforeOrder !== null && (
                    <>
                      {" "}
                      {row.beforeOrder}
                      <ArrowRight className="h-3 w-3" aria-label="болсон" />
                      {row.order}
                    </>
                  )}
                  {row.status === "points" && row.beforePoints !== null && (
                    <>
                      {" "}
                      {row.beforePoints}
                      <ArrowRight className="h-3 w-3" aria-label="болсон" />
                      {row.points}
                    </>
                  )}
                </span>
              </p>
              {row.statement && (
                <div className="mt-1 line-clamp-2 text-ink-dim">
                  <MathText>{row.statement}</MathText>
                </div>
              )}
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

export default function RevisionDiff({ changes }: { changes: DiffEntry[] }) {
  if (changes.length === 0) {
    return <p className="text-sm text-ink-dim">Өмнөх хувилбартай харьцуулах ялгаа алга.</p>;
  }
  return (
    <dl className="space-y-3">
      {changes.map((entry) => (
        <div key={entry.field} className="space-y-1.5">
          <dt className="text-sm font-bold text-ink">{entry.label}</dt>
          <dd>
            <Entry entry={entry} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Нэг хувилбарын бүрэн агуулга (ID-гүй). */
export function SnapshotView({ snapshot }: { snapshot: ProblemSnapshotView | TestSnapshotView }) {
  if ("statementText" in snapshot) {
    const s = snapshot;
    return (
      <div className="space-y-2 text-sm">
        <p className="text-xs text-ink-dim">
          {s.format}, {s.points} оноо
        </p>
        <div className="text-ink">
          {s.statementText ? <MathText showErrorInTeacherView>{s.statementText}</MathText> : <Empty />}
        </div>
        {s.imageKey && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl(s.imageKey)} alt="Бодлогын зураг" className="max-h-40 rounded-md border border-line object-contain" />
        )}
        {s.choices.length > 0 && (
          <ul className="space-y-1">
            {s.choices.map((c) => (
              <li key={c.label}>
                <ChoiceLine view={c} label={c.label} />
              </li>
            ))}
          </ul>
        )}
        {s.correctAnswer && (
          <p className="text-ink">
            Зөв хариу: <MathText>{s.correctAnswer}</MathText>
          </p>
        )}
        {s.scoringGroups && <p className="text-ink-dim">Алхмын багц: {s.scoringGroups}</p>}
        {s.tags.length > 0 && <p className="text-ink-dim">Ангилал: {s.tags.join(", ")}</p>}
        {s.solution && (
          <div className="text-ink-dim">
            Бодолт: <MathText>{s.solution}</MathText>
          </div>
        )}
      </div>
    );
  }
  const t = snapshot;
  return (
    <div className="space-y-1.5 text-sm text-ink">
      <p className="font-semibold">{t.title}</p>
      <p className="text-ink-dim">
        {t.type}, {t.gradingMode}
        {t.timeLimitMin ? `, ${t.timeLimitMin} минут` : ", хугацаагүй"}
        {t.chapter ? `, ${t.chapter}` : ""}
      </p>
      <p className="text-ink-dim">
        {t.problems.length} бодлого, нийт {t.problems.reduce((s, p) => s + p.points, 0)} оноо
      </p>
      <p className="text-ink-dim">Анги: {t.classes.length ? t.classes.join(", ") : "оноогоогүй"}</p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import MathText from "@/components/MathText";
import ProblemFigure from "@/components/ProblemFigure";
import { Meta, MetaTitle } from "@/components/ui/Meta";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import ExamDialog from "./ExamDialog";
import { errorText, type StudentView } from "./types";

/** Сурагч шалгалтыг яг яаж харахыг — зөв хариу, бодлогын кодгүйгээр. */
export default function StudentViewDialog({
  testId,
  open,
  onOpenChange,
}: {
  testId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<StudentView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || data) return;
    let alive = true;
    api<StudentView>(`/exams/${encodeURIComponent(testId)}/student-view`)
      .then((res) => alive && setData(res))
      .catch((e) => alive && setError(errorText(e, "Ачаалж чадсангүй")));
    return () => {
      alive = false;
    };
  }, [open, data, testId]);

  return (
    <ExamDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Сурагчийн харагдац"
      description={data ? <MetaTitle>{data.title}</MetaTitle> : undefined}
    >
      {error && <ErrorState message={error} />}
      {!data && !error && <LoadingState rows={6} label="Бодлогууд ачаалж байна" />}
      {data && (
        <div className="space-y-4">
          <p className="text-sm text-ink-dim">
            <Meta
              items={[
                `${data.problems.length} бодлого`,
                data.timeLimitMin ? `${data.timeLimitMin} минут` : null,
                `${data.totalPoints} оноо`,
              ]}
            />
          </p>
          <ol className="space-y-4">
            {data.problems.map((p) => (
              <li key={p.n} className="space-y-2 rounded-xl border border-line p-3">
                <p className="font-bold text-ink">
                  {p.n}-р бодлого <span className="text-sm font-medium text-ink-dim">({p.points} оноо)</span>
                </p>
                <ProblemFigure imageKey={p.imageKey} alt={`${p.n}-р бодлогын зураг`}>
                  <MathText className="block text-ink">{p.statementText ?? ""}</MathText>
                </ProblemFigure>
                {p.choices && (
                  <ul className="grid gap-1.5">
                    {p.choices.map((c) => (
                      <li key={c.letter} className="flex items-start gap-3 rounded-lg border border-line px-3 py-2">
                        <span className="font-bold text-ink">{c.letter}</span>
                        {c.text && <MathText className="flex-1 text-ink">{c.text}</MathText>}
                      </li>
                    ))}
                  </ul>
                )}
                {p.slots && p.slots.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3" aria-label="Хариу бичих нүднүүд">
                    {p.slots.map((slot) => (
                      <span key={slot} className="inline-flex items-center gap-1">
                        <span className="font-mono text-xs text-ink-dim">{slot}</span>
                        {slot.split("").map((ch) => (
                          <span key={ch} aria-hidden className="inline-block h-9 w-8 rounded-md border-2 border-dashed border-line" />
                        ))}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </ExamDialog>
  );
}

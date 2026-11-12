"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ScanLine } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { errorText } from "@/components/exams/types";
import { dayText, scoreText, toneOf, type MyPaperExam } from "./types";

/** Сурагчийн «Шалгалт» → «Нэгдсэн шалгалт» таб: өгсөн шалгалт бүрийн оноо, байр. */
export default function StudentPaperExams() {
  const [rows, setRows] = useState<MyPaperExam[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    api<MyPaperExam[]>("/paper-exams/my")
      .then((r) => {
        setError("");
        setRows(r);
      })
      .catch((e) => setError(errorText(e, "Ачаалж чадсангүй")));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!rows) return <SkeletonRows rows={3} />;
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ScanLine}
        title="Нэгдсэн шалгалтын дүн алга"
        hint="Багш дүнг оруулж нээсний дараа энд харагдана."
      />
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/app/paper-exams/${r.id}`} className="chunky surface-interactive flex min-h-11 items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-ink">{r.title}</div>
              <Meta className="mt-1 text-sm text-ink-dim" items={[dayText(r.heldOn), `${r.rank}-р байр, ${r.participants} сурагчаас`]} />
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display text-xl font-bold tabular-nums text-ink">
                {scoreText(r.totalScore)}
                <span className="text-sm font-normal text-ink-dim">/{scoreText(r.maxScore)}</span>
              </div>
              {r.pct !== null && <Badge tone={toneOf(r.pct)}>{r.pct}%</Badge>}
            </div>
            <ChevronRight className="size-4 shrink-0 text-ink-dim" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

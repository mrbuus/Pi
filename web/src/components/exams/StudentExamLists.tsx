"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ClipboardCheck, Hourglass, NotebookPen, Play } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Meta, MetaTitle } from "@/components/ui/Meta";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { collapseVariants, type GroupRow, type TestRow } from "@/components/test-list/types";
import { dateTimeUB } from "@/components/thousand/format";
import { errorText, shortTitle } from "./types";

export interface MyExamRow extends TestRow {
  percent: number | null;
  assignedAt: string | null;
  takenAt: string | null;
  absent: boolean;
  /** Эхлэх огноо ирээдүйд (ачаалсан мөчөөр) */
  upcoming?: boolean;
}

const dateUB = (v: string | null) => (v ? dateTimeUB(v).slice(0, 10) : null);
const titleOf = (row: TestRow) => (row.type === "THOUSAND" ? shortTitle(row.title) : row.title);

/**
 * Сурагчийн «Шалгалт» (SHALGALT-TOLOVLOGOO §4): «Өгөх» — оноогдсон/худалдаж
 * авсан, эхлэх хугацаатай; «Өгсөн» — оноо. A/B хувилбараас сурагч нэгийг л
 * харна (Тест табтай ижил дүрэм).
 */
export default function StudentExamLists({ studentId, query }: { studentId: string | null; query: string }) {
  const [rows, setRows] = useState<MyExamRow[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const { exams } = await api<{ exams: MyExamRow[] }>("/exam-results/my");
      const now = Date.now();
      setRows(exams.map((r) => ({ ...r, upcoming: !!r.assignedAt && Date.parse(r.assignedAt) > now })));
    } catch (e) {
      setError(errorText(e, "Шалгалтын жагсаалт ачаалж чадсангүй"));
    }
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const { toTake, taken } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (rows ?? []).filter((r) => !q || r.title.toLowerCase().includes(q));
    const picked = collapseVariants(
      list.map((row): GroupRow => ({ row, num: null })),
      studentId,
    ).map((g) => g.row as MyExamRow);
    const done = (r: MyExamRow) => r.results!.length > 0 || r.absent || r.sessionStatus === "SUBMITTED";
    return {
      toTake: picked
        .filter((r) => !done(r))
        .sort(
          (a, b) =>
            Number(b.sessionStatus === "IN_PROGRESS") - Number(a.sessionStatus === "IN_PROGRESS") ||
            (b.assignedAt ?? "").localeCompare(a.assignedAt ?? ""),
        ),
      taken: picked.filter(done).sort((a, b) => (b.takenAt ?? "").localeCompare(a.takenAt ?? "")),
    };
  }, [rows, query, studentId]);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!rows) {
    return (
      <div className="space-y-3" role="status" aria-label="Шалгалтууд ачаалж байна">
        {[0, 1, 2].map((i) => (
          <div key={i} aria-hidden className="h-16 animate-pulse chunky" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="exams-to-take" className="space-y-2">
        <h2 id="exams-to-take" className="font-bold text-ink">
          Өгөх <span className="font-normal text-ink-dim">({toTake.length})</span>
        </h2>
        {toTake.length === 0 ? (
          <p className="chunky p-4 text-sm text-ink-dim">Одоогоор өгөх шалгалт алга. Багш оноомогц энд гарна.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden chunky">
            {toTake.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
                    <MetaTitle>{titleOf(r)}</MetaTitle>
                    {r.variantLabel && r.type !== "THOUSAND" && <Badge tone="info">Хувилбар {r.variantLabel}</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-dim">
                    <Meta
                      items={[
                        `${r._count.problems} бодлого`,
                        r.timeLimitMin ? `${r.timeLimitMin} мин` : null,
                        r.assignedAt
                          ? r.upcoming
                            ? `Эхлэх: ${dateTimeUB(r.assignedAt)}`
                            : `Оноосон: ${dateUB(r.assignedAt)}`
                          : null,
                      ]}
                    />
                  </p>
                </div>
                <TakeAction row={r} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="exams-taken" className="space-y-2">
        <h2 id="exams-taken" className="font-bold text-ink">
          Өгсөн <span className="font-normal text-ink-dim">({taken.length})</span>
        </h2>
        {taken.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Өгсөн шалгалт алга" hint="Шалгалт өгмөгц дүн нь энд харагдана." />
        ) : (
          <ul className="divide-y divide-line overflow-hidden chunky">
            {taken.map((r) => {
              const result = r.results?.[0];
              return (
                <li key={r.id}>
                  <Link
                    href={`/app/tests/${r.id}/result`}
                    className="flex min-h-14 items-center gap-3 px-4 py-3 transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">
                        <MetaTitle>{titleOf(r)}</MetaTitle>
                      </span>
                      <span className="block text-xs text-ink-dim">{dateUB(r.takenAt)}</span>
                    </span>
                    {r.absent ? (
                      <Badge tone="neutral">Ирээгүй</Badge>
                    ) : result ? (
                      <span className="shrink-0 text-right tabular-nums">
                        <span className="block font-display text-lg font-bold text-ink">{r.percent}%</span>
                        <span className="block text-xs text-ink-dim">
                          {result.totalScore}/{result.maxScore}
                        </span>
                      </span>
                    ) : (
                      <Badge tone="info">Дүн гараагүй</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function TakeAction({ row }: { row: MyExamRow }) {
  if (row.gradingMode === "MANUAL") {
    return (
      <span className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-line/30 px-3 text-xs text-ink-dim">
        <NotebookPen className="h-3.5 w-3.5" aria-hidden /> Цаасан
      </span>
    );
  }
  const resume = row.sessionStatus === "IN_PROGRESS";
  return (
    <Link
      href={`/app/tests/${row.id}`}
      className={
        resume
          ? "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-warning px-3 text-xs font-bold text-on-warning"
          : "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-brand px-4 text-xs font-bold text-on-brand"
      }
    >
      {resume ? <Hourglass className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
      {resume ? "Үргэлжлүүлэх" : "Эхлэх"}
    </Link>
  );
}

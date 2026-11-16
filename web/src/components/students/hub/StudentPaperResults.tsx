"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, ScanLine } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Meta } from "@/components/ui/Meta";
import { dayText, scoreText, type MyPaperExam } from "@/components/paper-exams/types";

type Row = MyPaperExam & { variant: string | null; published: boolean };

/**
 * Сурагчийн профайлын «Шалгалт» таб: нэгдсэн шалгалт бүрийн оноо, байр, хувилбар
 * (эзэн 2026-11-16). Дарахад тухайн шалгалтын самбар нээгдэнэ. Дүнгүй бол юу ч зурахгүй.
 */
export default function StudentPaperResults({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    let live = true;
    api<Row[]>(`/paper-exams/students/${encodeURIComponent(studentId)}/results`)
      .then((r) => live && setRows(r))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [studentId]);

  if (!rows || rows.length === 0) return null;
  return (
    <section className="mb-5">
      <h3 className="mb-2 flex items-center gap-2 font-bold text-brand-soft">
        <ScanLine className="size-5" aria-hidden /> Нэгдсэн шалгалт
      </h3>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/app/paper-exams/${r.id}`} className="chunky surface-interactive flex min-h-11 items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 font-bold text-ink">
                  {r.title}
                  {!r.published && <Badge tone="neutral">Сурагчдад нээгээгүй</Badge>}
                </div>
                <Meta
                  className="mt-1 text-sm text-ink-dim"
                  items={[dayText(r.heldOn), r.variant ? `${r.variant} хувилбар` : null, `${r.rank}-р байр, ${r.participants} сурагчаас`]}
                />
              </div>
              <div className="shrink-0 text-right font-display text-xl font-bold tabular-nums text-ink">
                {scoreText(r.totalScore)}
                <span className="text-sm font-normal text-ink-dim">/{scoreText(r.maxScore)}</span>
              </div>
              <ChevronRight className="size-4 shrink-0 text-ink-dim" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

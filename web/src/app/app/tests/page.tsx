"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getRole } from "@/lib/api";

interface TestRow {
  id: string;
  title: string;
  type: string;
  gradingMode?: string;
  timeLimitMin?: number;
  pdfKey?: string;
  variantLabel?: string;
  _count: { problems: number };
  results?: { totalScore: number; maxScore: number }[];
}

const TYPE_LABEL: Record<string, string> = {
  DAILY: "Өдрийн",
  CHAPTER_EXAM: "Сэдвийн шалгалт",
  EESH_MOCK: "ЭЕШ сорил",
  CUSTOM: "Бусад",
};

export default function TestsPage() {
  const role = typeof window !== "undefined" ? getRole() : null;
  const isTeacher = role === "ADMIN" || role === "TEACHER" || role === "TEACHER_PLUS";
  const [tests, setTests] = useState<TestRow[]>([]);

  useEffect(() => {
    api<TestRow[]>("/tests").then(setTests).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Шалгалт</h1>
        {isTeacher && (
          <Link
            href="/app/tests/new"
            className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold"
          >
            + Тест үүсгэх
          </Link>
        )}
      </div>

      {tests.length === 0 && (
        <p className="text-sm text-ink-dim">
          {isTeacher
            ? "Тест үүсгээгүй байна"
            : "Танай ангид оноогдсон тест алга байна"}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {tests.map((t) => {
          const done = t.results && t.results.length > 0;
          return (
            <div
              key={t.id}
              className="min-w-0 rounded-2xl border border-white/8 bg-[#0b142e] p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 font-bold">
                  {t.title}
                  {t.variantLabel && (
                    <span className="ml-1 text-ink-dim">({t.variantLabel})</span>
                  )}
                </p>
                <span className="shrink-0 rounded-full bg-brand-bright/15 px-2.5 py-0.5 text-[11px] text-brand-soft">
                  {TYPE_LABEL[t.type] ?? t.type}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-dim">
                {t._count.problems} бодлого
                {t.timeLimitMin ? ` · ${t.timeLimitMin} мин` : ""}
                {t.gradingMode === "MANUAL" ? " · багшийн дүн" : " · авто дүн"}
              </p>
              {/* PDF эх сурвалжтай эсэхийг товч тэмдгээр (файлын зам харуулахгүй) */}
              {t.pdfKey && isTeacher && (
                <span className="mt-2 inline-block rounded bg-white/5 px-2 py-0.5 text-[11px] text-ink-dim">
                  📄 PDF эх сурвалжтай
                </span>
              )}
              <div className="mt-4">
                {isTeacher ? (
                  <Link
                    href={`/app/tests/${t.id}/results`}
                    className="inline-block rounded-lg border border-white/15 px-4 py-2 text-sm transition hover:border-white/40"
                  >
                    Дүн харах
                  </Link>
                ) : done ? (
                  <span className="inline-block rounded-lg bg-teal-400/15 px-4 py-2 text-sm font-bold text-teal-300">
                    Өгсөн · {t.results![0].totalScore}/{t.results![0].maxScore}
                  </span>
                ) : (
                  <Link
                    href={`/app/tests/${t.id}`}
                    className="inline-block rounded-lg bg-brand-bright px-5 py-2 text-sm font-bold"
                  >
                    Эхлэх
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

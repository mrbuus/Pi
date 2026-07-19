"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, getRole } from "@/lib/api";

/* ============================================================================
 * Шалгалтын жагсаалт — сэдвээр бүлэглэсэн, 2 ангилалтай, хайлттай.
 *
 * - «Тест» = авто дүнтэй, онлайнаар өгч болно; «Шалгалт» = багш дүгнэдэг (цаасан)
 * - Сэдэв (ерөнхий гарчиг) → задлахад 1,2,3… дугаартай тестүүд дарааллаараа
 * - Хайлт: сэдвийн нэр болон тестийн нэрээр шүүнэ (таарсан сэдэв автоматаар нээгдэнэ)
 * ========================================================================== */

interface TestRow {
  id: string;
  title: string;
  type: string;
  gradingMode?: string;
  timeLimitMin?: number;
  variantLabel?: string;
  groupKey?: string | null;
  chapter?: { book?: { code: string } | null } | null;
  _count: { problems: number };
  results?: { totalScore: number; maxScore: number }[];
  sessionStatus?: "IN_PROGRESS" | "SUBMITTED" | null;
}

interface AttendanceRow {
  date: string;
  status: string;
}

// Ном бүр өөрийн өнгөтэй — 100/200/300/1000 номын тестүүд ялгаатай харагдана
const BOOK_COLORS: Record<string, { chip: string; bar: string }> = {
  "100": { chip: "bg-sky-400/15 text-sky-300", bar: "border-l-sky-400/60" },
  "200": { chip: "bg-fuchsia-400/15 text-fuchsia-300", bar: "border-l-fuchsia-400/60" },
  "300": { chip: "bg-orange-400/15 text-orange-300", bar: "border-l-orange-400/60" },
  "1000": { chip: "bg-teal-400/15 text-teal-300", bar: "border-l-teal-400/60" },
};
// Урт код түрүүлж таарна ("1000" нь "100"-аас өмнө)
function bookColor(code?: string | null) {
  const key = ["1000", "300", "200", "100"].find((k) => code?.startsWith(k));
  return key ? { key, ...BOOK_COLORS[key] } : null;
}

// Шалгалт = жинхэнэ шалгалтын төрлүүд; бусад нь энгийн дасгал ТЕСТ
function isExamType(type: string) {
  return type === "CHAPTER_EXAM" || type === "EESH_MOCK";
}

// groupKey/title-ээс «сэдэв + тестийн дугаар»-ыг салгана:
// "Илтгэгч тэгшитгэл 1" → { topic: "Илтгэгч тэгшитгэл", num: 1 }
function splitTopic(t: TestRow): { topic: string; num: number | null } {
  const key = (t.groupKey ?? t.title).trim();
  const m = key.match(/^(.*?)\s+(\d+)$/);
  if (m) return { topic: m[1], num: Number(m[2]) };
  return { topic: "Бусад", num: null };
}

type Tab = "TEST" | "EXAM";

export default function TestsPage() {
  const role = typeof window !== "undefined" ? getRole() : null;
  const isTeacher = role === "ADMIN" || role === "TEACHER" || role === "TEACHER_PLUS";
  const [tests, setTests] = useState<TestRow[]>([]);
  const [tab, setTab] = useState<Tab>("TEST");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  // Ирц — зөвхөн танхимын сурагчид дээр нь харагдана (онлайн сурагч ирцгүй)
  const [attendance, setAttendance] = useState<AttendanceRow[] | null>(null);

  useEffect(() => {
    api<TestRow[]>("/tests").then(setTests).catch(() => {});
    if (!isTeacher && role === "STUDENT") {
      api<{ studentProfile?: { type?: string } }>("/auth/me")
        .then((me) => {
          if (me.studentProfile?.type === "CLASSROOM") {
            api<AttendanceRow[]>("/attendance/my")
              .then((rows) => setAttendance(rows.slice(0, 10)))
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = query.trim().toLowerCase();

  // Таб + хайлтаар шүүгээд сэдвээр бүлэглэнэ
  const { groups, testCount, examCount } = useMemo(() => {
    let testCount = 0;
    let examCount = 0;
    const map = new Map<string, { row: TestRow; num: number | null }[]>();
    for (const t of tests) {
      // Ангилал ТӨРЛӨӨР: сэдвийн шалгалт/сорил = Шалгалт; дасгал = Тест
      const isExam = isExamType(t.type);
      if (isExam) examCount++;
      else testCount++;
      if ((tab === "EXAM") !== isExam) continue;
      const { topic, num } = splitTopic(t);
      if (q && !topic.toLowerCase().includes(q) && !t.title.toLowerCase().includes(q)) continue;
      if (!map.has(topic)) map.set(topic, []);
      map.get(topic)!.push({ row: t, num });
    }
    // Сэдэв дотроо: дугаараар, дараа нь хувилбараар (1-A, 1-B, 2-A…)
    for (const rows of map.values()) {
      rows.sort(
        (a, b) =>
          (a.num ?? 1e9) - (b.num ?? 1e9) ||
          (a.row.variantLabel ?? "").localeCompare(b.row.variantLabel ?? ""),
      );
    }
    const groups = [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "mn"));
    return { groups, testCount, examCount };
  }, [tests, tab, q]);

  function toggle(topic: string) {
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {/* Толгой: гарчиг + хайлт */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Шалгалт</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim">
              🔍
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Сэдэв, тестээр хайх…"
              className="w-56 rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-bright sm:w-72"
            />
          </div>
          {isTeacher && (
            <Link
              href="/app/tests/new"
              className="rounded-xl bg-brand-bright px-4 py-2 text-sm font-bold"
            >
              + Тест үүсгэх
            </Link>
          )}
        </div>
      </div>

      {/* Ирц — зөвхөн танхимын сурагчид (Шийдвэр Г) */}
      {attendance && attendance.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-[#0b142e] px-4 py-3">
          <span className="text-xs font-bold text-ink-dim">Миний ирц:</span>
          {attendance.map((a, i) => (
            <span
              key={i}
              title={a.date.slice(0, 10)}
              className={`rounded-lg px-2 py-1 text-[11px] ${
                a.status === "PRESENT"
                  ? "bg-teal-400/15 text-teal-300"
                  : a.status === "LATE"
                    ? "bg-amber-400/15 text-amber-300"
                    : a.status === "EXCUSED"
                      ? "bg-white/10 text-ink-dim"
                      : "bg-red-400/15 text-red-300"
              }`}
            >
              {a.date.slice(5, 10)}{" "}
              {a.status === "PRESENT" ? "✓" : a.status === "LATE" ? "хоц." : a.status === "EXCUSED" ? "чөл." : "✗"}
            </span>
          ))}
        </div>
      )}

      {/* Хоёр ангилал: Тест (сэдвийн дасгал) / Шалгалт (сэдвийн шалгалт, сорил) */}
      <div className="flex gap-2">
        {(
          [
            { key: "TEST", label: "Тест", count: testCount, hint: "сэдвийн дасгал" },
            { key: "EXAM", label: "Шалгалт", count: examCount, hint: "сэдвийн шалгалт · сорил" },
          ] as const
        ).map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`rounded-xl border px-4 py-2.5 text-sm transition ${
              tab === tb.key
                ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                : "border-white/10 text-ink-dim hover:border-white/25"
            }`}
          >
            <span className="font-bold">{tb.label}</span>
            <span className="ml-1.5 rounded-full bg-white/10 px-2 py-0.5 text-xs">{tb.count}</span>
            <span className="ml-2 hidden text-xs opacity-70 sm:inline">{tb.hint}</span>
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <p className="rounded-2xl border border-white/8 bg-[#0b142e] p-6 text-center text-sm text-ink-dim">
          {q ? `«${query}» гэсэн хайлтад таарах зүйл алга` : "Энэ ангилалд тест алга байна"}
        </p>
      )}

      {/* Сэдвийн бүлгүүд */}
      <div className="space-y-3">
        {groups.map(([topic, rows]) => {
          const expanded = q !== "" || open.has(topic);
          const doneCount = rows.filter((r) => (r.row.results?.length ?? 0) > 0).length;
          // Номын өнгө — сэдвийн бүх тест нэг номд харьяалагддаг (Шийдвэр В)
          const book = bookColor(rows[0]?.row.chapter?.book?.code);
          return (
            <div
              key={topic}
              className={`overflow-hidden rounded-2xl border border-white/8 bg-[#0b142e] ${book ? `border-l-4 ${book.bar}` : ""}`}
            >
              {/* Сэдвийн толгой — дарж задлана */}
              <button
                onClick={() => toggle(topic)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.03]"
              >
                <span
                  className={`text-xs text-ink-dim transition-transform ${expanded ? "rotate-90" : ""}`}
                >
                  ▶
                </span>
                <span className="min-w-0 flex-1 truncate font-bold">{topic}</span>
                {book && (
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${book.chip}`}>
                    {book.key}
                  </span>
                )}
                {!isTeacher && doneCount > 0 && (
                  <span className="shrink-0 rounded-full bg-teal-400/15 px-2.5 py-0.5 text-xs text-teal-300">
                    {doneCount}/{rows.length} өгсөн
                  </span>
                )}
                <span className="shrink-0 text-xs text-ink-dim">{rows.length} тест</span>
              </button>

              {/* Тестүүд — 1,2,3… дарааллаараа */}
              {expanded && (
                <div className="border-t border-white/5">
                  {rows.map(({ row: t, num }) => {
                    const done = (t.results?.length ?? 0) > 0;
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 border-b border-white/5 px-5 py-3 last:border-b-0"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-bright/10 text-sm font-bold text-brand-soft">
                          {num ?? "·"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {num !== null ? `Тест ${num}` : t.title}
                            {t.variantLabel && (
                              <span className="ml-1 text-ink-dim">({t.variantLabel})</span>
                            )}
                          </p>
                          <p className="text-xs text-ink-dim">
                            {t._count.problems} бодлого
                            {t.timeLimitMin ? ` · ${t.timeLimitMin} мин` : ""}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {isTeacher ? (
                            <Link
                              href={`/app/tests/${t.id}/results`}
                              className="inline-block rounded-lg border border-white/15 px-3 py-1.5 text-xs transition hover:border-white/40"
                            >
                              Дүн харах
                            </Link>
                          ) : done ? (
                            <Link
                              href={`/app/tests/${t.id}`}
                              className="inline-block rounded-lg bg-teal-400/15 px-3 py-1.5 text-xs font-bold text-teal-300"
                            >
                              Өгсөн · {t.results![0].totalScore}/{t.results![0].maxScore}
                            </Link>
                          ) : t.gradingMode === "MANUAL" ? (
                            <span className="inline-block rounded-lg bg-white/5 px-3 py-1.5 text-xs text-ink-dim">
                              Багш дүгнэнэ
                            </span>
                          ) : t.sessionStatus === "IN_PROGRESS" ? (
                            <Link
                              href={`/app/tests/${t.id}`}
                              className="inline-block rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-amber-950"
                            >
                              Үргэлжлүүлэх
                            </Link>
                          ) : (
                            <Link
                              href={`/app/tests/${t.id}`}
                              className="inline-block rounded-lg bg-brand-bright px-4 py-1.5 text-xs font-bold"
                            >
                              Эхлэх
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

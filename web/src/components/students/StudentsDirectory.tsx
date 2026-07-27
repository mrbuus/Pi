"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getRole } from "@/lib/api";
import {
  StudentListItem,
  SUBJECT_LABEL,
  errMsg,
  fullName,
  money,
  subjectFromCode,
} from "./types";

interface UnassignedRow {
  id: string;
}
interface OutstandingRow {
  studentId: string;
  shortfall: number;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/** Сурагчийн төлбөрийн төлөв — outstandingMap-д байвал дутуу, эс бөгөөс
 * төлбөрийн багц (tuitionPlan) байгаа эсэхээс шалгаж ойролцоогоор тооцно
 * (GET /payments/outstanding зөвхөн танхимын сурагч + дутуу мөрийг буцаадаг —
 * SPEC-ийн бодит SQL-тэй тохирсон, payments.service.ts-ийн outstanding()). */
function paymentStatusOf(
  student: StudentListItem,
  outstandingMap: Map<string, number>,
): { text: string; cls: string } | null {
  const shortfall = outstandingMap.get(student.id);
  if (shortfall !== undefined) {
    return { text: `Дутуу · ${money(shortfall)}`, cls: "bg-error/10 text-error" };
  }
  if (student.studentProfile?.tuitionPlan) {
    return { text: "Хэвийн", cls: "bg-success/10 text-success" };
  }
  return null;
}

export default function StudentsDirectory() {
  const role = getRole();
  const canSeeMoney = role === "ADMIN" || role === "TEACHER_PLUS";

  const [students, setStudents] = useState<StudentListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [unassignedIds, setUnassignedIds] = useState<Set<string>>(new Set());
  const [outstandingMap, setOutstandingMap] = useState<Map<string, number>>(new Map());

  const [search, setSearch] = useState("");
  const [classroomFilter, setClassroomFilter] = useState("ALL");
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(25);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    // Backend GET /users?role=STUDENT-г найдаж хайх боловч, аюулгүйн нэмэлт
    // хамгаалалт болгож client талд дахин role шүүнэ (жагсаалт огт хоосон биш
    // хэрнээ ADMIN/багш зэрэг холилдсон мөр орж ирвэл дэлгэц эвдэрхгүй байх).
    api<StudentListItem[]>("/users?role=STUDENT")
      .then((rows) => setStudents(rows.filter((r) => r.role === "STUDENT")))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));

    if (canSeeMoney) {
      api<UnassignedRow[]>("/classrooms/unassigned-students")
        .then((rows) => setUnassignedIds(new Set(rows.map((r) => r.id))))
        .catch(() => {
          /* заавал биш дэд өгөгдөл — алдвал зүгээр л онцлохгүй */
        });

      const month = new Date().toISOString().slice(0, 7);
      api<OutstandingRow[]>(`/payments/outstanding?month=${month}`)
        .then((rows) =>
          setOutstandingMap(new Map(rows.map((r) => [r.studentId, r.shortfall]))),
        )
        .catch(() => {
          /* заавал биш — төлбөрийн төлөв багана "—" хэвээр үлдэнэ */
        });
    }
  }, [canSeeMoney]);

  useEffect(load, [load]);

  // ---- Шүүлтүүрийн сонголтуудыг АЧААЛСАН ДАТААС ГАРГАНА — тусдаа endpoint-оос
  // хамааралгүй, backend-ийн select ямар ч байсан ажиллана.
  const facets = useMemo(() => {
    const classrooms = new Map<string, string>();
    const grades = new Set<number>();
    const branches = new Set<string>();
    for (const s of students ?? []) {
      if (s.currentClassroom) classrooms.set(s.currentClassroom.id, s.currentClassroom.name);
      if (s.studentProfile?.grade) grades.add(s.studentProfile.grade);
      if (s.studentProfile?.branch) branches.add(s.studentProfile.branch);
    }
    return {
      classrooms: [...classrooms.entries()].sort((a, b) => a[1].localeCompare(b[1])),
      grades: [...grades].sort((a, b) => a - b),
      branches: [...branches].sort(),
    };
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (students ?? []).filter((s) => {
      if (unassignedOnly && !unassignedIds.has(s.id)) return false;
      if (classroomFilter !== "ALL" && s.currentClassroom?.id !== classroomFilter) return false;
      if (gradeFilter !== "ALL" && String(s.studentProfile?.grade ?? "") !== gradeFilter)
        return false;
      if (branchFilter !== "ALL" && s.studentProfile?.branch !== branchFilter) return false;
      if (subjectFilter !== "ALL" && subjectFromCode(s.studentCode) !== subjectFilter)
        return false;
      if (!q) return true;
      const haystack = [s.studentCode, s.firstName, s.lastName, s.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    students,
    search,
    classroomFilter,
    gradeFilter,
    branchFilter,
    subjectFilter,
    unassignedOnly,
    unassignedIds,
  ]);

  // Шүүлтүүр өөрчлөгдөх бүрт хуудаслалтыг эхэнд нь буцаана.
  const filterKey = `${search}|${classroomFilter}|${gradeFilter}|${branchFilter}|${subjectFilter}|${unassignedOnly}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(0);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const inputCls =
    "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-brand";

  function resetFilters() {
    setSearch("");
    setClassroomFilter("ALL");
    setGradeFilter("ALL");
    setBranchFilter("ALL");
    setSubjectFilter("ALL");
    setUnassignedOnly(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Сурагчийн жагсаалт</h1>
        <p className="mt-1 text-sm text-ink-dim">
          {students ? `Нийт ${students.length} сурагч` : "Ачаалж байна…"}
          {unassignedIds.size > 0 && (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => setUnassignedOnly(true)}
                className="font-semibold text-warning underline decoration-dotted underline-offset-2"
              >
                {unassignedIds.size} ангид хуваарилагдаагүй
              </button>
            </>
          )}
        </p>
      </div>

      {/* Хайлт + шүүлтүүр */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
        <label className="sr-only" htmlFor="student-search">
          Код, нэр, утасны дугаараар хайх
        </label>
        <input
          id="student-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Код, нэр, утасны дугаараар хайх…"
          className={`w-full sm:max-w-xs ${inputCls}`}
        />
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="filter-classroom">
            Ангиар шүүх
          </label>
          <select
            id="filter-classroom"
            value={classroomFilter}
            onChange={(e) => setClassroomFilter(e.target.value)}
            className={`bg-bg ${inputCls}`}
          >
            <option value="ALL">Бүх анги</option>
            {facets.classrooms.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="filter-grade">
            Ангиллаар (жилээр) шүүх
          </label>
          <select
            id="filter-grade"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className={`bg-bg ${inputCls}`}
          >
            <option value="ALL">Бүх жил</option>
            {facets.grades.map((g) => (
              <option key={g} value={g}>
                {g}-р анги
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="filter-branch">
            Салбараар шүүх
          </label>
          <select
            id="filter-branch"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className={`bg-bg ${inputCls}`}
          >
            <option value="ALL">Бүх салбар</option>
            {facets.branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="filter-subject">
            Хичээлээр шүүх
          </label>
          <select
            id="filter-subject"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className={`bg-bg ${inputCls}`}
          >
            <option value="ALL">Бүх хичээл</option>
            {(Object.keys(SUBJECT_LABEL) as (keyof typeof SUBJECT_LABEL)[]).map((k) => (
              <option key={k} value={k}>
                {SUBJECT_LABEL[k]}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setUnassignedOnly((v) => !v)}
            aria-pressed={unassignedOnly}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              unassignedOnly
                ? "border-warning bg-warning/15 text-warning"
                : "border-line text-ink-dim hover:text-ink"
            }`}
          >
            ⚠ Зөвхөн хуваарилагдаагүй
          </button>

          {(search ||
            classroomFilter !== "ALL" ||
            gradeFilter !== "ALL" ||
            branchFilter !== "ALL" ||
            subjectFilter !== "ALL" ||
            unassignedOnly) && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg px-3 py-2 text-sm text-ink-dim underline transition hover:text-ink"
            >
              Шүүлтүүр цэвэрлэх
            </button>
          )}
        </div>
      </div>

      {loading && (
        <p className="animate-pulse text-sm text-ink-dim" role="status">
          Ачаалж байна…
        </p>
      )}
      {error && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          <span>⚠ {error}</span>
          <button
            onClick={load}
            className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
          >
            Дахин ачаалах
          </button>
        </div>
      )}

      {!loading && !error && students && (
        <>
          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-line bg-panel p-8 text-center text-sm text-ink-dim">
              Тохирох сурагч олдсонгүй
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-panel text-xs text-ink-dim">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Код
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Нэр
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Анги
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Секц
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Салбар
                    </th>
                    {canSeeMoney && (
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Төлбөрийн төлөв
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((s) => {
                    const isUnassigned = unassignedIds.has(s.id);
                    const status = canSeeMoney ? paymentStatusOf(s, outstandingMap) : null;
                    return (
                      <tr
                        key={s.id}
                        className={`border-b border-line last:border-0 ${
                          isUnassigned ? "bg-warning/[0.06]" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-ink-dim">
                          {s.studentCode ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/app/admin/students/${s.id}`}
                            className="font-semibold text-ink hover:text-brand-soft hover:underline"
                          >
                            {fullName(s)}
                          </Link>
                          {isUnassigned && (
                            <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">
                              ⚠ Хуваарилаагүй
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-dim">
                          {s.currentClassroom?.name ??
                            (s.studentProfile?.grade ? `${s.studentProfile.grade}-р анги` : "—")}
                        </td>
                        <td className="px-4 py-3 text-ink-dim">
                          {s.studentProfile?.section ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-ink-dim">
                          {s.studentProfile?.branch ?? "—"}
                        </td>
                        {canSeeMoney && (
                          <td className="px-4 py-3">
                            {status ? (
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.cls}`}
                              >
                                {status.text}
                              </span>
                            ) : (
                              <span className="text-ink-dim">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Хуудаслалт — 359 мөрийг НЭГ дор буулгахгүй байхын гол механизм */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-dim">
            <span>
              {filtered.length === 0
                ? "0 мөр"
                : `${page * pageSize + 1}–${Math.min(filtered.length, (page + 1) * pageSize)} / ${filtered.length}`}
            </span>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="page-size">
                Хуудсанд харуулах тоо
              </label>
              <select
                id="page-size"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                className={`bg-bg ${inputCls}`}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} / хуудас
                  </option>
                ))}
              </select>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-line px-3 py-2 font-semibold text-ink-dim transition disabled:opacity-30"
              >
                ← Өмнөх
              </button>
              <span>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-line px-3 py-2 font-semibold text-ink-dim transition disabled:opacity-30"
              >
                Дараах →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

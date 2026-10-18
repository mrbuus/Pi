"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Download, School, TriangleAlert, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { relativeTimeMn } from "@/lib/relativeTimeMn";
import { Segmented } from "@/components/classes/parts";
import AttentionBanner, { useAttentionStudents, type AttentionKind } from "./AttentionBanner";
import NewClassDialog, { announceCreated } from "./NewClassDialog";
import NewStudentDialog from "./NewStudentDialog";
import { StudentActionsMenu } from "./StudentActions";
import { Meta, MetaTitle } from "@/components/ui/Meta";
import { LoadingState } from "@/components/ui/StateBlock";
import { api, getRole } from "@/lib/api";
import {
  StudentListItem,
  SUBJECT_LABEL,
  errMsg,
  fullName,
  money,
  subjectFromCode,
} from "./types";

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
    return { text: `Дутуу — ${money(shortfall)}`, cls: "bg-error/10 text-error" };
  }
  if (student.studentProfile?.tuitionPlan) {
    return { text: "Хэвийн", cls: "bg-success/10 text-success" };
  }
  return null;
}

export default function StudentsDirectory() {
  const role = getRole();
  const router = useRouter();
  const canSeeMoney = role === "ADMIN" || role === "TEACHER_PLUS";
  // Гараар бүртгэх эрх = элсэлт хариуцсан ажилтан (POST /users/students)
  const canRegister = canSeeMoney;
  const [registering, setRegistering] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);
  // Анги солих, сургалтаас хасах, сэргээх, шинэ анги — Багш+ ба Админ
  const canManage = canSeeMoney;

  const [showArchived, setShowArchived] = useState(false);
  const [students, setStudents] = useState<StudentListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [outstandingMap, setOutstandingMap] = useState<Map<string, number>>(new Map());

  const [search, setSearch] = useState("");
  const [classroomFilter, setClassroomFilter] = useState("ALL");
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  // Анхаарах шүүлтүүр: ангигүй / ирэхгүй (GET /classrooms/attention-students)
  const [attention, setAttention] = useState<AttentionKind | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(25);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    // Backend GET /users?role=STUDENT-г найдаж хайх боловч, аюулгүйн нэмэлт
    // хамгаалалт болгож client талд дахин role шүүнэ (жагсаалт огт хоосон биш
    // хэрнээ ADMIN/багш зэрэг холилдсон мөр орж ирвэл дэлгэц эвдэрхгүй байх).
    api<StudentListItem[]>(`/users?role=STUDENT${showArchived ? "&archived=true" : ""}`)
      .then((rows) => setStudents(rows.filter((r) => r.role === "STUDENT")))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));

    if (canSeeMoney) {
      const month = new Date().toISOString().slice(0, 7);
      api<OutstandingRow[]>(`/payments/outstanding?month=${month}`)
        .then((rows) =>
          setOutstandingMap(new Map(rows.map((r) => [r.studentId, r.shortfall]))),
        )
        .catch(() => {
          /* заавал биш — төлбөрийн төлөв багана "—" хэвээр үлдэнэ */
        });
    }
  }, [canSeeMoney, showArchived]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const attn = useAttentionStudents(canManage);
  const unassignedIds = useMemo(() => new Set((attn.data?.unassigned ?? []).map((u) => u.id)), [attn.data]);
  const absentIds = useMemo(() => new Set((attn.data?.notAttending ?? []).map((u) => u.id)), [attn.data]);
  const reloadAll = () => {
    load();
    attn.reload();
  };

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
      if (attention === "unassigned" && !unassignedIds.has(s.id)) return false;
      if (attention === "absent" && !absentIds.has(s.id)) return false;
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
    attention,
    unassignedIds,
    absentIds,
  ]);

  // Шүүлтүүр өөрчлөгдөх бүрт хуудаслалтыг эхэнд нь буцаана.
  const filterKey = `${search}|${classroomFilter}|${gradeFilter}|${branchFilter}|${subjectFilter}|${attention}`;
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
    setAttention(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-ink">Сурагчийн жагсаалт</h1>
          {canRegister && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setCreatingClass(true)} className="min-h-11">
                <School aria-hidden /> Шинэ анги
              </Button>
              {!showArchived && (
                <Button type="button" onClick={() => setRegistering(true)} className="min-h-11">
                  <UserPlus aria-hidden /> Шинэ сурагч
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-ink-dim">
          <span>{students ? `${showArchived ? "Архивт" : "Нийт"} ${students.length} сурагч` : "Сурагчдын жагсаалт"}</span>
          {role === "ADMIN" && (
            <Link
              href="/app/admin/students/import"
              className="ml-2 inline-flex min-h-10 items-center rounded-lg border border-line px-3 text-sm font-semibold text-ink"
            >
              Excel импорт
            </Link>
          )}
          {canSeeMoney && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const csv = await api<string>("/students/export.csv", { responseType: "text" });
                  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "students.csv";
                  a.click();
                  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (e) {
                  setError(errMsg(e));
                }
              }}
              className="ml-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-ink"
            >
              <Download size={15} aria-hidden />
              CSV татах
            </button>
          )}
        </div>
      </div>

      {canManage && !showArchived && (
        <AttentionBanner
          data={attn.data}
          onChanged={reloadAll}
          onShow={(k) => {
            setAttention(k);
            document.getElementById("student-search")?.scrollIntoView({ block: "center", behavior: "smooth" });
          }}
        />
      )}

      {/* Хайлт + шүүлтүүр */}
      <div className="flex flex-col gap-3 chunky p-4">
        {canManage && (
          <Segmented
            label="Сурагчийн төлөв"
            value={showArchived ? "archive" : "active"}
            onChange={(v) => {
              setShowArchived(v === "archive");
              setPage(0);
            }}
            options={[
              { value: "active", label: "Идэвхтэй" },
              { value: "archive", label: "Архив" },
            ]}
          />
        )}
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

          {!showArchived &&
            (
              [
                { kind: "unassigned", label: "Ангигүй", n: unassignedIds.size, icon: AlertCircle },
                { kind: "absent", label: "Ирэхгүй", n: absentIds.size, icon: UserMinus },
              ] as const
            )
              .filter((c) => c.n > 0)
              .map((c) => (
                <button
                  key={c.kind}
                  type="button"
                  onClick={() => setAttention((v) => (v === c.kind ? null : c.kind))}
                  aria-pressed={attention === c.kind}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    attention === c.kind
                      ? "border-error bg-error/10 text-error"
                      : "border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  <c.icon size={16} aria-hidden />
                  {c.label} ({c.n})
                </button>
              ))}

          {(search ||
            classroomFilter !== "ALL" ||
            gradeFilter !== "ALL" ||
            branchFilter !== "ALL" ||
            subjectFilter !== "ALL" ||
            attention) && (
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
        <LoadingState rows={3} label="Ачаалж байна" />
      )}
      {error && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          <TriangleAlert className="h-4 w-4" aria-hidden />
          <span>{error}</span>
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
            <p className="chunky p-8 text-center text-sm text-ink-dim">
              Тохирох сурагч олдсонгүй
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-2xl border border-line md:block">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-panel text-xs text-ink-dim" style={{ height: 28 }}>
                      <th scope="col" className="px-3 py-2 font-semibold">Код</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Нэр</th>
                      <th scope="col" className="px-3 py-2 font-semibold">{showArchived ? "Сүүлийн анги" : "Анги"}</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Секц</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Салбар</th>
                      <th scope="col" className="px-3 py-2 font-semibold">{showArchived ? "Хасагдсан шалтгаан" : "Сүүлд орсон"}</th>
                      {canSeeMoney && !showArchived && <th scope="col" className="px-3 py-2 font-semibold">Төлбөрийн төлөв</th>}
                      {canManage && (
                        <th scope="col" className="w-12 px-1 py-2">
                          <span className="sr-only">Үйлдэл</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((s) => {
                      const isUnassigned = !showArchived && unassignedIds.has(s.id);
                      const status = canSeeMoney && !showArchived ? paymentStatusOf(s, outstandingMap) : null;
                      const cls = showArchived ? s.lastClassroom : s.currentClassroom;
                      return (
                        <tr
                          key={s.id}
                          className={`row-interactive border-b border-line last:border-0 transition ${
                            isUnassigned ? "bg-warning/[0.06]" : ""
                          }`}
                          style={{ height: 28 }}
                        >
                          <td className="px-3 py-2 font-mono text-xs text-ink-dim">{s.studentCode ?? "—"}</td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/app/students/${s.id}`}
                              className="font-semibold text-brand transition hover:text-brand-soft hover:underline"
                            >
                              {fullName(s)}
                            </Link>
                            {isUnassigned && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">
                                <AlertCircle size={10} aria-hidden />
                                Хуваарилаагүй
                              </span>
                            )}
                            {!showArchived && absentIds.has(s.id) && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-bold text-error">
                                <UserMinus size={10} aria-hidden />
                                Ирэхгүй
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-ink-dim">
                            {cls?.name ?? (s.studentProfile?.grade ? `${s.studentProfile.grade}-р анги` : "—")}
                          </td>
                          <td className="px-3 py-2 text-ink-dim">{s.studentProfile?.section ?? "—"}</td>
                          <td className="px-3 py-2 text-ink-dim">{s.studentProfile?.branch ?? "—"}</td>
                          <td className="px-3 py-2 text-xs text-ink-dim">
                            {showArchived ? (
                              <span className="line-clamp-1 max-w-[16rem]" title={s.archiveReason ?? undefined}>
                                {s.archiveReason ?? "—"}
                              </span>
                            ) : (
                              <span className="whitespace-nowrap">{s.lastSeenAt ? relativeTimeMn(s.lastSeenAt) : "Ороогүй"}</span>
                            )}
                          </td>
                          {canSeeMoney && !showArchived && (
                            <td className="px-3 py-2">
                              {status ? (
                                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.cls}`}>
                                  <MetaTitle>{status.text}</MetaTitle>
                                </span>
                              ) : (
                                <span className="text-ink-dim">—</span>
                              )}
                            </td>
                          )}
                          {canManage && (
                            <td className="px-1 py-0 text-right">
                              <StudentActionsMenu
                                student={{ id: s.id, name: fullName(s) }}
                                archived={!!s.archivedAt}
                                currentClassId={s.currentClassroom?.id ?? null}
                                lastClassId={s.lastClassroom?.id ?? null}
                                onChanged={reloadAll}
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Утас: хүснэгтийн оронд нягт жагсаалт, «⋯» үргэлж харагдана */}
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface md:hidden">
                {pageRows.map((s) => {
                  const cls = showArchived ? s.lastClassroom : s.currentClassroom;
                  const isUnassigned = !showArchived && unassignedIds.has(s.id);
                  const status = canSeeMoney && !showArchived ? paymentStatusOf(s, outstandingMap) : null;
                  return (
                    <li key={s.id} className="flex items-center gap-1 py-1 pl-3 pr-1">
                      <div className="min-w-0 flex-1 py-1">
                        <Link href={`/app/students/${s.id}`} className="block truncate font-semibold text-brand">
                          {fullName(s)}
                        </Link>
                        <Meta
                          className="text-xs text-ink-dim"
                          items={[
                            s.studentCode && <span key="c" className="font-mono">{s.studentCode}</span>,
                            cls?.name ?? (isUnassigned ? "Хуваарилаагүй" : null),
                            !showArchived && absentIds.has(s.id) ? "Ирэхгүй" : null,
                            showArchived ? s.archiveReason : null,
                          ]}
                        />
                        {status && (
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}>
                            <MetaTitle>{status.text}</MetaTitle>
                          </span>
                        )}
                      </div>
                      {canManage && (
                        <StudentActionsMenu
                          student={{ id: s.id, name: fullName(s) }}
                          archived={!!s.archivedAt}
                          currentClassId={s.currentClassroom?.id ?? null}
                          lastClassId={s.lastClassroom?.id ?? null}
                          onChanged={reloadAll}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* Хуудаслалт — 359 мөрийг НЭГ дор буулгахгүй байхын гол механизм */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-dim">
            <span>
              {filtered.length === 0
                ? "0 мөр"
                : `${page * pageSize + 1}–${Math.min(filtered.length, (page + 1) * pageSize)} / ${filtered.length}`}
            </span>
            <div className="flex flex-wrap items-center gap-2">
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
                className="inline-flex items-center gap-1.5 min-h-11 min-w-11 justify-center rounded-lg border border-line px-3 py-2 font-semibold text-ink-dim transition disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">Өмнөх</span>
              </button>
              <span className="whitespace-nowrap tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center gap-1.5 min-h-11 min-w-11 justify-center rounded-lg border border-line px-3 py-2 font-semibold text-ink-dim transition disabled:opacity-30"
              >
                <span className="sr-only sm:not-sr-only">Дараах</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </>
      )}
      {creatingClass && (
        <NewClassDialog
          onClose={() => setCreatingClass(false)}
          onCreated={(created) => {
            setCreatingClass(false);
            announceCreated(created, () => router.push(`/app/classes/${created.id}`));
          }}
        />
      )}
      {registering && (
        <NewStudentDialog
          onClose={() => setRegistering(false)}
          onCreated={(created) => {
            setRegistering(false);
            router.push(`/app/students/${created.id}`);
          }}
        />
      )}
    </div>
  );
}

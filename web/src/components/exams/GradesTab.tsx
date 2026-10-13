"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, Download, FileSpreadsheet, PencilLine, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { cn } from "@/lib/cn";
import { fullName } from "./gradebook";
import ScoreGrid from "./ScoreGrid";
import StudentSummary from "./StudentSummary";
import { downloadBase64, errorText, percent, type Gradebook, type GradebookRow } from "./types";

type SortKey = "name" | "class" | "part1" | "part2" | "total";

const SOURCE: Record<string, string> = {
  ONLINE: "Онлайн",
  MANUAL: "Гараар",
  EXCEL: "Excel",
  OMR: "OMR",
  MIXED: "Онлайн, засвартай",
};

function scoreOf(row: GradebookRow): number | null {
  return row.result && !row.absent ? row.result.totalScore : null;
}

/**
 * «Дүн» таб: ангиар шүүсэн сурагчдын жагсаалт (эрэмбэлэх, хайх) → «Дүн шивэх»
 * торонд шилжинэ. Excel оруулах/татах нь сонгосон анги дээр.
 */
export default function GradesTab({ testId, onChanged }: { testId: string; onChanged: () => void }) {
  const [classId, setClassId] = useState("all");
  const [book, setBook] = useState<Gradebook | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"list" | "grid">("list");
  const [openImport, setOpenImport] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "total", desc: true });
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setBook(
        await api<Gradebook>(
          `/exams/${encodeURIComponent(testId)}/gradebook?classroomId=${encodeURIComponent(classId)}`,
        ),
      );
    } catch (e) {
      setError(errorText(e, "Дүнг ачаалж чадсангүй"));
    }
  }, [testId, classId]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const assigned = book?.classes.filter((c) => c.assigned) ?? [];
  const others = book?.classes.filter((c) => !c.assigned) ?? [];
  const single = classId !== "all";

  const rank = useMemo(() => {
    const scores = (book?.rows ?? [])
      .map((r) => percent(scoreOf(r), r.result?.maxScore))
      .filter((p): p is number => p !== null);
    return (p: number | null) => (p === null ? null : 1 + scores.filter((s) => s > p).length);
  }, [book]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (book?.rows ?? []).filter(
      (r) => !q || fullName(r).toLowerCase().includes(q) || r.classroomName.toLowerCase().includes(q),
    );
    const value = (r: GradebookRow): string | number => {
      switch (sort.key) {
        case "name":
          return `${r.firstName} ${r.lastName}`;
        case "class":
          return r.classroomName;
        case "part1":
          return r.part1 ?? -1;
        case "part2":
          return r.part2 ?? -1;
        default:
          return percent(scoreOf(r), r.result?.maxScore) ?? -1;
      }
    };
    return [...list].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "mn");
      return sort.desc ? -cmp : cmp;
    });
  }, [book, query, sort]);

  const stats = useMemo(() => {
    const all = book?.rows ?? [];
    const taken = all.filter((r) => scoreOf(r) !== null);
    const ps = taken.map((r) => percent(r.result!.totalScore, r.result!.maxScore) ?? 0);
    return {
      students: all.length,
      taken: taken.length,
      absent: all.filter((r) => r.absent).length,
      avg: ps.length ? Math.round(ps.reduce((s, p) => s + p, 0) / ps.length) : null,
    };
  }, [book]);

  /** Нэг анги шаардлагатай үйлдэл: ганц оноосон анги бол түүнийг сонгоно. */
  function needClass(): string | null {
    if (single) return classId;
    if (assigned.length === 1) {
      setClassId(assigned[0].id);
      return assigned[0].id;
    }
    toast.info("Эхлээд ангиа сонгоно уу");
    return null;
  }

  function startGrid(importFirst: boolean) {
    if (!needClass()) return;
    setOpenImport(importFirst);
    setMode("grid");
  }

  async function exportExcel() {
    const target = needClass();
    if (!target) return;
    try {
      downloadBase64(
        await api<{ filename: string; mime: string; base64: string }>(
          `/exams/${encodeURIComponent(testId)}/gradebook/excel?classroomId=${encodeURIComponent(target)}`,
        ),
      );
    } catch (e) {
      toast.error(errorText(e, "Excel татаж чадсангүй"));
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!book || (single && book.classroomId !== classId)) {
    return <LoadingState rows={5} label="Дүн ачаалж байна" />;
  }

  if (mode === "grid" && single && book.classroomId === classId) {
    return (
      <ScoreGrid
        key={classId}
        testId={testId}
        book={book}
        openImport={openImport}
        onSaved={() => {
          void load();
          onChanged();
        }}
        onClose={() => {
          setMode("list");
          setOpenImport(false);
        }}
      />
    );
  }

  const header = (key: SortKey, label: string, className = "") => (
    <th className={cn("px-2 py-2 font-semibold", className)}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : key !== "name" && key !== "class" }))}
        className="inline-flex min-h-8 items-center gap-1 rounded-md hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
      >
        {label}
        {sort.key === key &&
          (sort.desc ? <ArrowDown className="h-3.5 w-3.5" aria-hidden /> : <ArrowUp className="h-3.5 w-3.5" aria-hidden />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-3">
      {/* Анги сонгох: оноосон анги чипээр, бусад (цаасан шалгалт) жагсаалтаар */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Анги сонгох">
        {[{ id: "all", name: "Бүгд" }, ...assigned].map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={classId === c.id}
            onClick={() => {
              setClassId(c.id);
              setMode("list");
            }}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-brand",
              classId === c.id
                ? "border-transparent bg-brand-bright text-on-brand"
                : "border-line bg-surface text-ink hover:bg-ink/5",
            )}
          >
            {c.name}
          </button>
        ))}
        {others.length > 0 && (
          <label className="inline-flex items-center gap-2 text-sm text-ink-dim">
            <span className="sr-only">Өөр анги</span>
            <select
              value={others.some((c) => c.id === classId) ? classId : ""}
              onChange={(e) => {
                if (!e.target.value) return;
                setClassId(e.target.value);
                setMode("list");
              }}
              className="min-h-11 max-w-[12rem] rounded-xl border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand"
            >
              <option value="">Өөр анги (цаасан)</option>
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-ink-dim">
          <span className="font-bold text-ink">{stats.taken}</span>/{stats.students} дүнтэй
          {stats.absent > 0 && <>, {stats.absent} ирээгүй</>}
          {stats.avg !== null && (
            <>
              , дундаж <span className="font-bold text-ink">{stats.avg}%</span>
            </>
          )}
        </p>
        <Button size="sm" type="button" onClick={() => startGrid(false)}>
          <PencilLine aria-hidden /> Дүн шивэх
        </Button>
        <Button size="sm" variant="outline" type="button" onClick={() => startGrid(true)}>
          <FileSpreadsheet aria-hidden /> Excel оруулах
        </Button>
        <Button size="sm" variant="outline" type="button" onClick={() => void exportExcel()}>
          <Download aria-hidden /> Excel татах
        </Button>
      </div>

      {book.rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={single ? "Энэ ангид идэвхтэй сурагч алга" : "Оноосон анги алга"}
          hint={single ? undefined : "«Тохиргоо» табаас ангид оноох эсвэл дээрээс ангиа сонгож цаасан дүн шивнэ."}
        />
      ) : (
        <>
          <div className="relative max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
            <label htmlFor={`grade-search-${testId}`} className="sr-only">
              Сурагч хайх
            </label>
            <input
              id={`grade-search-${testId}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Сурагч хайх"
              className="h-11 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-sm text-ink outline-none focus:border-brand"
            />
          </div>

          {/* Компьютер: бүтэн хүснэгт */}
          <div className="hidden overflow-x-auto rounded-xl border border-line sm:block">
            <table className="w-full text-sm">
              <thead className="bg-panel text-left text-xs text-ink-dim">
                <tr>
                  {header("name", "Сурагч")}
                  {header("class", "Анги")}
                  {header("part1", `I хэсэг (${book.test.part1Max})`, "text-right")}
                  {book.test.part2Max > 0 && header("part2", `II хэсэг (${book.test.part2Max})`, "text-right")}
                  {header("total", "Нийт", "text-right")}
                  <th className="px-2 py-2 text-right font-semibold">Байр</th>
                  <th className="px-2 py-2 font-semibold">Эх</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = percent(scoreOf(r), r.result?.maxScore);
                  const open = expanded === r.studentId;
                  return (
                    <Fragment key={r.studentId}>
                      <tr className={cn("border-t border-line", open && "bg-brand-bright/5")}>
                        <td className="px-2 py-1 font-semibold text-ink">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setExpanded(open ? null : r.studentId)}
                            className="inline-flex min-h-9 items-center gap-1 rounded-md text-left hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
                          >
                            <ChevronRight
                              className={cn("h-3.5 w-3.5 shrink-0 text-ink-dim transition-transform", open && "rotate-90")}
                              aria-hidden
                            />
                            {fullName(r)}
                          </button>
                        </td>
                        <td className="px-2 py-2 text-ink-dim">{r.classroomName}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-ink">{r.absent ? "" : r.part1 ?? ""}</td>
                        {book.test.part2Max > 0 && (
                          <td className="px-2 py-2 text-right tabular-nums text-ink">{r.absent ? "" : r.part2 ?? ""}</td>
                        )}
                        <td className="px-2 py-2 text-right tabular-nums">
                          <ScoreCell row={r} p={p} />
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-ink-dim">{rank(p) ?? ""}</td>
                        <td className="px-2 py-2">
                          <SourceBadge row={r} />
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-brand-bright/5">
                          <td colSpan={book.test.part2Max > 0 ? 7 : 6} className="px-2 pb-3">
                            <StudentSummary testId={testId} studentId={r.studentId} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Утас: «Нэр — Нийт %», дарахад задарна */}
          <ul className="divide-y divide-line rounded-xl border border-line sm:hidden">
            {rows.map((r) => {
              const p = percent(scoreOf(r), r.result?.maxScore);
              const open = expanded === r.studentId;
              return (
                <li key={r.studentId}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setExpanded(open ? null : r.studentId)}
                    className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">{fullName(r)}</span>
                    <ScoreCell row={r} p={p} />
                  </button>
                  {open && (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 pb-3 text-sm">
                      <dt className="text-ink-dim">Анги</dt>
                      <dd className="text-ink">{r.classroomName}</dd>
                      <dt className="text-ink-dim">I хэсэг</dt>
                      <dd className="tabular-nums text-ink">{r.part1 ?? "-"}</dd>
                      {book.test.part2Max > 0 && (
                        <>
                          <dt className="text-ink-dim">II хэсэг</dt>
                          <dd className="tabular-nums text-ink">{r.part2 ?? "-"}</dd>
                        </>
                      )}
                      <dt className="text-ink-dim">Байр</dt>
                      <dd className="tabular-nums text-ink">{rank(p) ?? "-"}</dd>
                      <dt className="text-ink-dim">Эх</dt>
                      <dd>
                        <SourceBadge row={r} />
                      </dd>
                    </dl>
                  )}
                  {open && (
                    <div className="px-3 pb-3">
                      <StudentSummary testId={testId} studentId={r.studentId} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function ScoreCell({ row, p }: { row: GradebookRow; p: number | null }) {
  if (row.absent) return <Badge tone="info">Ирээгүй</Badge>;
  if (row.lock === "IN_PROGRESS") return <Badge tone="info">Өгч байна</Badge>;
  if (!row.result) return <span className="text-ink-dim">-</span>;
  return (
    <span className="whitespace-nowrap font-bold text-ink">
      {row.result.totalScore}
      <span className="font-normal text-ink-dim">/{row.result.maxScore}</span> {p}%
    </span>
  );
}

function SourceBadge({ row }: { row: GradebookRow }) {
  if (!row.result) return null;
  if (row.markSource) {
    return <Badge tone={row.markSource === "ONLINE" ? "brand" : "neutral"}>{SOURCE[row.markSource] ?? row.markSource}</Badge>;
  }
  return <Badge tone="neutral">{row.result.source === "ONLINE_TEST" ? "Онлайн" : "Нийт оноо"}</Badge>;
}

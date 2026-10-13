"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, CircleCheck, CircleDashed, ClipboardCheck, Hourglass, TriangleAlert } from "lucide-react";
import { api, getRole } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Meta, MetaTitle } from "@/components/ui/Meta";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { bookColor, splitTopic } from "@/components/test-list/types";
import { cn } from "@/lib/cn";
import { confirmDiscardUnsaved } from "@/lib/unsavedChanges";
import ExamPanel from "./ExamPanel";
import {
  errorText,
  SERIES,
  shortTitle,
  STATUS_LABEL,
  THOUSAND_GROUP,
  thousandOrder,
  type ExamOverview,
  type ExamOverviewRow,
  type ExamStatus,
} from "./types";

const STATUS_ICON: Record<ExamStatus, { icon: typeof CircleCheck; tone: "neutral" | "info" | "warning" | "success" }> = {
  UNASSIGNED: { icon: CircleDashed, tone: "neutral" },
  IN_PROGRESS: { icon: Hourglass, tone: "info" },
  MISSING: { icon: TriangleAlert, tone: "warning" },
  DONE: { icon: CircleCheck, tone: "success" },
};

interface Group {
  key: string;
  title: string;
  bookCode: string | null;
  rows: ExamOverviewRow[];
}

function groupOf(row: ExamOverviewRow): { topic: string; num: number | null } {
  if (row.type === "THOUSAND") return { topic: THOUSAND_GROUP, num: thousandOrder(row.groupKey, row.title) };
  return splitTopic({
    id: row.id,
    title: row.title,
    type: row.type,
    groupKey: row.groupKey,
    chapter: { book: row.bookCode ? { code: row.bookCode } : null },
    _count: { problems: row.problemCount },
  });
}

export type BoardKind = "EXAM" | "TEST";

/** «Тест» табын цуврал = номын код (100, 100V3, 200, 300 …). */
function bookSeries(rows: ExamOverviewRow[]): { value: string; label: string }[] {
  const codes = [...new Set(rows.map((r) => r.bookCode).filter((c): c is string => !!c))];
  return codes.sort((a, b) => a.localeCompare(b, "mn", { numeric: true })).map((c) => ({ value: c, label: c }));
}

/**
 * Ажилтны «Тест» ба «Шалгалт» табууд (SHALGALT-TOLOVLOGOO §1): бүлгүүд
 * (1000 бодлого, сэдвүүд …), 3 шүүлтүүр (Цуврал, Анги, Төлөв) + хайлт; мөр
 * дээр дарахад доороо дэлгэрнэ. «Тест» табын цуврал нь номын код.
 */
export default function ExamsBoard({
  kind = "EXAM",
  query,
  subject,
}: {
  kind?: BoardKind;
  query: string;
  subject: string;
}) {
  const role = getRole();
  const noun = kind === "TEST" ? "тест" : "шалгалт";
  const [data, setData] = useState<ExamOverview | null>(null);
  const [error, setError] = useState("");
  const [series, setSeries] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  // «Шалгалт» — 1000 бодлого нээлттэй; «Тест» — эхний бүлэг (ачаалсны дараа)
  const [open, setOpen] = useState<Set<string> | null>(kind === "EXAM" ? new Set([THOUSAND_GROUP]) : null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams({ kind });
      if (subject) params.set("subject", subject);
      setData(await api<ExamOverview>(`/exams?${params.toString()}`));
    } catch (e) {
      setError(errorText(e, kind === "TEST" ? "Тестийн жагсаалт ачаалж чадсангүй" : "Шалгалтын жагсаалт ачаалж чадсангүй"));
    }
  }, [kind, subject]);

  const seriesOptions = useMemo(
    () => (kind === "TEST" ? bookSeries(data?.exams ?? []) : SERIES),
    [kind, data],
  );

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (role !== "TEACHER") return;
    api<{ id: string }>("/auth/me")
      .then((u) => setMe(u.id))
      .catch(() => setMe(null));
  }, [role]);

  const q = query.trim().toLowerCase();
  const filtering = !!(q || series || classId || status);

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const row of data?.exams ?? []) {
      if (series && (kind === "TEST" ? row.bookCode !== series : row.type !== series)) continue;
      if (classId && !row.classes.some((c) => c.id === classId)) continue;
      if (status && row.status !== status) continue;
      const { topic } = groupOf(row);
      if (q && !topic.toLowerCase().includes(q) && !row.title.toLowerCase().includes(q)) continue;
      const g = map.get(topic) ?? { key: topic, title: topic, bookCode: row.bookCode, rows: [] };
      g.rows.push(row);
      map.set(topic, g);
    }
    for (const g of map.values()) {
      g.rows.sort(
        (a, b) =>
          (groupOf(a).num ?? 1e9) - (groupOf(b).num ?? 1e9) ||
          (a.variantLabel ?? "").localeCompare(b.variantLabel ?? "") ||
          a.title.localeCompare(b.title, "mn"),
      );
    }
    return [...map.values()].sort((a, b) =>
      a.key === THOUSAND_GROUP ? -1 : b.key === THOUSAND_GROUP ? 1 : a.title.localeCompare(b.title, "mn"),
    );
  }, [data, series, classId, status, q, kind]);

  const total = groups.reduce((s, g) => s + g.rows.length, 0);
  const staffAll = role === "ADMIN" || role === "TEACHER_PLUS";
  // Хэрэглэгч бүлэг хөдөлгөөгүй бол «Тест» табд эхний бүлэг нээлттэй
  const openSet = open ?? new Set(groups.length ? [groups[0].key] : []);

  function toggleGroup(key: string) {
    // Хураахад доторх засварлагчийн хадгалаагүй өөрчлөлт алга болохгүй
    if (!confirmDiscardUnsaved()) return;
    setOpen((prev) => {
      const next = new Set(prev ?? openSet);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const select = "h-11 max-w-[11rem] rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none focus:border-brand";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="exam-series">
          Цуврал
        </label>
        <select id="exam-series" value={series} onChange={(e) => setSeries(e.target.value)} className={select}>
          <option value="">{kind === "TEST" ? "Бүх ном" : "Бүх цуврал"}</option>
          {seriesOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="exam-class">
          Анги
        </label>
        <select id="exam-class" value={classId} onChange={(e) => setClassId(e.target.value)} className={select}>
          <option value="">{data?.manageAllClasses ? "Бүх анги" : "Миний бүх анги"}</option>
          {(data?.classes ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="exam-status">
          Төлөв
        </label>
        <select id="exam-status" value={status} onChange={(e) => setStatus(e.target.value)} className={select}>
          <option value="">Бүх төлөв</option>
          {(Object.keys(STATUS_LABEL) as ExamStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {data && (
          <span className="text-sm text-ink-dim">
            {total} {noun}
          </span>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && !error && (
        <div className="space-y-3" role="status" aria-label={kind === "TEST" ? "Тестүүд ачаалж байна" : "Шалгалтууд ачаалж байна"}>
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden className="h-16 animate-pulse chunky" />
          ))}
        </div>
      )}
      {data && groups.length === 0 && (
        <EmptyState
          icon={ClipboardCheck}
          title={filtering ? `Шүүлтэд таарах ${noun} алга` : kind === "TEST" ? "Тест алга" : "Шалгалт алга"}
          hint={filtering ? "Шүүлтүүрээ өөрчилж үзнэ үү." : undefined}
        />
      )}

      <div className="space-y-3">
        {groups.map((g) => {
          const isOpen = filtering || openSet.has(g.key);
          const book = bookColor(g.key === THOUSAND_GROUP ? "1000" : g.bookCode);
          return (
            <div key={g.key} className={cn("overflow-hidden chunky", book && `border-l-4 ${book.bar}`)}>
              <button
                type="button"
                onClick={() => toggleGroup(g.key)}
                aria-expanded={isOpen}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-line/10 sm:px-5"
              >
                <ChevronRight
                  className={cn("h-4 w-4 shrink-0 text-ink-dim transition-transform", isOpen && "rotate-90")}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate font-bold text-ink">{g.title}</span>
                <span className="shrink-0 text-xs text-ink-dim">
                  {g.rows.length} {noun}
                </span>
              </button>
              {isOpen && (
                <ul className="border-t border-line">
                  {g.rows.map((row) => (
                    <li key={row.id} className="border-b border-line last:border-b-0">
                      <ExamRowButton
                        row={row}
                        label={rowLabel(kind, row)}
                        expanded={expanded === row.id}
                        onToggle={() => {
                          if (!confirmDiscardUnsaved()) return;
                          setExpanded((id) => (id === row.id ? null : row.id));
                        }}
                      />
                      {expanded === row.id && (
                        <ExamPanel
                          exam={row}
                          canEdit={staffAll || (!!me && row.createdById === me)}
                          canDuplicate={staffAll || (!!me && row.createdById === me)}
                          canDelete={staffAll}
                          youtube={row.type === "THOUSAND" && staffAll}
                          onChanged={() => void load()}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Мөрийн гарчиг: 1000 бодлого — богино; «Тест» таб — «Тест 3» (бүлэг нь сэдэв). */
function rowLabel(kind: BoardKind, row: ExamOverviewRow): string {
  if (row.type === "THOUSAND") return shortTitle(row.title);
  if (kind === "TEST") {
    const { num } = groupOf(row);
    if (num !== null) return `Тест ${num}`;
  }
  return row.title;
}

function ExamRowButton({
  row,
  label,
  expanded,
  onToggle,
}: {
  row: ExamOverviewRow;
  label: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const s = STATUS_ICON[row.status];
  const title = label;
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-5",
        expanded && "bg-brand-bright/5",
      )}
    >
      <ChevronRight
        className={cn("mt-1 h-4 w-4 shrink-0 text-ink-dim transition-transform", expanded && "rotate-90")}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
          <MetaTitle>{title}</MetaTitle>
          {row.variantLabel && row.type !== "THOUSAND" && (
            <span className="rounded-full bg-info/15 px-2 py-0.5 text-[11px] font-bold text-info">
              Хувилбар {row.variantLabel}
            </span>
          )}
          {row.isDraft && <Badge tone="neutral">Ноорог</Badge>}
          {row.gradingMode === "MANUAL" && <Badge tone="neutral">Цаасан</Badge>}
        </span>
        <span className="mt-0.5 block text-xs text-ink-dim">
          <Meta
            items={[
              `${row.problemCount} бодлого`,
              row.timeLimitMin ? `${row.timeLimitMin} мин` : null,
              row.classes.length ? `${row.resultCount}/${row.studentCount} дүнтэй` : null,
            ]}
          />
        </span>
        {row.classes.length > 0 && (
          <span className="mt-1.5 flex flex-wrap gap-1">
            {row.classes.map((c) => (
              <span key={c.id} className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-ink">
                {c.name}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone={s.tone}>
          <s.icon aria-hidden /> {STATUS_LABEL[row.status]}
        </Badge>
        {row.avgPercent !== null && (
          <span className="text-sm tabular-nums text-ink-dim">
            дундаж <span className="font-bold text-ink">{row.avgPercent}%</span>
          </span>
        )}
      </span>
    </button>
  );
}

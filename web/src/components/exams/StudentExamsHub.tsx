"use client";

import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ClipboardCheck, ClipboardList, PencilLine, Search, Sparkles, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { MetaTitle } from "@/components/ui/Meta";
import { PageHeader } from "@/components/ui/Surface";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import ContinueBanner from "@/components/test-list/ContinueBanner";
import TopicGroup from "@/components/test-list/TopicGroup";
import { collapseVariants, isExamType, splitTopic, type GroupRow, type TestRow } from "@/components/test-list/types";
import MockExamsPanel from "@/components/mock-exams/MockExamsPanel";
import { formatMnDate } from "@/lib/dateMn";
import MyRankings, { type MyResult } from "./MyRankings";
import { examTitleOf, ExamsToTakeList, useMyExams } from "./StudentExamLists";
import { errorText } from "./types";
import { cleanTitle } from "@/lib/studentTitle";

/* ============================================================================
 * Сурагчийн НЭГ «Шалгалт» хэсэг (эзэн 2026-10-29): бүх төрлийн тест, шалгалт,
 * дүн, эрэмбэ, жишиг сорил нэг дор. Таб URL-д (?tab=give|done|rank|soril).
 * Жагсаалтыг сервер шүүнэ — ангийн хийгээгүй сэдвийн тест, эхлэх цаг нь
 * ирээгүй шалгалт (огноотой «Удахгүй»-гөөс бусад) энд ирэхгүй.
 * ========================================================================== */

const TABS = [
  { value: "give", label: "Өгөх", icon: PencilLine },
  { value: "done", label: "Өгсөн, дүн", icon: ClipboardCheck },
  { value: "rank", label: "Эрэмбэ", icon: Trophy },
  { value: "soril", label: "Жишиг сорил", icon: Sparkles },
] as const;
type HubTab = (typeof TABS)[number]["value"];
const isHubTab = (v: string | null): v is HubTab => TABS.some((t) => t.value === v);

const PAGE_SIZE = 20;

export default function StudentExamsHub() {
  const [tab, setTab] = useState<HubTab>("give");
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("tab");
    if (isHubTab(fromUrl) && fromUrl !== "give") {
      const t = window.setTimeout(() => setTab(fromUrl), 0);
      return () => window.clearTimeout(t);
    }
  }, []);
  useEffect(() => {
    // A/B хувилбараас нэгийг сонгоход сурагчийн ID хэрэгтэй — алдаа гарвал чимээгүй
    api<{ id: string }>("/auth/me")
      .then((me) => setStudentId(me.id))
      .catch(() => {});
  }, []);

  const changeTab = (v: string) => {
    if (!isHubTab(v)) return;
    setTab(v);
    const url = new URL(window.location.href);
    if (v === "give") url.searchParams.delete("tab");
    else url.searchParams.set("tab", v);
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <div>
      <PageHeader title="Шалгалт" />
      <Tabs.Root value={tab} onValueChange={changeTab}>
        <Tabs.List aria-label="Шалгалтын хэсэг" className="flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-bold text-ink-dim transition-colors hover:text-ink data-[state=active]:border-brand-bright data-[state=active]:text-brand-soft"
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <div className="mt-4">
          <Tabs.Content value="give">
            <GiveTab studentId={studentId} />
          </Tabs.Content>
          <Tabs.Content value="done">
            <DoneTab studentId={studentId} />
          </Tabs.Content>
          <Tabs.Content value="rank">
            <MyRankings />
          </Tabs.Content>
          <Tabs.Content value="soril">
            <MockExamsPanel />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}

/* ---------------------------- Өгөх ---------------------------- */

function GiveTab({ studentId }: { studentId: string | null }) {
  const [query, setQuery] = useState("");
  const [tests, setTests] = useState<TestRow[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(PAGE_SIZE);
  const exams = useMyExams(studentId, query);

  const load = useCallback(() => {
    setError("");
    api<TestRow[]>("/tests?includeThousand=1")
      .then(setTests)
      .catch((e) => setError(errorText(e, "Тестийн жагсаалт ачаалж чадсангүй")));
  }, []);
  useEffect(() => {
    const t = window.setTimeout(load, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const q = query.trim().toLowerCase();
  // Дасгал тест (шалгалтаас бусад) — сэдвээр, A/B-оос нэгийг л
  const groups = useMemo(() => {
    const map = new Map<string, GroupRow[]>();
    for (const t of tests ?? []) {
      if (isExamType(t.type) || t.upcoming) continue;
      const { topic, num } = splitTopic(t);
      if (q && !topic.toLowerCase().includes(q) && !t.title.toLowerCase().includes(q)) continue;
      if (!map.has(topic)) map.set(topic, []);
      map.get(topic)!.push({ row: t, num });
    }
    for (const rows of map.values()) {
      rows.sort(
        (a, b) =>
          (a.num ?? 1e9) - (b.num ?? 1e9) || (a.row.variantLabel ?? "").localeCompare(b.row.variantLabel ?? ""),
      );
    }
    return [...map.entries()]
      .map(([topic, rows]) => [topic, collapseVariants(rows, studentId)] as const)
      .sort(([a], [b]) => a.localeCompare(b, "mn"));
  }, [tests, q, studentId]);

  const toggle = (topic: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });

  return (
    <div className="space-y-5">
      {tests && <ContinueBanner tests={tests} />}

      <div className="relative">
        <label htmlFor="exam-search" className="sr-only">
          Шалгалт, тестээр хайх
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
        />
        <input
          id="exam-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE_SIZE);
          }}
          placeholder="Шалгалт, тестээр хайх…"
          className="h-11 w-full rounded-xl border border-line bg-bg py-2 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand sm:w-80"
        />
      </div>

      <section aria-labelledby="give-exams" className="space-y-2">
        <h2 id="give-exams" className="font-bold text-ink">
          Шалгалт{exams.rows ? <span className="font-normal text-ink-dim"> ({exams.toTake.length})</span> : null}
        </h2>
        {exams.error ? (
          <ErrorState message={exams.error} onRetry={() => void exams.load()} />
        ) : !exams.rows ? (
          <LoadingState rows={2} />
        ) : exams.toTake.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-dim">
            Одоогоор өгөх шалгалт алга, багш оноомогц энд гарна
          </p>
        ) : (
          <ExamsToTakeList rows={exams.toTake} />
        )}
      </section>

      <section aria-labelledby="give-tests" className="space-y-2">
        <h2 id="give-tests" className="font-bold text-ink">
          Дасгал тест
        </h2>
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !tests ? (
          <LoadingState rows={3} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={q ? `«${query}» гэсэн тест алга` : "Өгөх тест алга"}
            hint={q ? undefined : "Ангидаа үзсэн сэдвийн тестүүд энд нээгдэнэ"}
          />
        ) : (
          <div className="space-y-3">
            {groups.slice(0, shown).map(([topic, rows], idx) => (
              <TopicGroup
                key={topic}
                topic={topic}
                rows={rows}
                isTeacher={false}
                expanded={q !== "" || open.has(topic) || (idx === 0 && q === "")}
                onToggle={() => toggle(topic)}
              />
            ))}
            {groups.length > shown && (
              <button
                onClick={() => setShown((c) => c + PAGE_SIZE)}
                className="min-h-11 w-full rounded-xl border border-line py-3 text-sm font-semibold text-ink-dim transition hover:border-brand hover:text-ink"
              >
                Дараагийн сэдвүүдийг харах ({groups.length - shown} үлдсэн)
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------- Өгсөн, дүн ------------------------- */

interface DoneRow {
  id: string;
  title: string;
  date: string | null;
  absent: boolean;
  score: { total: number; max: number } | null;
}

function DoneTab({ studentId }: { studentId: string | null }) {
  const exams = useMyExams(studentId, "");
  const [results, setResults] = useState<MyResult[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    api<MyResult[]>("/tests/my-results")
      .then(setResults)
      .catch((e) => setError(errorText(e, "Дүнг ачаалж чадсангүй")));
  }, []);
  useEffect(() => {
    const t = window.setTimeout(load, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  // Шалгалтын «Өгсөн» + дасгал тестийн дүн нэг жагсаалтад (шинэ нь дээр)
  const rows = useMemo<DoneRow[] | null>(() => {
    if (!exams.rows || !results) return null;
    const out: DoneRow[] = exams.taken.map((r) => ({
      id: r.id,
      title: examTitleOf(r),
      date: r.takenAt,
      absent: r.absent,
      score: r.results?.[0] ? { total: r.results[0].totalScore, max: r.results[0].maxScore } : null,
    }));
    const seen = new Set(exams.rows.map((r) => r.id));
    for (const r of results) {
      if (seen.has(r.test.id)) continue;
      seen.add(r.test.id);
      out.push({
        id: r.test.id,
        title: cleanTitle(r.test.title, null, r.test.title),
        date: r.createdAt,
        absent: false,
        score: { total: r.totalScore, max: r.maxScore },
      });
    }
    return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [exams.rows, exams.taken, results]);

  if (exams.error || error)
    return (
      <ErrorState
        message={exams.error || error}
        onRetry={() => {
          void exams.load();
          load();
        }}
      />
    );
  if (!rows) return <LoadingState rows={4} />;
  if (rows.length === 0)
    return <EmptyState icon={ClipboardCheck} title="Өгсөн шалгалт алга" hint="Шалгалт өгмөгц дүн нь энд харагдана" />;

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface elev-1">
      {rows.map((r) => {
        const pct = r.score && r.score.max > 0 ? Math.round((r.score.total / r.score.max) * 100) : null;
        return (
          <li key={r.id}>
            <Link
              href={`/app/tests/${r.id}/result`}
              className="flex min-h-14 items-center gap-3 px-4 py-3 transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">
                  <MetaTitle>{r.title}</MetaTitle>
                </span>
                {r.date && <span className="block text-xs text-ink-dim">{formatMnDate(r.date)}</span>}
              </span>
              {r.absent ? (
                <Badge tone="neutral">Ирээгүй</Badge>
              ) : r.score ? (
                <span className="shrink-0 text-right tabular-nums">
                  {pct !== null && <span className="block font-display text-lg font-bold text-ink">{pct}%</span>}
                  <span className="block text-xs text-ink-dim">
                    {r.score.total}/{r.score.max}
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
  );
}

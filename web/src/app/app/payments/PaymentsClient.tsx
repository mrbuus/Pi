"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, Clock, Download, FileSpreadsheet, History, LayoutGrid, Search, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/kit/tabs";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonCard, SkeletonRows } from "@/components/ui/Skeleton";
import ClassOverview from "@/components/payments/ClassOverview";
import LedgerList from "@/components/payments/LedgerList";
import PendingPanel from "@/components/payments/PendingPanel";
import PriceReference from "@/components/payments/PriceReference";
import RecentPanel from "@/components/payments/RecentPanel";
import SheetSyncPanel from "@/components/payments/SheetSyncPanel";
import { downloadLedgerCsv } from "@/components/payments/ledgerCsv";
import { millions } from "@/components/payments/ledgerFormat";
import { errMsg } from "@/components/payments/paymentHelpers";
import type { LedgerBoard, LedgerOverview, LedgerRow } from "@/components/payments/ledgerTypes";

/* ============================================================================
 * «Төлбөр» (2026-10-13, эзний шаардлага).
 *
 * Ажилтны өдөр тутмын урсгал: анги → сурагчдын сарын блок → сурагч.
 * Төвийн «Асуудалтай» жагсаалт хамгийн их өртэйг эхэнд гаргана.
 * Өмнөх функц бүгд хэвээр: батлах/цуцлах/засах (Батлах), сүүлийн төлбөр +
 * буцаах (Түүх), сарын төлөлт (блок), сурагч хайх, үнийн лавлагаа (Үнэ).
 * ========================================================================== */

type TabKey = "classes" | "problems" | "pending" | "history" | "sheet";
const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "classes", label: "Ангиуд", icon: LayoutGrid },
  { key: "problems", label: "Асуудалтай", icon: CircleAlert },
  { key: "pending", label: "Батлах", icon: Clock },
  { key: "history", label: "Түүх", icon: History },
  // Google Sheet «2027 оны төлбөрийн мэдээлэл» → вэб синкийн төлөв ба зөрүү (2026-10-27)
  { key: "sheet", label: "Шийт", icon: FileSpreadsheet },
];
const isTab = (v: string | null): v is TabKey => TABS.some((t) => t.key === v);
const PAGE = 40;

function ListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Ачаалж байна">
      <SkeletonRows rows={6} />
    </div>
  );
}

type ProblemView = "problems" | "promises";

function Problems({ view, onPaid }: { view: ProblemView; onPaid: () => void }) {
  const [data, setData] = useState<LedgerBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Бүх хуудсыг (200-аар) татаж, дэлгэцэнд харагдаагүй мөрүүдийг ч оруулна
  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      let rows: LedgerRow[] = [];
      let total = Infinity;
      let year: LedgerBoard["year"] | null = null;
      while (rows.length < total) {
        const d = await api<LedgerBoard>(`/payments/ledger/board?view=${view}&offset=${rows.length}&limit=200`);
        year = d.year;
        total = d.total;
        if (!d.rows.length) break;
        rows = rows.concat(d.rows);
      }
      if (year) downloadLedgerCsv(rows, year, view === "promises" ? "tolbor-amlalt" : "tolbor-asuudaltai");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setExporting(false);
    }
  }

  const load = useCallback((offset = 0) => {
    api<LedgerBoard>(`/payments/ledger/board?view=${view}&offset=${offset}&limit=${PAGE}`)
      .then((d) => {
        setData((prev) => (offset && prev ? { ...d, rows: [...prev.rows, ...d.rows] } : d));
        setError(null);
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setMore(false));
  }, [view]);
  useEffect(() => load(0), [load]);

  if (error && !data) return <ErrorState message={error} onRetry={() => load(0)} />;
  if (!data) return <ListSkeleton />;
  if (!data.rows.length)
    return view === "promises" ? (
      <EmptyState title="Амлалт алга" hint="Төлбөрийн тэмдэглэлд амласан өдөр бичихэд энд гарна" />
    ) : (
      <EmptyState title="Асуудалтай сурагч алга" hint="Хугацаа нь болсон өр, тасарсан амлалт алга" />
    );
  const replace = (row: LedgerRow) => {
    setData((d) => (d ? { ...d, rows: d.rows.map((r) => (r.id === row.id ? row : r)) } : d));
    onPaid();
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-dim">
          <span className="font-bold tabular-nums text-ink">{data.total}</span> сурагч, нийт өр{" "}
          <span className="font-bold tabular-nums text-error">{millions(data.owedNow ?? 0)}</span>
        </p>
        <Button variant="outline" className="min-h-11" disabled={exporting} onClick={() => void exportCsv()}>
          <Download aria-hidden /> {exporting ? "Татаж байна" : "CSV татах"}
        </Button>
      </div>
      <LedgerList rows={data.rows} year={data.year} current={data.month} showClass onPaid={replace} />
      {data.rows.length < data.total && (
        <Button variant="outline" className="w-full" disabled={more} onClick={() => {
            setMore(true);
            load(data.rows.length);
          }}>
          {more ? "Ачаалж байна" : `Цааш ${Math.min(PAGE, data.total - data.rows.length)}`}
        </Button>
      )}
    </div>
  );
}

function SearchResults({ q }: { q: string }) {
  const [data, setData] = useState<LedgerBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      setError(null);
      api<LedgerBoard>(`/payments/ledger/board?q=${encodeURIComponent(q)}`)
        .then((d) => alive && setData(d))
        .catch((e) => alive && setError(errMsg(e)));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);
  if (error) return <ErrorState message={error} />;
  if (!data) return <ListSkeleton />;
  if (!data.rows.length) return <EmptyState icon={Search} title="Сурагч олдсонгүй" hint="Нэр, утас эсвэл кодоор хайна" />;
  const replace = (row: LedgerRow) =>
    setData((d) => (d ? { ...d, rows: d.rows.map((r) => (r.id === row.id ? row : r)) } : d));
  return <LedgerList rows={data.rows} year={data.year} current={data.month} showClass onPaid={replace} />;
}

export default function PaymentsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const tab: TabKey = isTab(tabParam) ? tabParam : "classes";
  const problemView: ProblemView = params.get("view") === "promises" ? "promises" : "problems";
  const [q, setQ] = useState("");
  const [overview, setOverview] = useState<LedgerOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(() => {
    api<LedgerOverview>("/payments/ledger/overview")
      .then((d) => {
        setOverview(d);
        setError(null);
      })
      .catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(loadOverview, [loadOverview]);

  const setTab = (t: TabKey, view?: ProblemView) =>
    router.replace(
      t === "classes" ? pathname : `${pathname}?tab=${t}${view === "promises" ? "&view=promises" : ""}`,
      { scroll: false },
    );
  const searching = q.trim().length >= 2;
  const count: Partial<Record<TabKey, number>> = {
    problems: overview?.totals.problems,
    pending: overview?.totals.pending.count,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="cyrillic-heading mr-auto text-2xl font-extrabold text-ink">Төлбөр</h1>
        <PriceReference />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
        <label htmlFor="pay-search" className="sr-only">
          Сурагч хайх
        </label>
        <input
          id="pay-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Сурагч хайх: нэр, утас, код"
          autoComplete="off"
          className="min-h-12 w-full rounded-2xl border border-line bg-surface pl-10 pr-12 text-base text-ink outline-none focus:border-brand sm:text-sm"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Хайлт цэвэрлэх"
            className="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-ink-dim hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {searching ? (
        <SearchResults q={q.trim()} />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="space-y-5">
          <TabsList aria-label="Төлбөрийн хэсгүүд">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="group">
                <t.icon aria-hidden />
                {t.label}
                {!!count[t.key] && (
                  <span className="rounded-full bg-ink/10 px-1.5 text-xs tabular-nums group-data-[state=active]:bg-on-brand/20">
                    {count[t.key]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="classes">
            {error && !overview ? (
              <ErrorState message={error} onRetry={loadOverview} />
            ) : !overview ? (
              <div className="space-y-3" role="status" aria-label="Ачаалж байна">
                <SkeletonCard className="h-48" />
                <SkeletonRows rows={8} />
              </div>
            ) : (
              <ClassOverview
                data={overview}
                onShowProblems={() => setTab("problems")}
                onShowPromises={() => setTab("problems", "promises")}
                onShowPending={() => setTab("pending")}
              />
            )}
          </TabsContent>
          <TabsContent value="problems" className="space-y-3">
            <div role="radiogroup" aria-label="Асуудалтай жагсаалт" className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: "problems", label: "Өртэй", n: overview?.totals.problems },
                  {
                    key: "promises",
                    label: "Амлалт",
                    n: overview ? overview.totals.brokenPromises + overview.totals.upcomingPromises : undefined,
                  },
                ] as const
              ).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={problemView === c.key}
                  onClick={() => setTab("problems", c.key)}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition ${
                    problemView === c.key ? "border-brand bg-brand-tint text-ink" : "border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  {c.label} {c.n != null && <span className="tabular-nums">{c.n}</span>}
                </button>
              ))}
            </div>
            <Problems key={problemView} view={problemView} onPaid={loadOverview} />
          </TabsContent>
          <TabsContent value="pending">
            <PendingPanel onChanged={loadOverview} />
          </TabsContent>
          <TabsContent value="history">
            <RecentPanel />
          </TabsContent>
          <TabsContent value="sheet">
            <SheetSyncPanel />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

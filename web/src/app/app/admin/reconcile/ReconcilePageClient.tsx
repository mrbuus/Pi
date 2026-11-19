"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarCheck2, FileSpreadsheet, FileUp, Inbox, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/kit/tabs";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Segmented, inputCls } from "@/components/payments/LedgerDialog";
import { errMsg } from "@/components/payments/paymentHelpers";
import RowCard from "./RowCard";
import { RECONCILE_CHANGED, TONE, type BankRow, type ImportSummary, type Lane, type Overview } from "./types";

const LANES: { key: Lane; label: string; empty: string }[] = [
  { key: "all", label: "Бүгд", empty: "Хуулга хараахан ороогүй" },
  { key: "manual", label: "Шийдэх", empty: "Шийдэх гүйлгээ алга — бүгд хуваарилагдсан" },
  { key: "tuition", label: "Сургалтын төлбөр", empty: "Сургалтын төлбөр хараахан ороогүй" },
  { key: "social", label: "Нийгэм", empty: "Утгадаа «нийгэм» гэсэн эсвэл «Нийгэм сургалт» гэж оноосон гүйлгээ энд харагдана" },
  { key: "other", label: "Бусад орлого", empty: "Ном, хариултын хуудас, торгууль энд харагдана" },
  { key: "expense", label: "Зарлага", empty: "Зарлага хараахан ороогүй" },
  { key: "sheet", label: "Шийтэд хөтлөгдсөн", empty: "Ажилтны шийтэд хөтөлсөн гэж тэмдэглэсэн гүйлгээ энд харагдана" },
];
const PAGE = 50;

/** «11/18 17:42» — УБ цагаар */
function stamp(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 8 * 3_600_000).toISOString();
  return `${d.slice(5, 7)}/${d.slice(8, 10)} ${d.slice(11, 16)}`;
}

export function ReconcilePageClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [lane, setLane] = useState<Lane>("all");
  const [q, setQ] = useState("");
  const [checkOnly, setCheckOnly] = useState(false);
  const [rows, setRows] = useState<BankRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState<ImportSummary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rowsRef = useRef<BankRow[] | null>(null);
  rowsRef.current = rows;

  const loadOverview = useCallback(async () => {
    try {
      setOverview(await api<Overview>("/reconcile/overview"));
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  /** append — «Цааш үзэх»; soft — жагсаалтыг арилгахгүйгээр (байрлал үсрэхгүй) шинэчилнэ */
  const loadRows = useCallback(
    async (mode: "reset" | "append" | "soft" = "reset") => {
      setError(null);
      if (mode === "reset") setRows(null);
      try {
        const have = rowsRef.current?.length ?? 0;
        const offset = mode === "append" ? have : 0;
        const limit = mode === "soft" ? Math.max(PAGE, have) : PAGE;
        const res = await api<{ items: BankRow[]; total: number }>(
          `/reconcile/rows?lane=${lane}&limit=${Math.min(limit, 200)}&offset=${offset}${lane === "sheet" && checkOnly ? "&check=1" : ""}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`,
        );
        setTotal(res.total);
        setRows((prev) => (mode === "append" ? [...(prev ?? []), ...res.items] : res.items));
      } catch (e) {
        if (mode !== "soft") setError(errMsg(e));
      }
    },
    [lane, q, checkOnly],
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);
  useEffect(() => {
    const t = setTimeout(() => loadRows("reset"), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadRows, q]);

  // «⋯» цонхноос хуваарилалт буцаавал тоо, жагсаалт шинэчлэгдэнэ (байрлал үсрэхгүй)
  useEffect(() => {
    const refresh = () => {
      loadOverview();
      loadRows("soft");
    };
    window.addEventListener(RECONCILE_CHANGED, refresh);
    return () => window.removeEventListener(RECONCILE_CHANGED, refresh);
  }, [loadOverview, loadRows]);

  /** Хуваарилсан/буцаасан мөр л жагсаалтаас гарна — хуудас дахин ачаалахгүй */
  const onDone = (rowId: string, alsoResolved?: number) => {
    loadOverview();
    // «Бүгд»-д мөр үлдэж, өнгө нь солигдоно (байрлал үсрэхгүй)
    if (lane === "all") {
      loadRows("soft");
      if (alsoResolved) toast.success(`Өмнө оноосон данс, утсаар өөр ${alsoResolved} гүйлгээ автоматаар орлоо`);
      return;
    }
    setRows((prev) => prev?.filter((r) => r.id !== rowId) ?? prev);
    setTotal((t) => Math.max(0, t - 1));
    if (alsoResolved) {
      toast.success(`Өмнө оноосон данс, утсаар өөр ${alsoResolved} гүйлгээ автоматаар орлоо`);
      loadRows("soft");
    }
  };

  async function onFile(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await api<ImportSummary>("/reconcile/import", { method: "POST", body });
      setLastImport(res);
      toast.success(`${res.newRows} шинэ гүйлгээ орлоо`);
      setLane("all");
      loadOverview();
      loadRows("reset");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const cursor = overview?.cursors[0];
  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <CalendarCheck2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <div>
              <p className="font-semibold text-ink">
                {!cursor
                  ? "Хуулга хараахан ороогүй"
                  : overview && overview.counts.manual > 0
                    ? `${overview.counts.manual} гүйлгээ таны шийдвэрийг хүлээж байна`
                    : "Бүх гүйлгээ шийдэгдсэн"}
              </p>
              <p className="text-sm text-ink-dim">
                {cursor && overview?.classifiedThroughAt
                  ? `${stamp(overview.classifiedThroughAt)} хүртэлх бүх гүйлгээ ангилагдсан${
                      overview.lastTxAt && overview.lastTxAt !== overview.classifiedThroughAt ? `. Хуулгын сүүлийн гүйлгээ ${stamp(overview.lastTxAt)}` : ""
                    }`
                  : "Хаан банкны интернэт банкнаас «Дансны хуулга»-г Excel-ээр татаж оруулна. Давхардалгүй, зөвхөн шинэ гүйлгээ нэмэгдэнэ"}
              </p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button onClick={() => fileRef.current?.click()} disabled={importing}>
            <FileUp /> {importing ? "Уншиж байна" : "Хуулга оруулах"}
          </Button>
        </div>
      </section>

      {overview?.sheetWrite && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-info/30 bg-info/10 px-4 py-3 text-sm text-ink">
          <FileSpreadsheet className="size-4 shrink-0 text-info" aria-hidden />
          <span className="font-semibold">{overview.sheetWrite.demo ? "Демо горим" : "Шийтэд автоматаар бичнэ"}</span>
          <span className="text-ink-dim">
            {overview.sheetWrite.demo
              ? "Гараар оноосон сургалтын төлбөр жинхэнэ шийтэд биш, тусдаа хуулбарт бичигдэнэ"
              : "Гараар оноосон сургалтын төлбөр «2027 оны төлбөрийн мэдээлэл»-д бичигдэнэ — ажилтан дахин бичихгүй"}
          </span>
          <a href={overview.sheetWrite.url} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
            Шийтийг нээх
          </a>
        </p>
      )}

      {lastImport && (
        <p className="rounded-2xl bg-info/10 px-4 py-3 text-sm text-ink">
          Хуулгад {lastImport.rows} гүйлгээ: шинээр {lastImport.newRows} орж, {lastImport.duplicates + lastImport.beforeSettled} нь өмнө
          орсон тул алгасагдлаа. Автоматаар {lastImport.autoResolved} шийдэгдэж, {lastImport.open} гүйлгээ шийдэх жагсаалтад байна
        </p>
      )}

      <Tabs
        value={lane}
        onValueChange={(v) => {
          setCheckOnly(false);
          setLane(v as Lane);
        }}
      >
        <TabsList aria-label="Гүйлгээний жагсаалт">
          {LANES.map((l) => (
            <TabsTrigger key={l.key} value={l.key} className="group">
              {l.label}
              {overview && (
                <span className="rounded-full bg-ink/10 px-1.5 text-xs tabular-nums group-data-[state=active]:bg-on-brand/20">
                  {overview.counts[l.key]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {lane === "sheet" && overview && overview.sheetCheck > 0 && (
        <Segmented
          label="Шийтэд хөтлөгдсөн гүйлгээ"
          value={checkOnly ? "check" : "all"}
          onChange={(v) => setCheckOnly(v === "check")}
          options={[
            { value: "all", label: `Бүгд (${overview.counts.sheet})` },
            { value: "check", label: `Шалгах (${overview.sheetCheck})` },
          ]}
        />
      )}

      {lane === "all" && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-dim" aria-label="Өнгөний тайлбар">
          {(["auto", "open", "other", "expense", "sheet"] as const).map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span aria-hidden className={`size-2.5 rounded-full ${TONE[t].dot}`} />
              {t === "auto" ? "Сургалтын төлбөр" : TONE[t].label}
            </span>
          ))}
        </p>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-dim" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Гүйлгээний утга эсвэл дүнгээр хайх"
          aria-label="Гүйлгээ хайх"
          className={`${inputCls} pl-9`}
        />
      </div>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            loadOverview();
            loadRows("reset");
          }}
        />
      ) : rows === null ? (
        <SkeletonRows rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title={q ? "Хайлтад тохирох гүйлгээ алга" : LANES.find((l) => l.key === lane)!.empty} />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <RowCard key={r.id} row={r} onDone={onDone} />
          ))}
          {rows.length < total && (
            <Button variant="outline" className="w-full" onClick={() => loadRows("append")}>
              Цааш үзэх ({total - rows.length})
            </Button>
          )}
        </div>
      )}

    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarCheck2, FileUp, Inbox, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/kit/tabs";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { inputCls } from "@/components/payments/LedgerDialog";
import { dayLabel } from "@/components/payments/ledgerFormat";
import { errMsg } from "@/components/payments/paymentHelpers";
import RowCard from "./RowCard";
import type { BankRow, ImportSummary, Lane, Overview } from "./types";

const LANES: { key: Lane; label: string; empty: string }[] = [
  { key: "manual", label: "Шийдэх", empty: "Шийдэх гүйлгээ алга — бүгд хуваарилагдсан" },
  { key: "tuition", label: "Сургалтын төлбөр", empty: "Сургалтын төлбөр хараахан ороогүй" },
  { key: "other", label: "Бусад орлого", empty: "Ном, хариултын хуудас, торгууль энд харагдана" },
  { key: "expense", label: "Зарлага", empty: "Зарлага хараахан ороогүй" },
];
const PAGE = 50;

export function ReconcilePageClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [lane, setLane] = useState<Lane>("manual");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<BankRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState<ImportSummary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadOverview = useCallback(async () => {
    try {
      setOverview(await api<Overview>("/reconcile/overview"));
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  const loadRows = useCallback(
    async (append = false) => {
      setError(null);
      if (!append) setRows(null);
      try {
        const offset = append ? (rows?.length ?? 0) : 0;
        const res = await api<{ items: BankRow[]; total: number }>(
          `/reconcile/rows?lane=${lane}&limit=${PAGE}&offset=${offset}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`,
        );
        setTotal(res.total);
        setRows((prev) => (append ? [...(prev ?? []), ...res.items] : res.items));
      } catch (e) {
        setError(errMsg(e));
      }
    },
    // rows-ийг зөвхөн «Цааш үзэх»-д уншина
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lane, q],
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);
  useEffect(() => {
    const t = setTimeout(() => loadRows(false), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadRows, q]);

  const refresh = (alsoResolved?: number) => {
    if (alsoResolved) toast.success(`Өмнө оноосон данс, утсаар өөр ${alsoResolved} гүйлгээ автоматаар орлоо`);
    loadOverview();
    loadRows(false);
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
      setLane("manual");
      refresh();
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
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-start gap-3">
          <CalendarCheck2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-semibold text-ink">
              {cursor ? `${dayLabel(cursor.settledThrough)} хүртэл бүрэн шийдэгдсэн` : "Хуулга хараахан ороогүй"}
            </p>
            <p className="text-sm text-ink-dim">
              {cursor
                ? `Дараагийн хуулгаас ${dayLabel(cursor.settledThrough)}-ээс хойшхи гүйлгээ л орно. Хуулга ${dayLabel(cursor.coveredThrough)} хүртэл бүтэн`
                : "Хаан банкны интернэт банкнаас «Дансны хуулга»-г Excel-ээр татаж оруулна"}
            </p>
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button onClick={() => fileRef.current?.click()} disabled={importing}>
          <FileUp /> {importing ? "Уншиж байна" : "Хуулга оруулах"}
        </Button>
      </section>

      {lastImport && (
        <p className="rounded-2xl bg-info/10 px-4 py-3 text-sm text-ink">
          Хуулгад {lastImport.rows} гүйлгээ: шинээр {lastImport.newRows} орж, {lastImport.duplicates + lastImport.beforeSettled} нь өмнө
          орсон тул алгасагдлаа. Автоматаар {lastImport.autoResolved} шийдэгдэж, {lastImport.open} гүйлгээ шийдэх жагсаалтад байна
        </p>
      )}

      <Tabs value={lane} onValueChange={(v) => setLane(v as Lane)}>
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
        <ErrorState message={error} onRetry={() => refresh()} />
      ) : rows === null ? (
        <SkeletonRows rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title={q ? "Хайлтад тохирох гүйлгээ алга" : LANES.find((l) => l.key === lane)!.empty} />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <RowCard key={r.id} row={r} onChanged={refresh} />
          ))}
          {rows.length < total && (
            <Button variant="outline" className="w-full" onClick={() => loadRows(true)}>
              Цааш үзэх ({total - rows.length})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

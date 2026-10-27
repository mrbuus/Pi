"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  FileSpreadsheet,
  Info,
  RefreshCw,
  Search,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api, getRole } from "@/lib/api";
import { Meta } from "@/components/ui/Meta";
import { Button } from "@/components/ui/kit/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { studentHref } from "./LedgerRowItem";
import { dayLabel, mnt, stampLabel } from "./ledgerFormat";
import { errMsg } from "./paymentHelpers";

/* ============================================================================
 * «Шийт» (эзэн 2026-10-27) — «2027 оны төлбөрийн мэдээлэл» Google Sheet 5 минут
 * тутам вэбд орно. Энд зөвхөн синкийн төлөв ба ЗӨРҮҮ харагдана — төлбөр өөрөө
 * «Ангиуд», «Түүх»-д, тэмдэглэл сурагчийн хуудсанд. Зөрүүг төрлөөр нь бүлэглэж
 * хаалттай харуулна (нэг дор олон мөр харагдаж заваарахгүй).
 * ========================================================================== */

type Severity = "ERROR" | "WARN" | "INFO";
interface SyncStatus {
  configured: boolean;
  enabled: boolean;
  running: boolean;
  lastRun: { startedAt: string; finishedAt: string | null; ok: boolean; skipped: boolean; error: string | null } | null;
  lastFullAt: string | null;
  last: {
    rows?: Record<string, number>;
    payments?: { inserted?: number; amount?: number; skipped?: boolean };
    createdStudents?: number;
  } | null;
  open: { severity: Severity; kind: string; count: number }[];
}
interface SheetIssue {
  id: string;
  kind: string;
  severity: Severity;
  tab: string | null;
  rowNumber: number | null;
  studentId: string | null;
  title: string;
  detail: { cells?: { cell: string; sheet: number; web: number }[]; held?: { cell: string; amount: number; label: string }[] } | null;
  firstSeenAt: string;
}
interface SheetRows {
  tabs: { tab: string; count: number }[];
  tab: string | null;
  headers: Record<string, string>;
  items: { id: string; rowNumber: number; cells: Record<string, string | number>; studentId: string | null }[];
  total: number;
}

const SEVERITY: Record<Severity, { label: string; icon: LucideIcon; cls: string }> = {
  ERROR: { label: "Шалгах", icon: CircleAlert, cls: "bg-error/12 text-error" },
  WARN: { label: "Анхааруулга", icon: TriangleAlert, cls: "bg-warning/15 text-warning" },
  INFO: { label: "Мэдээлэл", icon: Info, cls: "bg-info/12 text-info" },
};
const KIND_LABEL: Record<string, string> = {
  SYNC_FAILED: "Шийтээс татаж чадсангүй",
  HEADER: "Шийтийн бүтэц өөрчлөгдсөн",
  PAYMENT_MISMATCH: "Шийт ба вэбийн дүн зөрсөн",
  DUPLICATE_ROW: "Давхар мөр",
  TOTAL_MISMATCH: "Урьдчилгааны нийлбэр таарахгүй",
  UNMATCHED: "Вэбд олдоогүй хүүхэд",
  CONFLICT: "Ижил нэртэй хүүхэд",
  POSSIBLE_DUPLICATE: "Давхар бүртгэл байж магадгүй",
  CREATE_FAILED: "Автоматаар бүртгэж чадаагүй",
  WEB_ONLY: "Вэбд байгаа ч шийтэд алга",
  LEFT_BUT_ACTIVE: "Гарсан ч ангид идэвхтэй",
  DUAL_COURSE: "Хоёр хичээлтэй",
  NOT_IN_MAIN: "Эзэн жагсаалтад алга",
  BAD_PHONE: "Утасны дугаар буруу",
  RECEIPT_UNREAD: "Баримтын огноо уншигдаагүй",
  ROW_GONE: "Шийтээс устгасан мөр",
  UNLINKED_PAYMENT: "Нүдээ олоогүй гүйлгээ",
  FULL_SPLIT: "Бүтэн жилийн задаргаа",
  FORM_UNKNOWN: "Танигдаагүй хэлбэр",
  PAYMENT_ORPHAN: "Жагсаалтаас хасагдсан",
};
const FILTERS: { key: "" | Severity; label: string }[] = [
  { key: "", label: "Бүгд" },
  { key: "ERROR", label: "Шалгах" },
  { key: "WARN", label: "Анхааруулга" },
  { key: "INFO", label: "Мэдээлэл" },
];

/** «main|2026-09» → «9-р сар», «social|2026-10» → «Нийгэм 10-р сар» */
function cellLabel(cell: string): string {
  const [sheet, rest = ""] = cell.split("|");
  const m = rest.match(/^\d{4}-(\d{2})(?:@(\w+))?/);
  const month = m ? `${Number(m[1])}-р сар${m[2] ? ` (${m[2]} багана)` : ""}` : rest;
  return sheet === "social" ? `Нийгэм ${month}` : month;
}
function ago(iso: string | null): string {
  if (!iso) return "хараахан татаагүй";
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 1) return "саяхан";
  if (min < 60) return `${min} минутын өмнө`;
  if (min < 24 * 60) return `${Math.round(min / 60)} цагийн өмнө`;
  return stampLabel(iso);
}

export default function SheetSyncPanel() {
  const isAdmin = getRole() === "ADMIN";
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<"" | Severity>("");
  const [open, setOpen] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const poll = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    api<SyncStatus>("/sheet-sync/status")
      .then((d) => {
        setStatus(d);
        setError(null);
      })
      .catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(() => {
    load();
    return () => {
      if (poll.current) clearTimeout(poll.current);
    };
  }, [load]);

  // Гараар татахад сервер шууд хариулна; дуустал 3 секунд тутам төлөв шалгана
  const waitUntilDone = useCallback(
    (tries = 0) => {
      poll.current = setTimeout(() => {
        api<SyncStatus>("/sheet-sync/status")
          .then((d) => {
            setStatus(d);
            if (d.running && tries < 40) return waitUntilDone(tries + 1);
            setRefresh((n) => n + 1);
            if (d.lastRun?.ok) toast.success("Шийтээс татаж дууслаа");
            else if (d.lastRun) toast.error("Шийтээс татаж чадсангүй");
          })
          .catch(() => undefined);
      }, 3000);
    },
    [],
  );
  async function runNow() {
    try {
      const r = await api<{ started: boolean }>("/sheet-sync/run", { method: "POST" });
      toast(r.started ? "Шийтээс татаж эхэллээ" : "Татаж байгаа — түр хүлээнэ үү");
      setStatus((s) => (s ? { ...s, running: true } : s));
      waitUntilDone();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  if (error && !status) return <ErrorState message={error} onRetry={load} />;
  if (!status) return <LoadingState rows={4} label="Шийтийн төлөв" />;
  if (!status.configured)
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="Шийтийн холболт тохируулаагүй"
        hint="Төлбөрийн шийтийг уншдаг түлхүүрийг серверт тохируулсны дараа энд гарна"
      />
    );

  const failed = status.lastRun && !status.lastRun.ok;
  const rows = Object.values(status.last?.rows ?? {}).reduce((t, n) => t + n, 0);
  const groups = status.open.filter((g) => !severity || g.severity === severity);
  const count = (s: "" | Severity) => status.open.filter((g) => !s || g.severity === s).reduce((t, g) => t + g.count, 0);

  return (
    <div className="space-y-4">
      <section className="chunky space-y-3 p-4" aria-label="Шийтийн синкийн төлөв">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${failed ? "bg-error/12 text-error" : "bg-success/15 text-success"}`}
          >
            {failed ? <CircleAlert className="h-5 w-5" aria-hidden /> : <CircleCheck className="h-5 w-5" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">{failed ? "Сүүлийн удаа татаж чадсангүй" : "Шийттэй холбогдсон"}</p>
            <p className="text-sm text-ink-dim">
              <Meta
                items={[
                  `Шалгасан ${ago(status.lastRun?.finishedAt ?? null)}`,
                  status.enabled ? "5 минут тутам автоматаар" : "Автомат татах унтраалттай",
                ]}
              />
            </p>
          </div>
          {isAdmin && (
            <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={status.running} onClick={() => void runNow()}>
              <RefreshCw className={status.running ? "motion-safe:animate-spin" : undefined} aria-hidden />
              {status.running ? "Татаж байна" : "Одоо татах"}
            </Button>
          )}
        </div>
        {status.last && (
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Шийтийн мөр", value: rows.toLocaleString("en-US") },
              { label: "Сүүлд нэмсэн гүйлгээ", value: String(status.last.payments?.inserted ?? 0) },
              { label: "Шинэ сурагч", value: String(status.last.createdStudents ?? 0) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-bg px-2 py-2">
                <dt className="text-xs text-ink-dim">{s.label}</dt>
                <dd className="font-display text-lg font-bold tabular-nums text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="space-y-3" aria-label="Шийтийн зөрүү">
        <div role="radiogroup" aria-label="Зөрүүний төрөл" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="radio"
              aria-checked={severity === f.key}
              onClick={() => setSeverity(f.key)}
              className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition ${
                severity === f.key ? "border-brand bg-brand-tint text-ink" : "border-line text-ink-dim hover:text-ink"
              }`}
            >
              {f.label} <span className="tabular-nums">{count(f.key)}</span>
            </button>
          ))}
        </div>
        {!groups.length ? (
          <EmptyState title="Зөрүү алга" hint="Шийт ба вэбийн мэдээлэл таарч байна" />
        ) : (
          <ul className="chunky divide-y divide-line p-1.5">
            {groups.map((g) => {
              const sev = SEVERITY[g.severity];
              const key = `${g.severity}:${g.kind}`;
              const expanded = open === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : key)}
                    className="row-interactive flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${sev.cls}`}>
                      <sev.icon className="h-4 w-4" aria-label={sev.label} />
                    </span>
                    <span className="min-w-0 flex-1 font-semibold text-ink">{KIND_LABEL[g.kind] ?? g.kind}</span>
                    <span className="tabular-nums text-sm font-bold text-ink-dim">{g.count}</span>
                    <ChevronDown className={`h-4 w-4 text-ink-dim transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
                  </button>
                  {expanded && <IssueList kind={g.kind} severity={g.severity} isAdmin={isAdmin} refresh={refresh} onChanged={() => { load(); setRefresh((n) => n + 1); }} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isAdmin && <RawRows refresh={refresh} />}
    </div>
  );
}

function IssueList({ kind, severity, isAdmin, refresh, onChanged }: { kind: string; severity: Severity; isAdmin: boolean; refresh: number; onChanged: () => void }) {
  const [data, setData] = useState<{ items: SheetIssue[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const load = useCallback(
    (offset = 0) => {
      api<{ items: SheetIssue[]; total: number }>(`/sheet-sync/issues?kind=${encodeURIComponent(kind)}&severity=${severity}&offset=${offset}&limit=30`)
        .then((d) => {
          setData((prev) => (offset && prev ? { ...d, items: [...prev.items, ...d.items] } : d));
          setError(null);
        })
        .catch((e) => setError(errMsg(e)))
        .finally(() => setMore(false));
    },
    [kind, severity],
  );
  useEffect(() => load(0), [load, refresh]);

  if (error && !data) return <div className="px-2 pb-3"><ErrorState message={error} onRetry={() => load(0)} /></div>;
  if (!data) return <div className="px-2 pb-3"><LoadingState rows={3} label="Зөрүү" /></div>;
  return (
    <div className="space-y-2 px-2 pb-3">
      <ul className="space-y-2">
        {data.items.map((i) => (
          <IssueItem key={i.id} issue={i} isAdmin={isAdmin} onChanged={onChanged} />
        ))}
      </ul>
      {data.items.length < data.total && (
        <Button variant="outline" className="w-full" disabled={more} onClick={() => { setMore(true); load(data.items.length); }}>
          {more ? "Ачаалж байна" : `Цааш ${Math.min(30, data.total - data.items.length)}`}
        </Button>
      )}
    </div>
  );
}

function IssueItem({ issue, isAdmin, onChanged }: { issue: SheetIssue; isAdmin: boolean; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const cells = issue.detail?.cells ?? [];
  const held = issue.detail?.held ?? [];
  async function apply() {
    if (!issue.studentId) return;
    setBusy(true);
    try {
      const r = await api<{ cells: number; inserted: number }>(`/sheet-sync/students/${encodeURIComponent(issue.studentId)}/apply`, { method: "POST" });
      toast.success(`Шийтийн дүнгээр тааруулав (${r.cells} нүд)`);
      onChanged();
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
      setConfirming(false);
    }
  }
  return (
    <li className="rounded-xl bg-bg px-3 py-2.5">
      <p className="text-sm text-ink">{issue.title}</p>
      <p className="mt-0.5 text-xs text-ink-dim">
        <Meta
          items={[
            issue.tab ? `${issue.tab}${issue.rowNumber ? `, ${issue.rowNumber}-р мөр` : ""}` : null,
            `Илэрсэн ${dayLabel(issue.firstSeenAt.slice(0, 10))}`,
          ]}
        />
      </p>
      {(cells.length > 0 || held.length > 0) && (
        <ul className="mt-2 space-y-1 text-xs">
          {cells.map((c) => (
            <li key={c.cell} className="flex flex-wrap justify-between gap-x-3 tabular-nums">
              <span className="font-semibold text-ink">{cellLabel(c.cell)}</span>
              <span className="text-ink-dim">
                шийт {mnt(c.sheet)}, вэб {mnt(c.web)}
              </span>
            </li>
          ))}
          {held.map((h) => (
            <li key={`h-${h.cell}-${h.amount}`} className="flex flex-wrap justify-between gap-x-3 tabular-nums text-ink-dim">
              <span>Хүлээгдэж буй: {h.label}</span>
              <span>{mnt(h.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      {(issue.studentId || (isAdmin && issue.kind === "PAYMENT_MISMATCH")) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {issue.studentId && (
            <Link href={studentHref(issue.studentId)} className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-brand hover:underline">
              Сурагчийн төлбөр
            </Link>
          )}
          {isAdmin && issue.kind === "PAYMENT_MISMATCH" && issue.studentId &&
            (confirming ? (
              <>
                <Button size="sm" variant="danger" className="min-h-11" disabled={busy} onClick={() => void apply()}>
                  {busy ? "Тааруулж байна" : "Тийм, шийтээр засах"}
                </Button>
                <Button size="sm" variant="ghost" className="min-h-11" disabled={busy} onClick={() => setConfirming(false)}>
                  Болих
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className="min-h-11" onClick={() => setConfirming(true)}>
                Шийтээр засах
              </Button>
            ))}
        </div>
      )}
      {confirming && (
        <p className="mt-1 text-xs text-ink-dim">
          Зөрсөн нүдний вэб дэх гүйлгээг буцааж (түүх нь үлдэнэ), шийтийн дүнгээр шинээр бичнэ
        </p>
      )}
    </li>
  );
}

/** Шийтийн бүх мөр (Админ) — «гарсан», «Илүү төлөлт» зэрэг төлбөрт ордоггүй хуудсыг ч харна. */
function RawRows({ refresh }: { refresh: number }) {
  const [shown, setShown] = useState(false);
  const [tab, setTab] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [data, setData] = useState<SheetRows | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (offset = 0) => {
      const params = new URLSearchParams({ offset: String(offset) });
      if (tab) params.set("tab", tab);
      if (q.trim().length >= 2) params.set("q", q.trim());
      api<SheetRows>(`/sheet-sync/rows?${params}`)
        .then((d) => {
          setData((prev) => (offset && prev ? { ...d, items: [...prev.items, ...d.items] } : d));
          setError(null);
        })
        .catch((e) => setError(errMsg(e)));
    },
    [tab, q],
  );
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => load(0), 300);
    return () => clearTimeout(t);
  }, [shown, load, refresh]);

  return (
    <section className="chunky p-1.5" aria-label="Шийтийн мөрүүд">
      <button
        type="button"
        aria-expanded={shown}
        onClick={() => setShown((v) => !v)}
        className="row-interactive flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 text-left"
      >
        <FileSpreadsheet className="h-5 w-5 text-ink-dim" aria-hidden />
        <span className="flex-1 font-semibold text-ink">Шийтийн бүх мөр</span>
        <ChevronDown className={`h-4 w-4 text-ink-dim transition-transform ${shown ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {shown && (
        <div className="space-y-3 px-2 pb-3 pt-1">
          {data && (
            <div role="radiogroup" aria-label="Хуудас" className="flex flex-wrap gap-1.5">
              {data.tabs.map((t) => (
                <button
                  key={t.tab}
                  type="button"
                  role="radio"
                  aria-checked={data.tab === t.tab}
                  onClick={() => setTab(t.tab)}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${data.tab === t.tab ? "border-brand bg-brand-tint text-ink" : "border-line text-ink-dim hover:text-ink"}`}
                >
                  {t.tab} <span className="tabular-nums">{t.count}</span>
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
            <label htmlFor="sheet-row-search" className="sr-only">
              Мөр хайх
            </label>
            <input
              id="sheet-row-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Нэр, утас эсвэл тэмдэглэлээр хайх"
              autoComplete="off"
              className="min-h-12 w-full rounded-2xl border border-line bg-surface pl-10 pr-3 text-base text-ink outline-none focus:border-brand sm:text-sm"
            />
          </div>
          {error && !data ? (
            <ErrorState message={error} onRetry={() => load(0)} />
          ) : !data ? (
            <LoadingState rows={4} label="Шийтийн мөр" />
          ) : !data.items.length ? (
            <EmptyState title="Мөр олдсонгүй" hint={q ? "Өөр үгээр хайж үзнэ үү" : undefined} />
          ) : (
            <>
              <ul className="space-y-2">
                {data.items.map((r) => (
                  <li key={r.id} className="rounded-xl bg-bg px-3 py-2.5">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold text-ink">{[r.cells.B, r.cells.C].filter(Boolean).join(" ") || "Нэргүй мөр"}</span>
                      <span className="text-xs text-ink-dim">{r.rowNumber}-р мөр</span>
                      {r.studentId && (
                        <Link href={studentHref(r.studentId)} className="text-xs font-semibold text-brand hover:underline">
                          Вэб дэх сурагч
                        </Link>
                      )}
                    </p>
                    <dl className="mt-1 grid gap-x-4 gap-y-0.5 text-xs sm:grid-cols-2">
                      {Object.entries(r.cells)
                        .filter(([col]) => col !== "B" && col !== "C")
                        .map(([col, v]) => (
                          <div key={col} className="flex min-w-0 gap-1.5">
                            <dt className="shrink-0 text-ink-dim">{data.headers[col] ?? col}:</dt>
                            <dd className="min-w-0 break-words tabular-nums text-ink">{typeof v === "number" && Math.abs(v) >= 1000 ? v.toLocaleString("en-US") : String(v)}</dd>
                          </div>
                        ))}
                    </dl>
                  </li>
                ))}
              </ul>
              {data.items.length < data.total && (
                <Button variant="outline" className="w-full" onClick={() => load(data.items.length)}>
                  Цааш {Math.min(50, data.total - data.items.length)}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

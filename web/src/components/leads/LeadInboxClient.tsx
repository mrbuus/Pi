"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import LeadCard, {
  Lead,
  LeadStatusV,
  LeadSubject,
  STATUS_ICON,
  STATUS_LABEL,
  STATUS_ORDER,
} from "./LeadCard";
import StatsHeader from "./StatsHeader";

/** API алдааг хэрэглэгчид харуулах эвтэй мессеж болгоно (утасны дугаар
 * агуулаагүй эсэхийг анхаарна — алдааны мессежид хэзээ ч хувийн мэдээлэл
 * (утас) орохгүй, зөвхөн сервер буцаасан текст ашиглана). */
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/** Стат хэсгийн гурван тоог бодит өгөгдлөөс тооцно — хэзээ ч хатуу код биш. */
function computeStats(leads: Lead[]) {
  const total = leads.length;
  const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = leads.filter(
    (l) => new Date(l.createdAt).getTime() >= weekAgoMs,
  ).length;
  const enrolled = leads.filter((l) => l.status === "ENROLLED").length;
  const conversionRate =
    total > 0 ? Math.round((enrolled / total) * 1000) / 10 : null;
  return { total, newThisWeek, conversionRate };
}

const SUBJECT_FILTERS: { v: LeadSubject | "ALL"; t: string }[] = [
  { v: "ALL", t: "Бүгд" },
  { v: "MATH", t: "Математик" },
  { v: "SOCIAL_STUDIES", t: "Нийгэм" },
  { v: "BOTH", t: "Аль аль нь" },
];

const STATUS_FILTERS: { v: LeadStatusV | "ALL"; t: string }[] = [
  { v: "ALL", t: "Бүгд" },
  ...STATUS_ORDER.map((s) => ({ v: s, t: STATUS_LABEL[s] })),
];

// Групп хоосон үед харуулах урам өгсөн мессеж — хоосон дэлгэц биш.
const EMPTY_TEXT: Record<LeadStatusV, string> = {
  NEW: "Одоогоор шинэ хүсэлт алга",
  CONTACTED: "Холбогдсон хүсэлт алга байна",
  ENROLLED: "Одоогоор элссэн хүсэлт алга",
  LOST: "Алдагдсан хүсэлт алга — сайн байна!",
};

const GRID_COLS_CLASS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export default function LeadInboxClient() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subjectFilter, setSubjectFilter] = useState<LeadSubject | "ALL">(
    "ALL",
  );
  const [statusFilter, setStatusFilter] = useState<LeadStatusV | "ALL">(
    "ALL",
  );

  // Optimistic UI: төлөв солих оролдлого бүрийг card-аар нь дагаж, алдаа
  // гарвал буцааж, "Дахин оролдох" дарахад яг тэр л оролдлогыг давтана.
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [updateErrors, setUpdateErrors] = useState<Record<string, string>>(
    {},
  );
  const [lastAttempt, setLastAttempt] = useState<
    Record<string, LeadStatusV>
  >({});

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<Lead[]>("/leads")
      .then(setLeads)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const changeStatus = useCallback(
    (id: string, newStatus: LeadStatusV) => {
      setLeads((current) => {
        const prev = current.find((l) => l.id === id);
        if (!prev || prev.status === newStatus) return current;

        setLastAttempt((m) => ({ ...m, [id]: newStatus }));
        setUpdateErrors((m) => {
          if (!(id in m)) return m;
          const next = { ...m };
          delete next[id];
          return next;
        });
        setUpdating((m) => ({ ...m, [id]: true }));

        api(`/leads/${id}/status`, {
          method: "PATCH",
          body: { status: newStatus },
        })
          .catch((e) => {
            // Амжилтгүй бол сая хийсэн өөрчлөлтөө буцааж, харагдахуйц алдаа
            // үзүүлнэ — хэрэглэгч чимээгүйхэн буруу төлөвт үлдэхгүй.
            setLeads((ls) =>
              ls.map((l) => (l.id === id ? { ...l, status: prev.status } : l)),
            );
            setUpdateErrors((m) => ({ ...m, [id]: errMsg(e) }));
          })
          .finally(() => {
            setUpdating((m) => {
              const next = { ...m };
              delete next[id];
              return next;
            });
          });

        return current.map((l) => (l.id === id ? { ...l, status: newStatus } : l));
      });
    },
    [],
  );

  const retryStatus = useCallback(
    (id: string) => {
      const target = lastAttempt[id];
      if (target) changeStatus(id, target);
    },
    [lastAttempt, changeStatus],
  );

  // Статистик нь шүүлтүүрээс үл хамааран БҮХ хүсэлтээс тооцогдоно — эс
  // бөгөөс "хөрвүүлэлт" гэх мэт тоо шүүлтээр хазайж, бизнесийн бодит
  // үзүүлэлт болохгүй. (useMemo биш — Date.now() цаг мөчийн утга учир
  // memo-д хадгалахгүй, шууд тооцоолно.)
  const stats = computeStats(leads);

  const filteredLeads = useMemo(
    () =>
      subjectFilter === "ALL"
        ? leads
        : leads.filter((l) => l.subject === subjectFilter),
    [leads, subjectFilter],
  );

  const columns = useMemo(
    () =>
      STATUS_ORDER.filter(
        (s) => statusFilter === "ALL" || statusFilter === s,
      ).map((status) => ({
        status,
        // Сервер аль хэдийн newest-first буцаадаг (findAll: orderBy createdAt
        // desc), шүүлт хийхэд энэ дараалал хадгалагдана.
        items: filteredLeads.filter((l) => l.status === status),
      })),
    [filteredLeads, statusFilter],
  );

  const pillCls = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs transition ${
      active
        ? "bg-brand-bright text-on-brand"
        : "border border-line text-ink-dim hover:border-brand"
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Хүсэлтийн урсгал</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Facebook-с ирсэн „мэдээлэл авъя” хүсэлтүүд — шинэ хүсэлтэд аль
          болох хурдан хариу өгөх нь элсэлт болгоход хамгийн чухал.
        </p>
      </div>

      <StatsHeader
        total={stats.total}
        newThisWeek={stats.newThisWeek}
        conversionRate={stats.conversionRate}
      />

      {loading && (
        <p className="animate-pulse text-sm text-ink-dim" role="status">
          Ачаалж байна…
        </p>
      )}

      {error && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          <span>⚠ {error}</span>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
          >
            Дахин ачаалах
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-ink-dim">
                Хичээл:
              </span>
              {SUBJECT_FILTERS.map((f) => (
                <button
                  key={f.v}
                  type="button"
                  onClick={() => setSubjectFilter(f.v)}
                  className={pillCls(subjectFilter === f.v)}
                >
                  {f.t}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-ink-dim">
                Төлөв:
              </span>
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.v}
                  type="button"
                  onClick={() => setStatusFilter(f.v)}
                  className={pillCls(statusFilter === f.v)}
                >
                  {f.v !== "ALL" && (
                    <span aria-hidden className="mr-1">
                      {STATUS_ICON[f.v]}
                    </span>
                  )}
                  {f.t}
                </button>
              ))}
            </div>
          </div>

          {leads.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-8 text-center">
              <p className="text-lg font-semibold text-ink">
                Одоогоор шинэ хүсэлт алга
              </p>
              <p className="mt-1 text-sm text-ink-dim">
                Facebook хуудаснаас „мэдээлэл авъя” гэсэн хүсэлт ирмэгц энд
                харагдана.
              </p>
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 gap-4 ${
                GRID_COLS_CLASS[columns.length] ?? "lg:grid-cols-4"
              }`}
            >
              {columns.map((col) => (
                <section
                  key={col.status}
                  className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-panel p-3"
                >
                  <div className="flex items-center justify-between px-1">
                    <h2 className="flex items-center gap-1.5 font-bold text-ink">
                      <span aria-hidden>{STATUS_ICON[col.status]}</span>
                      {STATUS_LABEL[col.status]}
                    </h2>
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-dim">
                      {col.items.length}
                    </span>
                  </div>

                  {col.items.length === 0 ? (
                    <p className="px-1 text-sm text-ink-dim">
                      {EMPTY_TEXT[col.status]}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {col.items.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          updating={!!updating[lead.id]}
                          error={updateErrors[lead.id] ?? null}
                          onStatusChange={changeStatus}
                          onRetry={retryStatus}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

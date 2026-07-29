"use client";

import { Coins, NotebookPen } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import RequireRole from "@/components/nav/RequireRole";
import AuditDiff from "./AuditDiff";
import AuditFilters from "./AuditFilters";
import { MONEY_ENTITY, GRADE_ENTITY, errMsg } from "./auditHelpers";
import type {
  AuditFilterValues,
  AuditListResponse,
  StaffUser,
} from "./types";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Админ",
  TEACHER_PLUS: "Багш+",
  TEACHER: "Багш",
  STUDENT: "Сурагч",
  PARENT: "Эцэг эх",
  BUYER: "Худалдан авагч",
};

const EMPTY_FILTERS: AuditFilterValues = {
  entity: "",
  actorId: "",
  action: "",
  from: "",
  to: "",
};

const PAGE_SIZE = 30;

/** ADMIN-д зориулсан аудит логийн үзэгч — шүүлтүүр, хуудаслалт, талбар тус бүрийн диф. */
export default function AuditClient() {
  const [filters, setFilters] = useState<AuditFilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<AuditFilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<AuditListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Ажилтны нэрсийг нэг удаа авч, actorId -> нэр харуулахад ашиглана
  useEffect(() => {
    api<StaffUser[]>("/users")
      .then((rows) =>
        setStaff(
          rows.filter(
            (u) => u.role !== "STUDENT" && u.role !== "PARENT" && u.role !== "BUYER",
          ),
        ),
      )
      .catch(() => {});
  }, []);

  const actorName = useMemo(() => {
    const map = new Map(staff.map((s) => [s.id, s]));
    return (id: string) => {
      const u = map.get(id);
      if (!u) return `${id.slice(0, 10)}…`;
      return `${u.firstName} ${u.lastName}`;
    };
  }, [staff]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (appliedFilters.entity) params.set("entity", appliedFilters.entity);
    if (appliedFilters.actorId) params.set("actorId", appliedFilters.actorId);
    if (appliedFilters.action) params.set("action", appliedFilters.action);
    if (appliedFilters.from) params.set("from", appliedFilters.from);
    if (appliedFilters.to) params.set("to", appliedFilters.to);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    api<AuditListResponse>(`/audit?${params.toString()}`)
      .then(setData)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [appliedFilters, page]);

  useEffect(load, [load]);

  function applyFilters() {
    setPage(1);
    setAppliedFilters(filters);
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function toggle(id: string) {
    setExpanded((m) => ({ ...m, [id]: !m[id] }));
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS"]}>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Аудит лог</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Систем дэх бүх өөрчлөлт — хэн, юуг, хэзээ, ямар шалтгаанаар өөрчилснийг
          харна. Мөнгө болон дүнтэй холбоотой бичлэгийг тодруулж харуулна.
        </p>
      </div>

      <AuditFilters
        values={filters}
        staff={staff}
        onChange={setFilters}
        onSubmit={applyFilters}
        onReset={resetFilters}
      />

      {loading && (
        <p className="animate-pulse text-sm text-ink-dim" role="status">
          Ачаалж байна…
        </p>
      )}
      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          ⚠ {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <p className="text-xs text-ink-dim">
            Нийт {data.total} бичлэг · хуудас {data.page}/{totalPages}
          </p>

          <div className="space-y-2">
            {data.items.length === 0 && (
              <p className="text-sm text-ink-dim">Тохирох бичлэг олдсонгүй</p>
            )}
            {data.items.map((row) => {
              const isMoney = MONEY_ENTITY.test(row.entity);
              const isGrade = GRADE_ENTITY.test(row.entity);
              const open = !!expanded[row.id];
              return (
                <div
                  key={row.id}
                  className={`rounded-xl border p-4 ${
                    isMoney
                      ? "border-warning/40 bg-warning/5"
                      : isGrade
                        ? "border-info/40 bg-info/5"
                        : "border-line"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(row.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                    aria-expanded={open}
                  >
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      {isMoney && <Coins className="h-4 w-4 text-warning" aria-hidden />}
                      {isGrade && <NotebookPen className="h-4 w-4 text-info" aria-hidden />}
                      <span className="font-bold">{row.action}</span>
                      <span className="text-ink-dim">{row.entity}</span>
                      <span className="rounded-full bg-panel px-2 py-0.5 text-xs text-ink-dim">
                        {actorName(row.actorId)} ·{" "}
                        {ROLE_LABEL[row.actorRole] ?? row.actorRole}
                      </span>
                    </span>
                    <span className="text-xs text-ink-dim">
                      {new Date(row.at).toLocaleString("en-US")} {open ? "▲" : "▼"}
                    </span>
                  </button>

                  {open && (
                    <div className="mt-3 space-y-2 border-t border-line pt-3">
                      {row.reason && (
                        <p className="text-sm">
                          <span className="font-semibold text-ink-dim">
                            Шалтгаан:{" "}
                          </span>
                          {row.reason}
                        </p>
                      )}
                      <AuditDiff before={row.before} after={row.after} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition disabled:opacity-40"
            >
              ‹ Өмнөх
            </button>
            <span className="text-sm text-ink-dim">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition disabled:opacity-40"
            >
              Дараах ›
            </button>
          </div>
        </>
      )}
    </div>
    </RequireRole>
  );
}

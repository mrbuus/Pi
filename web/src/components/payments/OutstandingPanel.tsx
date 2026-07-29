"use client";

import { Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMnt } from "@/lib/orgInfo";
import { errMsg, TUITION_PLAN_LABEL } from "./paymentHelpers";
import type { OutstandingRow } from "./types";

function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\s/g, "");
  if (!digits) return null;
  return `tel:${digits}`;
}

/**
 * Тухайн сард дутуу төлсөн танхимын сурагчид — хамгийн их зөрүүтэй нь
 * эхэндээ (GET /payments/outstanding), нэг товшилтоор залгах боломжтой.
 */
export default function OutstandingPanel({ month }: { month: string }) {
  const [rows, setRows] = useState<OutstandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api<OutstandingRow[]>(`/payments/outstanding?month=${month}`)
      .then(setRows)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [month]);

  const totalShortfall = rows.reduce((sum, r) => sum + r.shortfall, 0);

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-brand-soft">
          Төлөөгүй / дутуу төлсөн сурагчид — {month}
        </h2>
        {!loading && !error && rows.length > 0 && (
          <span className="rounded-full bg-error/15 px-3 py-0.5 text-xs font-bold text-error">
            Нийт зөрүү {formatMnt(totalShortfall)}
          </span>
        )}
      </div>

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
      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-ink-dim">Энэ сард бүгд бүрэн төлсөн байна</p>
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r) => {
            const href = telHref(r.phone);
            return (
              <div
                key={r.studentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {r.firstName} {r.lastName}
                  </p>
                  <p className="text-xs text-ink-dim">
                    {r.classroomName}
                    {r.tuitionPlan &&
                      ` · ${TUITION_PLAN_LABEL[r.tuitionPlan] ?? r.tuitionPlan}`}
                    {r.tuitionAmount != null &&
                      ` · Ёстой ${formatMnt(r.tuitionAmount)}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-ink-dim">
                    Төлсөн {formatMnt(r.totalPaid)}
                  </span>
                  <span className="rounded-full bg-error/15 px-3 py-0.5 text-xs font-bold text-error">
                    Дутуу {formatMnt(r.shortfall)}
                  </span>
                  {href ? (
                    <a
                      href={href}
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-brand"
                    >
                      <Phone className="h-3 w-3" aria-hidden /> {r.phone}
                    </a>
                  ) : (
                    <span className="text-xs text-ink-dim">Утасгүй</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

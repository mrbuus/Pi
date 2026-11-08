"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useState } from "react";
import InfoHint from "@/components/ui/InfoHint";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { mnt } from "@/components/payments/ledgerFormat";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { md } from "./withdrawal/types";

/**
 * «Одоо гарвал буцаах дүн» (эзэн 2026-11-08) — сурагчийн хуудас ба ирцийн самбарын drawer.
 * API: GET /tuition/refund-estimate/:id. Багшид сервер зөвхөн буцаах дүн + хичээлийн тоог өгнө
 * (`money: null`); Админ, Багш+ ногдох/төлсөн дүнг ч харна. Тооцоо = «Сургалтаас хасах»-тай ЯГ ижил.
 */
export type RefundEstimate =
  | {
      applicable: true;
      refund: number;
      basis: {
        countFrom: string;
        asOf: string;
        webStart: string | null;
        fullMonths: number;
        lessonsHeld: number;
        lessonsAssumed: number;
        lessonsPerMonth: number;
        current: { start: string; end: string; lessons: number; counted: number; leaveDay: string | null } | null;
      };
      money: {
        monthlyFee: number;
        perLesson: number;
        owed: number;
        paid: number;
        refundedBefore: number;
        cycles: { start: string; end: string; full: boolean; counted: number; charge: number }[];
      } | null;
    }
  | { applicable: false; reason: "ARCHIVED" | "NO_CLASS" | "NO_SCHEDULE" };

type State = { status: "loading" } | { status: "error" } | { status: "ready"; data: RefundEstimate };

function useRefundEstimate(studentId: string) {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    api<RefundEstimate>(`/tuition/refund-estimate/${encodeURIComponent(studentId)}`)
      .then((data) => alive && setState({ status: "ready", data }))
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
  }, [studentId]);
  return state;
}

const HINT =
  "«Сургалтаас хасах» үеийн гэрээний тооцоо, өнөөдрөөр. Бүтэн сар бүр сарын төлбөрөөр, энэ сар суусан хичээлээр (сарын төлбөр ÷ 16 эсвэл 12). Тасалсан өдөр хасагдахгүй, энэ сарын 1 чөлөө хасагдана. Вэбд ирц бүртгэхээс өмнөх хичээлд бүгдэд нь суусан гэж тооцно";

/**
 * Нэг мөр: «Одоо гарвал буцаах дүн: X₮» / «Буцаалтгүй». Дарахад задаргаа нээгдэнэ.
 * Анги/хуваарьгүй, хасагдсан сурагчид юу ч харуулахгүй (хасагдсанд «Гарсан тооцоо» таб бий).
 */
export default function RefundEstimateRow({ studentId, className }: { studentId: string; className?: string }) {
  const state = useRefundEstimate(studentId);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  if (state.status === "loading")
    return (
      <div className={cn("space-y-1.5", className)} aria-busy="true" aria-label="Буцаах дүн бодож байна">
        <SkeletonLine width="60%" height={14} />
      </div>
    );
  if (state.status === "error") return null;
  const e = state.data;
  if (!e.applicable) {
    if (e.reason !== "NO_SCHEDULE") return null;
    return <p className={cn("text-sm text-ink-dim", className)}>Ангийн хуваарь алга тул буцаах дүн бодогдохгүй</p>;
  }
  const b = e.basis;
  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-brand"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-ink-dim">Одоо гарвал буцаах дүн</span>
            <span className={cn("block font-semibold tabular-nums", e.refund > 0 ? "text-ink" : "text-ink-dim")}>
              {e.refund > 0 ? mnt(e.refund) : "Буцаалтгүй"}
            </span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-ink-dim transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        <InfoHint label="Буцаах дүнгийн тайлбар">{HINT}</InfoHint>
      </div>

      {open && (
        <dl id={panelId} className="mt-1 space-y-1 border-t border-line pt-2 text-sm">
          <Row k="Тооцсон хугацаа" v={`${md(b.countFrom)}–${md(b.asOf)}`} />
          <Row k="Бүтэн сар" v={b.fullMonths > 0 ? `${b.fullMonths}` : "Байхгүй"} />
          {b.current && (
            <Row
              k={`Энэ сар (${md(b.current.start)}-нөөс)`}
              v={
                b.current.counted === b.current.lessons
                  ? `${b.current.lessons} хичээл`
                  : `${b.current.lessons} хичээлээс ${b.current.counted}`
              }
              note={b.current.leaveDay ? `${md(b.current.leaveDay)} чөлөө хассан` : null}
            />
          )}
          <Row
            k="Болсон хичээл"
            v={`${b.lessonsHeld}`}
            note={
              b.lessonsAssumed > 0
                ? `${b.lessonsAssumed} нь вэбд ирц бүртгэхээс өмнө${b.webStart ? ` (${md(b.webStart)})` : ""}, суусанд тооцсон`
                : null
            }
          />
          <Row k="Сард ногдох хичээл" v={`${b.lessonsPerMonth}`} />
          {e.money && (
            <>
              <Row k="Суусан хичээлийн төлбөр" v={mnt(e.money.owed)} />
              <Row k="Төлсөн" v={mnt(e.money.paid)} />
              {e.money.refundedBefore > 0 && <Row k="Өмнө буцаасан" v={mnt(e.money.refundedBefore)} />}
            </>
          )}
        </dl>
      )}
    </div>
  );
}

function Row({ k, v, note }: { k: string; v: string; note?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="min-w-0 text-ink-dim">
        {k}
        {note && <span className="block text-xs">{note}</span>}
      </dt>
      <dd className="shrink-0 font-semibold tabular-nums text-ink">{v}</dd>
    </div>
  );
}

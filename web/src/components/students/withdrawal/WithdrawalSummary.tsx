"use client";

import { CalendarDays, NotebookPen, ReceiptText, UserCheck } from "lucide-react";
import { mnt } from "@/components/payments/ledgerFormat";
import { Meta } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";
import { ATT_LABEL, HW_LABEL, PLAN_LABEL, md, type WithdrawalPreview } from "./types";

/**
 * Сургалтаас хасах тооцоо — хэнд ч ойлгомжтой (эзэн 2026-11-03): бүтэн сар бүр сарын төлбөрөөр,
 * гарсан сар нь суусан хичээлээр; төлсөн, ногдох, буцаах дүн; хугацааны ирц, даалгаврын тоо.
 */
export default function WithdrawalSummary({ data }: { data: WithdrawalPreview }) {
  const r = data.result;
  const last = r.cycles.at(-1);
  const att = data.history.attendance;
  const hw = data.history.homework;
  return (
    <div className="space-y-3">
      <section aria-label="Буцаах дүн" className={cn("rounded-xl border p-3", r.refund > 0 ? "border-success/40 bg-success/5" : "border-line bg-panel")}>
        <p className="text-xs font-semibold text-ink-dim">Буцаах дүн</p>
        <p className="font-display text-2xl font-extrabold tabular-nums text-ink">{mnt(r.refund)}</p>
        <p className="mt-0.5 text-sm text-ink-dim">
          {r.refund > 0
            ? `Төлсөн ${mnt(r.paid)}${r.refundedBefore ? ` − өмнө буцаасан ${mnt(r.refundedBefore)}` : ""} − суусан ${mnt(r.owed)}`
            : `Суусан хичээлийн төлбөр (${mnt(r.owed)}) төлсөн дүнгээс (${mnt(r.paid)}) их буюу тэнцүү тул буцаах дүн алга`}
        </p>
      </section>

      <section aria-label="Тооцоо" className="rounded-xl border border-line bg-surface p-3">
        <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-ink">
          <ReceiptText className="size-4 text-brand-soft" aria-hidden />
          Тооцоо
        </h4>
        <Meta
          className="mb-2 text-xs text-ink-dim"
          items={[
            data.classroom.name,
            `${PLAN_LABEL[data.plan.kind]}${data.plan.autoFull ? " (төлбөрөөр)" : data.plan.settled ? " (гараар)" : ""}`,
            `сарын төлбөр ${mnt(data.monthlyFee)}`,
            `сард ${data.lessonsPerMonth} хичээл`,
            `1 хичээл ${mnt(r.perLesson)}`,
          ]}
        />
        <ol className="divide-y divide-line text-sm">
          {r.cycles.map((c) => (
            <li key={c.start} className="flex items-start gap-2 py-1.5">
              <span className="w-24 shrink-0 tabular-nums text-ink-dim">
                {md(c.start)}–{md(c.full ? c.end : data.leftOn)}
              </span>
              <span className="min-w-0 flex-1 text-ink">
                {c.full ? (
                  "Бүтэн сар"
                ) : (
                  <>
                    Гарсан сар: {c.lessons} хичээл
                    {c.assumed ? ` (${c.assumed} нь вэбээс өмнө, суусанд тооцсон)` : ""}
                    {c.leaveDay ? `, чөлөө 1 (${md(c.leaveDay)}) хассан` : ""}
                    {c.extraDays.length ? `, ${c.extraDays.length} өдөр хассан (${c.extraDays.map(md).join(", ")})` : ""}
                    {` → ${c.counted} × ${mnt(r.perLesson)}`}
                  </>
                )}
              </span>
              <b className="shrink-0 tabular-nums text-ink">{mnt(c.charge)}</b>
            </li>
          ))}
          {r.cycles.length === 0 && <li className="py-1.5 text-ink-dim">Тооцоо эхлэхээс өмнө гарсан</li>}
        </ol>
        <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-line pt-2 text-sm">
          <div>
            <dt className="text-xs text-ink-dim">Суусан</dt>
            <dd className="font-bold tabular-nums text-ink">{mnt(r.owed)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-dim">Төлсөн</dt>
            <dd className="font-bold tabular-nums text-ink">{mnt(r.paid)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-dim">Буцаах</dt>
            <dd className="font-bold tabular-nums text-ink">{mnt(r.refund)}</dd>
          </div>
        </dl>
        {data.noSchedule && (
          <p role="alert" className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-sm text-ink">
            Ангийн хуваарь алга тул хичээлийн тоо бодогдоогүй — хуваариа оруулаад дахин шалгана уу
          </p>
        )}
        {data.payments.length > 0 && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-xs font-semibold text-ink-dim">Төлбөрүүд ({data.payments.length})</summary>
            <ul className="mt-1 space-y-0.5">
              {data.payments.map((p, i) => (
                <li key={i} className="flex justify-between tabular-nums text-ink">
                  <span className="text-ink-dim">{p.paidOn ?? p.forMonth ?? "огноогүй"}</span>
                  <span>{mnt(p.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-ink-dim">Энэ жилийн гэрээнд тооцогдох нийт: {mnt(r.paid)}</p>
          </details>
        )}
        {last && !last.full && last.counted > 0 && (
          <p className="mt-1 text-xs text-ink-dim">Гарсан сарын дүн сарын төлбөрөөс хэтрэхгүй</p>
        )}
      </section>

      <section aria-label="Суралцсан хугацаа" className="rounded-xl border border-line bg-surface p-3 text-sm">
        <h4 className="mb-1.5 flex items-center gap-1.5 font-bold text-ink">
          <CalendarDays className="size-4 text-brand-soft" aria-hidden />
          {md(data.countFrom)}–{md(data.leftOn)} хугацаанд {data.history.lessons} хичээл болсон
        </h4>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <UserCheck className="size-4 text-ink-dim" aria-label="Ирц" />
          {Object.entries(ATT_LABEL).map(([k, label]) => (
            <span key={k} className="tabular-nums text-ink">
              {label} <b>{att[k] ?? 0}</b>
            </span>
          ))}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <NotebookPen className="size-4 text-ink-dim" aria-label="Даалгавар" />
          {Object.entries(HW_LABEL).map(([k, label]) => (
            <span key={k} className="tabular-nums text-ink">
              {label} <b>{hw[k] ?? 0}</b>
            </span>
          ))}
        </p>
      </section>
    </div>
  );
}

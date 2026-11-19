"use client";

import { useMemo, useState } from "react";
import { CalendarX2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import LedgerDialog, { Field, inputCls } from "./LedgerDialog";
import {
  addDays,
  blockLabel,
  dayLabel,
  monthName,
  periodLabel,
} from "./ledgerFormat";
import { errMsg } from "./paymentHelpers";
import type { MonthBlock, StudentLedger } from "./ledgerTypes";

const REASONS = [
  "Өвчтэй байсан",
  "Чөлөө авсан",
  "Төв ажиллаагүй (засвар, амралт)",
  "Бусад",
];
const WEEKDAYS = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];
const span = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  ) + 1;

/**
 * Нэг сарын цонх (эзэн 2026-11-19): хугацаа, төлөв, «Төлбөр бүртгэх», мөн сар бүр төлдөг хүүхдэд
 * суугаагүй өдрийг банкны аппын хугацаа сонгогч шиг хоёр товшоод сонгоно:
 *  1-р товшилт = эхлэх өдөр, 2-р = дуусах өдөр (эхлэхээс өмнөх бол хоёр нь солигдоно),
 *  3-р товшилт шинээр эхэлнэ. Сонгосон хоногоор энэ сарын төгсгөл, дараагийн бүх сар хойшилно.
 */
export default function MonthDialog({
  data,
  block,
  canAbsent,
  onClose,
  onPay,
  onSaved,
}: {
  data: StudentLedger;
  block: MonthBlock;
  /** Сар бүр төлдөг, гараар бүтэн жилд тооцоогүй — суугаагүй өдөр хасаж болно */
  canAbsent: boolean;
  onClose: () => void;
  onPay: () => void;
  onSaved: () => void;
}) {
  const r = data.row;
  const period = block.period;
  // Энэ сарын хугацаанд хамаарах «ирээгүй» тэмдэглэлүүд (эхлэх өдөр нь хугацаанд)
  const gaps = (data.extensions ?? []).filter(
    (e) =>
      e.gapFrom && period && e.gapFrom >= period.from && e.gapFrom < period.to,
  );
  // Календар: хугацааны өдрүүд (дуусах өдөр нь дараагийн сарын эхлэл тул орохгүй)
  const days = useMemo(() => {
    if (!period) return [];
    const out: string[] = [];
    for (
      let d = period.from;
      d < period.to && out.length < 120;
      d = addDays(d, 1)
    )
      out.push(d);
    return out;
  }, [period]);
  const lead = days.length
    ? (new Date(`${days[0]}T00:00:00Z`).getUTCDay() + 6) % 7
    : 0;
  const marked = (d: string) =>
    gaps.some((g) => g.gapFrom! <= d && d <= (g.gapTo ?? g.gapFrom!));

  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = reason === "Бусад" ? other.trim() : reason;
  const n = start ? span(start, end ?? start) : 0;
  const inSel = (d: string) => !!start && d >= start && d <= (end ?? start);

  function tap(d: string) {
    // Эхлэх өдөр сонгоогүй, эсвэл хоёулаа сонгогдсон бол шинээр эхэлнэ
    if (!start || end) {
      setStart(d);
      setEnd(null);
      return;
    }
    if (d < start) {
      setEnd(start);
      setStart(d);
    } else setEnd(d);
  }

  async function save() {
    if (!start) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ sheetUpdated?: number }>(
        `/payments/ledger/student/${encodeURIComponent(r.id)}/extensions`,
        {
          method: "POST",
          body: { gapFrom: start, gapTo: end ?? start, reason: text },
        },
      );
      toast.success(`${n} хоног хасагдлаа`, {
        description: res.sheetUpdated
          ? `Шийтийн «Хугацаа» ${res.sheetUpdated} нүдэнд шинэчлэгдлээ`
          : "Дараагийн бүх сарын хугацаа хойшиллоо",
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    try {
      await api(
        `/payments/ledger/student/${encodeURIComponent(r.id)}/extensions/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      toast.success("Цуцаллаа — хугацаа буцаж шилжлээ");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <LedgerDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={
        period
          ? `${dayLabel(period.from)} – ${dayLabel(period.to)}`
          : monthName(block.month)
      }
      description={`${r.firstName} ${r.lastName} — ${blockLabel(block, r.plan.settled)}`}
    >
      <div className="space-y-4">
        {block.state !== "OFF" && block.state !== "PAID" && (
          <Button onClick={onPay} className="w-full">
            <Plus aria-hidden /> Төлбөр бүртгэх
          </Button>
        )}

        {canAbsent && period && (
          <section className="space-y-3" aria-labelledby="absent-title">
            <div>
              <h3
                id="absent-title"
                className="flex items-center gap-1.5 text-sm font-semibold text-ink"
              >
                <CalendarX2 className="h-4 w-4 text-ink-dim" aria-hidden />{" "}
                Суугаагүй өдөр хасах
              </h3>
              {/* Өндөр тогтвортой (2 мөр) — сонгох үед цонх үсрэхгүй, товшилт буруу өдөр дээр буухгүй */}
              <p className="min-h-10 text-sm text-ink-dim" aria-live="polite">
                {start
                  ? end
                    ? `${dayLabel(start)} – ${dayLabel(end)}: ${n} хоног. Өөр өдөр дарвал дахин сонгоно`
                    : `${dayLabel(start)}-аас эхэлнэ. Дуусах өдрөө дарна уу (нэг өдөр бол хадгална уу)`
                  : "Эхлэх өдөр, дараа нь дуусах өдрөө дарна"}
              </p>
            </div>
            <div
              className="grid grid-cols-7 gap-1"
              role="grid"
              aria-label="Энэ сарын хугацааны өдрүүд"
            >
              {WEEKDAYS.map((w) => (
                <span key={w} className="text-center text-xs text-ink-dim">
                  {w}
                </span>
              ))}
              {Array.from({ length: lead }, (_, i) => (
                <span key={`b${i}`} aria-hidden />
              ))}
              {days.map((d) => {
                const sel = inSel(d);
                const edge = d === start || d === end;
                const was = marked(d);
                const label =
                  Number(d.slice(8, 10)) === 1 || d === days[0]
                    ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
                    : String(Number(d.slice(8, 10)));
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={busy || was}
                    onClick={() => tap(d)}
                    aria-pressed={sel}
                    aria-label={`${dayLabel(d)}${was ? ", суугаагүй гэж тэмдэглэсэн" : ""}`}
                    className={`min-h-10 rounded-lg text-sm tabular-nums transition ${
                      edge
                        ? "bg-brand font-bold text-on-brand"
                        : sel
                          ? "bg-brand/20 font-semibold text-ink"
                          : was
                            ? "bg-ink/10 text-ink-dim line-through"
                            : "text-ink hover:bg-ink/[0.06]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <>
              <div
                className="flex flex-wrap gap-1.5"
                role="radiogroup"
                aria-label="Шалтгаан"
              >
                {REASONS.map((x) => (
                  <button
                    key={x}
                    type="button"
                    role="radio"
                    aria-checked={reason === x}
                    onClick={() => setReason(x)}
                    className={`min-h-9 rounded-full border px-3 text-sm ${reason === x ? "border-brand bg-brand/10 font-semibold text-ink" : "border-line text-ink-dim"}`}
                  >
                    {x}
                  </button>
                ))}
              </div>
              {reason === "Бусад" && (
                <Field label="Шалтгаан" htmlFor="absent-other">
                  <input
                    id="absent-other"
                    value={other}
                    onChange={(e) => setOther(e.target.value)}
                    className={inputCls}
                    maxLength={300}
                  />
                </Field>
              )}
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error"
                >
                  {error}
                </p>
              )}
              <Button
                onClick={save}
                disabled={busy || !text || !start}
                className="w-full"
              >
                {busy
                  ? "Хадгалж байна"
                  : start
                    ? `${n} хоног хасах — дараагийн сарууд хойшилно`
                    : "Өдрөө сонгоно уу"}
              </Button>
            </>
            {gaps.length > 0 && (
              <ul className="space-y-1.5">
                {gaps.map((g) => (
                  <li
                    key={g.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm"
                  >
                    <span className="text-ink">
                      {dayLabel(g.gapFrom)} – {dayLabel(g.gapTo ?? g.gapFrom)}:{" "}
                      {g.days} хоног
                      <span className="text-ink-dim"> · {g.reason}</span>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => cancel(g.id)}
                    >
                      <Trash2 aria-hidden /> Цуцлах
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {!canAbsent && block.period && (
          <p className="text-sm text-ink-dim">Хугацаа: {periodLabel(block)}</p>
        )}
      </div>
    </LedgerDialog>
  );
}

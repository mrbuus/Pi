"use client";

import { useEffect, useState } from "react";
import { Check, Landmark, Phone, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/kit/tabs";
import InfoHint from "@/components/ui/InfoHint";
import { Meta } from "@/components/ui/Meta";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import LedgerDialog from "@/components/payments/LedgerDialog";
import { BlockLegend, LargeBlocks } from "@/components/payments/MonthBlocks";
import { dayLabel, mnt, monthName, PLAN_LABEL, stampLabel, STATE_LABEL } from "@/components/payments/ledgerFormat";
import { METHOD_LABEL, errMsg } from "@/components/payments/paymentHelpers";
import type { MonthBlock, StudentLedger } from "@/components/payments/ledgerTypes";
import { RECONCILE_CHANGED, type StudentDetail } from "./types";

type BankItem = StudentDetail["bank"][number];

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Сарын төлбөрийн хамрах хугацаа «10/01–11/01». Өдөр нь сайтын тооцоотой ижил:
 * хичээлийн жил эхлэхээс өмнө орсон бол 1, үгүй бол сууж эхэлсэн өдөр (≤28).
 */
function periodOf(month: string, startDate: string | null, yearStart: string): string {
  const day = !startDate || startDate.slice(0, 7) < yearStart ? 1 : Math.min(Math.max(Number(startDate.slice(8, 10)) || 1, 1), 28);
  const m = Number(month.slice(5, 7));
  return `${pad2(m)}/${pad2(day)}–${pad2((m % 12) + 1)}/${pad2(day)}`;
}

/**
 * Дарсан сарын жижиг карт (он цагийн шугамын доор, тэр сар руу сумтай): хамрах
 * хугацаа, төлөв, аль төлбөр(үүд) дүүргэсэн — хэзээ, ямар данснаас.
 */
function MonthCard({
  block,
  index,
  count,
  ledger,
  bank,
  onClose,
}: {
  block: MonthBlock;
  index: number;
  count: number;
  ledger: StudentLedger;
  bank: BankItem[];
  onClose: () => void;
}) {
  const hidden = !!ledger.amountsHidden;
  const parts = ledger.sources?.[block.month] ?? [];
  return (
    <div className="relative mt-2 space-y-2 rounded-xl border border-brand/40 bg-brand-bright/5 p-3 text-sm">
      {/* Дарсан сар руу заасан сум (том дэлгэцэнд шугам бүтэн харагдана) */}
      <span
        aria-hidden
        className="absolute -top-[7px] hidden size-3 -translate-x-1/2 rotate-45 border-l border-t border-brand/40 bg-surface sm:block"
        style={{ left: `${((index + 0.5) / count) * 100}%` }}
      />
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-ink">
          <Meta
            items={[
              monthName(block.month),
              <span key="p" className="tabular-nums">
                {block.period ? `${dayLabel(block.period.from)}–${dayLabel(block.period.to)}` : periodOf(block.month, ledger.row.startDate, ledger.year.months[0])}
              </span>,
              STATE_LABEL[block.state],
              !hidden && block.due ? `${mnt(block.paid)} / ${mnt(block.due)}` : null,
            ]}
          />
        </p>
        <button type="button" onClick={onClose} aria-label="Хаах" className="-m-1.5 grid size-9 shrink-0 place-items-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      {parts.length === 0 ? (
        <p className="text-ink-dim">{block.dueOn ? `Төлбөр ороогүй, төлөх өдөр ${dayLabel(block.dueOn)}` : "Төлбөр ороогүй"}</p>
      ) : (
        <ul className="space-y-1.5">
          {parts.map((part) => {
            const pay = ledger.payments.find((p) => p.id === part.paymentId);
            const b = bank.find((x) => x.paymentId === part.paymentId);
            const whole = pay?.amount ?? null;
            return (
              <li key={part.paymentId} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="font-semibold tabular-nums text-ink">
                  {part.amount != null ? mnt(part.amount) : "Төлсөн"}
                  {part.amount != null && whole != null && whole > part.amount && <span className="font-normal text-ink-dim"> / {mnt(whole)}</span>}
                </span>
                <span className="tabular-nums text-ink-dim">{stampLabel(b?.bookedAt ?? pay?.paidAt ?? pay?.createdAt ?? "")}</span>
                {b ? (
                  <span className="flex min-w-0 items-center gap-1.5 text-ink-dim">
                    <Landmark className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">
                      <Meta items={[b.counterparty, b.sender ?? b.description]} />
                    </span>
                  </span>
                ) : (
                  pay && <span className="text-ink-dim">{pay.method === "BANK_TRANSFER" ? "Шийтээс, хуулгад холбогдоогүй" : (METHOD_LABEL[pay.method] ?? pay.method)}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Хуулгаас оноосон нэг гүйлгээ — нягт мөр, «Буцаах» */
function BankLine({ b, onUndo }: { b: BankItem; onUndo: () => void }) {
  return (
    <li className="flex items-start gap-3 px-3 py-2.5 text-sm">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-bold tabular-nums text-ink">{mnt(b.amount)}</span>
          {b.txAmount !== b.amount && <span className="text-ink-dim">/ {mnt(b.txAmount)}</span>}
          <span className="tabular-nums text-ink-dim">{stampLabel(b.bookedAt)}</span>
        </p>
        <p className="truncate font-medium text-ink">{b.description || "Утгагүй гүйлгээ"}</p>
        <p className="text-ink-dim">
          <Meta items={[b.kindLabel, b.counterparty ? `Данс ${b.counterparty}` : null, b.sender, b.kind === "TUITION" ? (b.inSheet ? "Шийтэд бүртгэлтэй" : "Шинэ төлбөр") : null]} />
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={onUndo} aria-label={`${mnt(b.amount)}-ийн хуваарилалтыг буцаах`}>
        <Undo2 /> Буцаах
      </Button>
    </li>
  );
}

/**
 * «⋯» — хүүхдийг сонгохоос өмнө шалгах дэлгэрэнгүй. Гурван жижиг таб:
 * сарын он цагийн шугам (сар дээр дарахад хамрах хугацаа, хэзээ, ямар данснаас),
 * хуулгаас оноосон гүйлгээ (буцааж болно), холбоо барих.
 */
export default function StudentDetailDialog({
  studentId,
  open,
  onOpenChange,
  onPick,
}: {
  studentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Байвал доор «Энэ хүүхдийг сонгох» товч гарна */
  onPick?: () => void;
}) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [ledger, setLedger] = useState<StudentLedger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState("months");
  /** Дарсан сар */
  const [month, setMonth] = useState<string | null>(null);
  const [undoing, setUndoing] = useState<BankItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !studentId) return;
    let alive = true;
    setError(null);
    const id = encodeURIComponent(studentId);
    Promise.all([
      api<StudentDetail>(`/reconcile/students/${id}`),
      // Сарын блок байхгүй ч (жишээ нь анги оноогдоогүй) бусад мэдээлэл харагдана
      api<StudentLedger>(`/payments/ledger/student/${id}`).catch(() => null),
    ])
      .then(([d, l]) => {
        if (!alive) return;
        setDetail(d);
        setLedger(l);
      })
      .catch((e) => alive && setError(errMsg(e)));
    return () => {
      alive = false;
    };
  }, [open, studentId, attempt]);

  // Өөр хүүхэд нээгдэхэд хуучин мэдээлэл, таб, сар цэвэрлэнэ
  useEffect(() => {
    setDetail(null);
    setLedger(null);
    setMonth(null);
    setTab("months");
  }, [studentId]);

  async function undo() {
    if (!undoing) return;
    setBusy(true);
    try {
      await api(`/reconcile/rows/${encodeURIComponent(undoing.bankTxId)}/undo`, { method: "POST" });
      toast.success("Буцаалаа — гүйлгээ «Шийдэх» жагсаалтад орлоо");
      setUndoing(null);
      setMonth(null);
      setAttempt((n) => n + 1);
      window.dispatchEvent(new Event(RECONCILE_CHANGED));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const s = detail?.student;
  const row = ledger?.row;
  const hidden = !!ledger?.amountsHidden;
  // Хуулгатай холбогдоогүй төлбөр (шийтээс, бэлэн, QPay)
  const linked = new Set(detail?.bank.map((b) => b.paymentId).filter(Boolean));
  const other = (ledger?.payments ?? []).filter((p) => p.status === "CONFIRMED" && !linked.has(p.id));
  const picked = row && month ? row.blocks.findIndex((b) => b.month === month) : -1;

  return (
    <>
      <LedgerDialog
        wide
        open={open}
        onOpenChange={onOpenChange}
        title={s?.name ?? "Хүүхдийн мэдээлэл"}
        description={s ? <Meta items={[s.classroom, s.grade ? `${s.grade}-р анги` : null, s.school, s.archived ? "Гарсан" : null]} /> : undefined}
        footer={
          onPick && s ? (
            <Button onClick={onPick} className="w-full sm:w-auto">
              <Check /> Энэ хүүхдийг сонгох
            </Button>
          ) : undefined
        }
      >
        {error ? (
          <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />
        ) : !detail ? (
          <SkeletonRows rows={5} />
        ) : (
          <div className="space-y-4">
            {row && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                <Badge tone="brand">{PLAN_LABEL[row.plan.kind]}</Badge>
                {!hidden && <span className="font-semibold tabular-nums text-ink">Төлсөн {mnt(row.paidTotal)}</span>}
                {!hidden && row.owedNow > 0 && <span className="font-semibold tabular-nums text-error">Өр {mnt(row.owedNow)}</span>}
                {row.startDate && <span className="text-ink-dim">Эхэлсэн {dayLabel(row.startDate)}</span>}
              </div>
            )}

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList aria-label="Хүүхдийн мэдээлэл" className="mx-0 px-0">
                <TabsTrigger value="months">Сар бүр</TabsTrigger>
                <TabsTrigger value="bank">Гүйлгээ ({detail.bank.length})</TabsTrigger>
                <TabsTrigger value="contact">Холбоо барих</TabsTrigger>
              </TabsList>

              <TabsContent value="months" className="pt-3">
                {row ? (
                  <div>
                    {/* Он цагийн шугам: 9-р сараас 5-р сар хүртэл нэг мөрөнд, утсан дээр хажуу тийш гүйлгэнэ */}
                    <div className="-mx-1 overflow-x-auto px-1 pb-1">
                      <LargeBlocks
                        blocks={row.blocks}
                        settled={row.plan.settled}
                        gridClass="grid min-w-[36rem] grid-cols-9 gap-1"
                        pickAll
                        current={month ?? undefined}
                        onPick={(m) => setMonth((cur) => (cur === m ? null : m))}
                      />
                    </div>
                    {picked >= 0 && ledger ? (
                      <MonthCard block={row.blocks[picked]} index={picked} count={row.blocks.length} ledger={ledger} bank={detail.bank} onClose={() => setMonth(null)} />
                    ) : (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-dim">
                        Сар дээр дарж тэр сарын төлбөрийг харна
                        <InfoHint label="Блокийн тайлбар">
                          <BlockLegend />
                        </InfoHint>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-ink-dim">Сарын төлбөрийн мэдээлэл алга (анги оноогдоогүй байж магадгүй)</p>
                )}
              </TabsContent>

              <TabsContent value="bank" className="space-y-3 pt-3">
                {detail.bank.length === 0 ? (
                  <p className="text-sm text-ink-dim">Энэ хүүхдэд хуулгаас оноосон гүйлгээ алга</p>
                ) : (
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {detail.bank.map((b) => (
                      <BankLine key={b.id} b={b} onUndo={() => setUndoing(b)} />
                    ))}
                  </ul>
                )}
                {other.length > 0 && !hidden && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-ink-dim">Хуулгатай холбогдоогүй төлбөр</p>
                    <ul className="divide-y divide-line rounded-xl border border-line text-sm">
                      {other.map((p) => (
                        <li key={p.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
                          <span className="font-semibold tabular-nums text-ink">{mnt(p.amount)}</span>
                          <span className="min-w-0 flex-1 truncate text-ink-dim">
                            <Meta items={[p.forMonth ? monthName(p.forMonth) : null, METHOD_LABEL[p.method] ?? p.method]} />
                          </span>
                          <span className="tabular-nums text-ink-dim">{stampLabel(p.paidAt ?? p.createdAt).slice(0, 5)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contact" className="space-y-3 pt-3 text-sm">
                <ul className="space-y-1.5">
                  {(
                    [
                      ["Өөрийн", s!.phone],
                      ["Аав", s!.fatherPhone],
                      ["Ээж", s!.motherPhone],
                    ] as const
                  ).map(
                    ([label, value]) =>
                      value && (
                        <li key={label} className="flex items-center gap-2">
                          <Phone className="size-4 shrink-0 text-ink-dim" aria-hidden />
                          <span className="w-14 shrink-0 text-ink-dim">{label}</span>
                          <a href={`tel:${value}`} className="font-semibold tabular-nums text-ink underline-offset-2 hover:underline">
                            {value}
                          </a>
                        </li>
                      ),
                  )}
                </ul>
                {!s!.phone && !s!.fatherPhone && !s!.motherPhone && <p className="text-ink-dim">Утас бүртгэгдээгүй</p>}
                {detail.payers.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-ink-dim">Энэ хүүхдэд төлдөг данс, утас</p>
                    <ul className="flex flex-wrap gap-2">
                      {detail.payers.map((h) => (
                        <li key={`${h.kind}${h.value}`} className="flex items-center gap-1.5 rounded-lg bg-ink/5 px-2.5 py-1">
                          {h.kind === "ACCOUNT" ? <Landmark className="size-4 text-ink-dim" aria-hidden /> : <Phone className="size-4 text-ink-dim" aria-hidden />}
                          <span className="tabular-nums text-ink">{h.value}</span>
                          <span className="text-ink-dim">{h.count} удаа</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </LedgerDialog>

      <LedgerDialog
        open={!!undoing}
        onOpenChange={(o) => !o && setUndoing(null)}
        title="Хуваарилалтыг буцаах уу"
        description={undoing ? `${stampLabel(undoing.bookedAt)} ${mnt(undoing.txAmount)} — ${undoing.description || "утгагүй"}` : undefined}
        footer={
          <Button variant="danger" onClick={undo} disabled={busy} className="w-full sm:w-auto">
            {busy ? "Буцааж байна" : "Буцаах"}
          </Button>
        }
      >
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-dim">
          <li>Гүйлгээ «Шийдэх» жагсаалтад буцаж орж, дахин хуваарилна</li>
          {undoing && undoing.txAmount !== undoing.amount && <li>Энэ гүйлгээг хэд хэдэн хэсэгт хуваасан — бүх хэсэг нь буцна</li>}
          <li>{undoing?.inSheet ? "Шийтээс орсон төлбөр хэвээр үлдэнэ" : "Энэ гүйлгээнээс үүссэн төлбөр хүчингүй болно"}</li>
        </ul>
      </LedgerDialog>
    </>
  );
}

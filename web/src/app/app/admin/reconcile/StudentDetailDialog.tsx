"use client";

import { useEffect, useState } from "react";
import { Check, FileSpreadsheet, Landmark, Phone, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import InfoHint from "@/components/ui/InfoHint";
import { Meta } from "@/components/ui/Meta";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import LedgerDialog from "@/components/payments/LedgerDialog";
import { BlockLegend, LargeBlocks } from "@/components/payments/MonthBlocks";
import { dayLabel, mnt, monthName, PLAN_LABEL, stampLabel, STATE_LABEL } from "@/components/payments/ledgerFormat";
import { METHOD_LABEL, errMsg } from "@/components/payments/paymentHelpers";
import type { MonthBlock, StudentLedger } from "@/components/payments/ledgerTypes";
import type { StudentDetail } from "./types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function PhoneLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <li className="flex items-center gap-2">
      <Phone className="size-4 shrink-0 text-ink-dim" aria-hidden />
      <span className="w-14 shrink-0 text-ink-dim">{label}</span>
      <a href={`tel:${value}`} className="font-semibold tabular-nums text-ink underline-offset-2 hover:underline">
        {value}
      </a>
    </li>
  );
}

/** Дарсан сарын төлбөр: аль төлбөр(үүд) дүүргэсэн, хэзээ, ямар данснаас, хэн илгээсэн */
function MonthDetail({ block, ledger, detail }: { block: MonthBlock; ledger: StudentLedger; detail: StudentDetail }) {
  const hidden = !!ledger.amountsHidden;
  const parts = ledger.sources?.[block.month] ?? [];
  return (
    <div className="space-y-2 rounded-xl border border-brand/30 bg-brand-bright/5 p-3 text-sm">
      <p className="font-bold text-ink">
        <Meta
          items={[
            monthName(block.month),
            STATE_LABEL[block.state],
            !hidden && block.due ? `ногдох ${mnt(block.due)}` : null,
            !hidden && block.paid ? `төлсөн ${mnt(block.paid)}` : null,
          ]}
        />
      </p>
      {block.paidOn && (
        <p className="text-ink-dim">
          {dayLabel(block.paidOn)}-нд бүрэн төлөгдсөн{block.lateDays > 0 ? `, ${block.lateDays} хоног хоцорсон` : ""}
        </p>
      )}
      {parts.length === 0 ? (
        <p className="text-ink-dim">{block.dueOn ? `Төлбөр ороогүй — төлөх өдөр ${dayLabel(block.dueOn)}` : "Төлбөр ороогүй"}</p>
      ) : (
        <ul className="space-y-2">
          {parts.map((part) => {
            const pay = ledger.payments.find((p) => p.id === part.paymentId);
            const bank = detail.bank.find((b) => b.paymentId === part.paymentId);
            const whole = pay?.amount ?? null;
            return (
              <li key={part.paymentId} className="space-y-1 rounded-lg bg-surface px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-bold tabular-nums text-ink">
                    {part.amount != null ? mnt(part.amount) : "Төлсөн"}
                    {part.amount != null && whole != null && whole > part.amount && (
                      <span className="font-normal text-ink-dim"> ({mnt(whole)} төлбөрөөс)</span>
                    )}
                  </span>
                  <span className="tabular-nums text-ink-dim">
                    {bank ? stampLabel(bank.bookedAt) : pay ? stampLabel(pay.paidAt ?? pay.createdAt) : ""}
                  </span>
                </div>
                {bank ? (
                  <>
                    <p className="break-words font-medium text-ink">{bank.description || "Утгагүй гүйлгээ"}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-dim">
                      {bank.counterparty && (
                        <span className="flex items-center gap-1.5">
                          <Landmark className="size-4 shrink-0" aria-hidden />
                          Данс <span className="tabular-nums text-ink">{bank.counterparty}</span>
                        </span>
                      )}
                      {bank.sender && (
                        <span className="flex items-center gap-1.5">
                          <UserRound className="size-4 shrink-0" aria-hidden />
                          <span className="text-ink">{bank.sender}</span>
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  pay && (
                    <p className="text-ink-dim">
                      <Meta items={[METHOD_LABEL[pay.method] ?? pay.method, pay.description, "банкны хуулгад холбогдоогүй"]} />
                    </p>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * «⋯» — хүүхдийг сонгохоос өмнө шалгах дэлгэрэнгүй: холбоо барих утас, сар бүрийн
 * төлбөрийн блок (шийтийн сарын бүлэгтэй ижил), бүх төлбөр, хуулгаас орсон
 * гүйлгээ бүр хэзээ, ямар данснаас, хэн илгээснээр.
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
  /** Дарсан сар — тэр сарын төлбөрийн эх сурвалж */
  const [month, setMonth] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !studentId) return;
    let alive = true;
    setDetail(null);
    setLedger(null);
    setError(null);
    setMonth(null);
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

  const s = detail?.student;
  const row = ledger?.row;
  const hidden = !!ledger?.amountsHidden;
  const payments = (ledger?.payments ?? []).filter((p) => p.status === "CONFIRMED");

  return (
    <LedgerDialog
      wide
      open={open}
      onOpenChange={onOpenChange}
      title={s?.name ?? "Хүүхдийн мэдээлэл"}
      description={s ? <Meta items={[s.classroom, s.grade ? `${s.grade}-р анги` : null, s.school, s.branch, s.archived ? "Гарсан" : null]} /> : undefined}
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
        <div className="space-y-5">
          <Section title="Холбоо барих">
            <ul className="space-y-1.5 text-sm">
              <PhoneLine label="Өөрийн" value={s!.phone} />
              <PhoneLine label="Аав" value={s!.fatherPhone} />
              <PhoneLine label="Ээж" value={s!.motherPhone} />
            </ul>
            {!s!.phone && !s!.fatherPhone && !s!.motherPhone && <p className="text-sm text-ink-dim">Утас бүртгэгдээгүй</p>}
          </Section>

          {row && (
            <Section title="Сар бүрийн төлбөр">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <Badge tone="brand">{PLAN_LABEL[row.plan.kind]}</Badge>
                {row.startDate && <span className="text-ink-dim">Сууж эхэлсэн {dayLabel(row.startDate)}</span>}
                {!hidden && (
                  <span className="text-ink-dim">
                    <Meta items={[`Төлсөн ${mnt(row.paidTotal)}`, row.owedNow > 0 ? `Өр ${mnt(row.owedNow)}` : null, row.remaining > 0 ? `Жилийн үлдэгдэл ${mnt(row.remaining)}` : null]} />
                  </span>
                )}
                <InfoHint label="Блокийн тайлбар">
                  <BlockLegend />
                </InfoHint>
              </div>
              <LargeBlocks
                blocks={row.blocks}
                settled={row.plan.settled}
                gridClass="grid grid-cols-3 gap-2 sm:grid-cols-5"
                pickAll
                current={month ?? undefined}
                onPick={(m) => setMonth((cur) => (cur === m ? null : m))}
              />
              {month && row.blocks.some((b) => b.month === month) ? (
                <MonthDetail block={row.blocks.find((b) => b.month === month)!} ledger={ledger!} detail={detail} />
              ) : (
                <p className="text-sm text-ink-dim">Сар дээр дарж тухайн сарын төлбөр хэзээ, ямар данснаас орсныг харна</p>
              )}
            </Section>
          )}

          <Section title={`Хуулгаас орсон гүйлгээ (${detail.bank.length})`}>
            {detail.bank.length === 0 ? (
              <p className="text-sm text-ink-dim">Энэ хүүхдэд хуулгаас оноосон гүйлгээ алга</p>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {detail.bank.map((b) => (
                  <li key={b.id} className="space-y-1 px-3 py-2.5 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-bold tabular-nums text-ink">
                        {mnt(b.amount)}
                        {b.txAmount !== b.amount && <span className="font-normal text-ink-dim"> (нийт {mnt(b.txAmount)}-өөс)</span>}
                      </span>
                      <span className="tabular-nums text-ink-dim">{stampLabel(b.bookedAt)}</span>
                    </div>
                    <p className="break-words font-medium text-ink">{b.description || "Утгагүй гүйлгээ"}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-dim">
                      <Badge tone={b.kind === "TUITION" ? "brand" : "neutral"}>{b.kindLabel}</Badge>
                      {b.sender && (
                        <span className="flex items-center gap-1.5">
                          <UserRound className="size-4 shrink-0" aria-hidden />
                          <span className="text-ink">{b.sender}</span>
                        </span>
                      )}
                      {b.counterparty && (
                        <span className="flex items-center gap-1.5">
                          <Landmark className="size-4 shrink-0" aria-hidden />
                          <span className="tabular-nums text-ink">{b.counterparty}</span>
                        </span>
                      )}
                      {b.kind === "TUITION" && (
                        <span className="flex items-center gap-1.5">
                          <FileSpreadsheet className="size-4 shrink-0" aria-hidden />
                          {b.inSheet ? "Шийтэд бүртгэлтэй" : "Шинэ төлбөр"}
                        </span>
                      )}
                      {b.auto && <span>Автоматаар</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {payments.length > 0 && !hidden && (
            <Section title={`Бүх төлбөр (${payments.length})`}>
              <ul className="divide-y divide-line rounded-xl border border-line text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2">
                    <span className="font-semibold tabular-nums text-ink">{mnt(p.amount)}</span>
                    <span className="min-w-0 flex-1 text-ink-dim">
                      <Meta items={[p.forMonth ? monthName(p.forMonth) : null, METHOD_LABEL[p.method] ?? p.method, p.description]} />
                    </span>
                    <span className="tabular-nums text-ink-dim">{stampLabel(p.paidAt ?? p.createdAt).slice(0, 5)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {detail.payers.length > 0 && (
            <Section title="Энэ хүүхдэд төлдөг данс, утас">
              <ul className="flex flex-wrap gap-2 text-sm">
                {detail.payers.map((h) => (
                  <li key={`${h.kind}${h.value}`} className="flex items-center gap-1.5 rounded-lg bg-ink/5 px-2.5 py-1">
                    {h.kind === "ACCOUNT" ? <Landmark className="size-4 text-ink-dim" aria-hidden /> : <Phone className="size-4 text-ink-dim" aria-hidden />}
                    <span className="tabular-nums text-ink">{h.value}</span>
                    <span className="text-ink-dim">{h.count} удаа</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </LedgerDialog>
  );
}

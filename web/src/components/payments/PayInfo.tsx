"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { api } from "@/lib/api";
import { BANK, formatMnt, tierForGrade, type TuitionTier } from "@/lib/orgInfo";
import { cn } from "@/lib/cn";

/**
 * Төлбөр төлөх дансны мэдээлэл (эзэн 2026-10-31): мөр бүрийг тусад нь, эсвэл бүгдийг
 * нэг дор хуулна. Гүйлгээний утга сурагчийн өөрийн нэр, утсаар бөглөгдөнө; сарын ба
 * жилийн төлбөр ангийн түвшнээс (9–11, 12) хамаарна. Өнгөгүй, саарал — өнгийн карт хориотой.
 */

const NOTE_YEAR = "2027";
const CENTER = "Шинэ Ирээдүйн Эзэд сургалтын төв";

interface Me {
  firstName: string;
  lastName: string;
  phone?: string | null;
}
interface MyClass {
  type: string;
  grade?: number | null;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CopyButton({ text, label, caption = "Хуулах" }: { text: string; label: string; caption?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        }
      }}
      aria-label={`${label} хуулах`}
      className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-ink transition hover:border-brand-bright/50"
    >
      {done ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4 text-ink-dim" aria-hidden />}
      {done ? "Хуулсан" : caption}
    </button>
  );
}

function Row({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-ink-dim">{label}</dt>
        <dd className="[overflow-wrap:anywhere] font-semibold tabular-nums tracking-tight text-ink">{value}</dd>
      </div>
      {copy && <CopyButton text={value} label={label} />}
    </div>
  );
}

export default function PayInfo({ id, className }: { id?: string; className?: string }) {
  const [me, setMe] = useState<Me | null>(null);
  const [tier, setTier] = useState<TuitionTier | null>(null);

  useEffect(() => {
    let alive = true;
    api<Me>("/auth/me")
      .then((m) => alive && setMe(m))
      .catch(() => {});
    api<MyClass[]>("/assignments/my-classrooms")
      .then((rows) => {
        if (!alive) return;
        const grade = rows.find((r) => r.type === "IN_PERSON" && r.grade != null)?.grade ?? null;
        setTier(tierForGrade(grade));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const note = me
    ? [`${me.lastName} ${me.firstName}`.trim(), me.phone ?? "", NOTE_YEAR].filter(Boolean).join(", ")
    : `Хүүхдийн овог нэр, утасны дугаар, ${NOTE_YEAR}`;
  const monthly = tier?.plans.find((p) => p.kind === "MONTHLY")?.amount;
  const yearly = tier?.plans.find((p) => p.kind === "FULL_YEAR")?.amount;

  const all = [
    `${BANK.account} ${BANK.name} ${BANK.holder}`,
    `IBAN: ${BANK.iban}`,
    `Утга: ${note}`,
    CENTER,
    monthly ? `Сарын төлбөр: ${formatMnt(monthly)}` : null,
    yearly ? `Бүтэн жилийн төлбөр: ${formatMnt(yearly)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <section id={id} aria-labelledby="pay-info" className={cn("chunky scroll-mt-24 p-5", className)}>
      <div className="flex items-center gap-3">
        <h2 id="pay-info" className="flex-1 font-bold text-ink">
          Төлбөр төлөх данс
        </h2>
        <CopyButton text={all} label="Бүх мэдээллийг" caption="Бүгдийг хуулах" />
      </div>
      <p className="mt-1 text-sm text-ink-dim">{CENTER}</p>

      <dl className="mt-3 divide-y divide-line border-y border-line">
        <Row label="Дансны дугаар" value={BANK.account} copy />
        <Row label="IBAN" value={BANK.iban} copy />
        <Row label={`Хүлээн авагч, ${BANK.name}`} value={BANK.holder} />
        <Row label="Гүйлгээний утга" value={note} copy />
      </dl>

      {(monthly || yearly) && (
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {monthly && (
            <div>
              <dt className="text-xs text-ink-dim">Сарын төлбөр</dt>
              <dd className="font-bold tabular-nums text-ink">{formatMnt(monthly)}</dd>
            </div>
          )}
          {yearly && (
            <div>
              <dt className="text-xs text-ink-dim">Бүтэн жилийн төлбөр</dt>
              <dd className="font-bold tabular-nums text-ink">{formatMnt(yearly)}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}

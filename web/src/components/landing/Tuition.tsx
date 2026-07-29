import { formatMnt, TUITION, type TuitionTier } from "@/lib/orgInfo";
import InfoHint from "@/components/ui/InfoHint";

function TierCard({ tier }: { tier: TuitionTier }) {
  const fullYear = tier.plans.find((p) => p.kind === "FULL_YEAR");
  const installment = tier.plans.find((p) => p.kind === "INSTALLMENT");
  const monthly = tier.plans.find((p) => p.kind === "MONTHLY");

  // Хуваан төлөхөөс нэг дор төлөх нь хэрхэн хямд болохыг бодит тоогоор
  // тооцно — хэзээ ч зохиомол хувь ашиглахгүй.
  const savings =
    fullYear && installment ? installment.amount - fullYear.amount : 0;
  const savingsPercent =
    fullYear && installment && installment.amount > 0
      ? Math.round((savings / installment.amount) * 100)
      : 0;

  return (
    <div className="reveal rounded-2xl border border-line bg-panel p-7">
      <h3 className="text-xl font-extrabold text-ink">{tier.label}</h3>

      {fullYear && savings > 0 && (
        <div className="mt-4 flex items-center gap-1.5 rounded-xl border border-success/30 bg-success/10 p-4">
          <p className="text-sm font-bold text-success">
            {formatMnt(savings)} ({savingsPercent}%) хэмнэнэ
          </p>
          <InfoHint label="Хэмнэлтийн тухай">
            Бүтэн жилийн төлбөрийг нэг дор төлбөл хуваан төлөхтэй харьцуулахад
            {" "}{formatMnt(savings)}-өөр хямд.
          </InfoHint>
        </div>
      )}

      <div className="mt-5 grid gap-3">
        {fullYear && (
          <div className="flex items-center justify-between rounded-xl border-2 border-brand bg-brand/5 p-4">
            <div>
              <p className="text-sm font-bold text-ink">{fullYear.label}</p>
              <p className="text-xs text-ink-dim">
                {fullYear.note ?? "Санал болгож буй"}
              </p>
            </div>
            <p className="text-lg font-extrabold text-brand">
              {formatMnt(fullYear.amount)}
            </p>
          </div>
        )}
        {installment && (
          <div className="flex items-center justify-between rounded-xl border border-line p-4">
            <div>
              <p className="text-sm font-bold text-ink">{installment.label}</p>
              <p className="text-xs text-ink-dim">
                Эхний төлбөр {formatMnt(tier.installment.firstPayment)}, үлдэгдэл{" "}
                {tier.installment.deadline}-нд багтаана
              </p>
            </div>
            <p className="text-lg font-extrabold text-ink">
              {formatMnt(installment.amount)}
            </p>
          </div>
        )}
        {monthly && (
          <div className="flex items-center justify-between rounded-xl border border-line p-4">
            <div>
              <p className="text-sm font-bold text-ink">{monthly.label}</p>
              <p className="text-xs text-ink-dim">{monthly.note}</p>
            </div>
            <p className="text-lg font-extrabold text-ink">
              {formatMnt(monthly.amount)}/сар
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Tuition() {
  return (
    <section id="tuition" className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="reveal text-sm font-bold uppercase tracking-[0.2em] text-brand">
          Сургалтын төлбөр
        </p>
        <h2 className="reveal mt-3 max-w-2xl text-3xl font-extrabold md:text-4xl">
          2026-2027 оны хичээлийн жилийн төлбөр
        </h2>
        <p className="reveal mt-4 max-w-xl text-ink-dim">
          Бүтэн жилийн төлбөрөө нэг дор төлбөл хуваан төлөхөөс мэдэгдэхүйц
          хямд.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {TUITION.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>
      </div>
    </section>
  );
}

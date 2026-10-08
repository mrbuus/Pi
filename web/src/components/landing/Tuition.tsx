import { ArrowUpRight } from "lucide-react";
import { formatMnt, TUITION, type TuitionTier } from "@/lib/orgInfo";
import InfoHint from "@/components/ui/InfoHint";
import styles from "./sections.module.css";

function TierCard({ tier }: { tier: TuitionTier }) {
  const fullYear = tier.plans.find(plan => plan.kind === "FULL_YEAR");
  const installment = tier.plans.find(plan => plan.kind === "INSTALLMENT");
  const monthly = tier.plans.find(plan => plan.kind === "MONTHLY");
  const savings = fullYear && installment ? installment.amount - fullYear.amount : 0;
  const savingsPercent = installment && installment.amount > 0 ? Math.round((savings / installment.amount) * 100) : 0;
  return <article className={`reveal ${styles.tuitionTier}`}>
    <h3>{tier.label}</h3>
    {fullYear && <div className={styles.yearPrice}><p>{fullYear.label}</p><strong>{formatMnt(fullYear.amount)}</strong><span>{fullYear.note ?? "Нэг дор төлөх"}</span></div>}
    {fullYear && savings > 0 && <div className={styles.savings}><p>{formatMnt(savings)} ({savingsPercent}%) хэмнэнэ</p><InfoHint label="Хэмнэлтийн тухай">Бүтэн жилийн төлбөрийг нэг дор төлбөл хуваан төлөхтэй харьцуулахад {formatMnt(savings)}-өөр хямд.</InfoHint></div>}
    <dl className={styles.paymentPlans}>
      {installment && <div><dt>{installment.label}<span>Эхний төлбөр {formatMnt(tier.installment.firstPayment)}, үлдэгдлийг {tier.installment.deadline}-нд багтаана</span></dt><dd>{formatMnt(installment.amount)}</dd></div>}
      {monthly && <div><dt>{monthly.label}<span>{monthly.note}</span></dt><dd>{formatMnt(monthly.amount)}<span>/сар</span></dd></div>}
    </dl>
  </article>;
}

export default function Tuition() {
  return <section id="tuition" className={`${styles.section} ${styles.tuitionSection}`}>
    <div className={styles.container}>
      <div className={`reveal ${styles.sectionHeading}`}><div><p className={styles.eyebrow}>06 / Сургалтын төлбөр</p><h2 className={`cyrillic-heading ${styles.heading}`}>Сонголтоо<br />тодорхой хараарай.</h2></div><div className={styles.headingAside}><p className={styles.tuitionYear}>2026–2027 оны хичээлийн жил</p><p>Нэг дор, хувааж, эсвэл сар бүр. Бүтэн жилийн төлбөрийг нэг дор төлөх нь хуваан төлөхөөс хямд.</p></div></div>
      <div className={styles.tuitionGrid}>{TUITION.map(tier => <TierCard key={tier.id} tier={tier} />)}</div>
      <a href="#branches" className={styles.textLink}>Хуваарь, төлбөрийн нөхцөл лавлах <ArrowUpRight size={18} aria-hidden /></a>
    </div>
  </section>;
}

import { ArrowDownRight } from "lucide-react";
import styles from "./sections.module.css";

const FACTS = [
  { symbol: "∑", label: "Элсэлтийн шалгалтын бэлтгэл" },
  { symbol: "⌂", label: "Танхимын сургалт" },
  { symbol: "ƒ", label: "Цахим ном, бие даах бодлого" },
];

export default function TrustBar() {
  return <section aria-label="Сургалтын боломжууд" className={styles.trustBar}>
    <div className={styles.trustInner}>
      <p className={styles.trustIntro}>Суралцах орон зай <ArrowDownRight size={18} aria-hidden /></p>
      {FACTS.map(fact => <div key={fact.label} className={styles.trustFact}><span aria-hidden className={styles.trustSymbol}>{fact.symbol}</span><span>{fact.label}</span></div>)}
    </div>
  </section>;
}

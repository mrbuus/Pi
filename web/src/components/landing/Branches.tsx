import { ArrowUpRight, Phone } from "lucide-react";
import { BRANCHES, PHONES } from "@/lib/orgInfo";
import styles from "./sections.module.css";

export default function Branches() {
  return <section id="branches" className={styles.section}>
    <div className={styles.container}>
      <div className={`reveal ${styles.sectionHeading}`}><div><p className={styles.eyebrow}>05 / Салбарууд</p><h2 className={`cyrillic-heading ${styles.heading}`}>Хотын хоёр талд.<br />Танд ойрхон.</h2></div><p className={styles.headingAside}>Баруун эсвэл зүүн 4 зам. Хуваарь, ангийн боломжоо төвтэй ярилцаад салбараа сонгоорой.</p></div>
      <div className={styles.branchGrid}>{BRANCHES.map((branch, index) => <article key={branch.id} className={`reveal ${styles.branch}`}>
        <div className={styles.branchTop}><span className={styles.eyebrow}>{branch.district} / {branch.label}</span><ArrowUpRight size={22} aria-hidden /></div>
        <svg className={styles.branchSketch} viewBox="0 0 290 110" fill="none" aria-hidden="true">
          <path d="M13 56H277M145 8V102" className={styles.sketchGuide} />
          <path d={index === 0 ? "M18 83H75V31H130V56H265" : "M20 56H161V26H220V82H271"} stroke="currentColor" strokeWidth="1.6" />
          <circle cx={index === 0 ? "75" : "220"} cy={index === 0 ? "31" : "26"} r="9" stroke="currentColor" strokeWidth="1.6" /><circle cx={index === 0 ? "75" : "220"} cy={index === 0 ? "31" : "26"} r="3" fill="currentColor" />
        </svg>
        <h3>{index === 0 ? "Баруун 4 зам" : "Зүүн 4 зам"}</h3><p className={`selectable ${styles.branchAddress}`}>{branch.address}</p>
      </article>)}</div>
      <div className={`reveal ${styles.contactStrip}`}><p><Phone size={19} aria-hidden /> Ярилцаад эхэлье.</p><div>{PHONES.map(phone => <a key={phone} href={`tel:${phone.replace(/\s/g, "")}`} className={styles.phoneLink}>{phone}<ArrowUpRight size={16} aria-hidden /></a>)}</div></div>
    </div>
  </section>;
}

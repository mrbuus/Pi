import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import { BRANCHES, ORG, PHONES } from "@/lib/orgInfo";
import styles from "./sections.module.css";

const INSTAGRAM_URL = "https://www.instagram.com/shineireedui_official";

export default function Footer() {
  return <footer className={styles.footer}>
    <div className={styles.container}>
      <div className={`reveal ${styles.footerOpening}`}><p className={styles.eyebrow}>Шинэ Ирээдүйн Эзэд</p><p className={`cyrillic-heading ${styles.footerTitle}`}>Дараагийн алхмаа<br /><span>хамт ярилцъя.</span></p><a href={`tel:${PHONES[0].replace(/\s/g, "")}`} className={styles.footerCall}>{PHONES[0]}<ArrowUpRight size={24} aria-hidden /></a><span className={styles.footerMath} aria-hidden>π</span></div>
      <div className={styles.footerGrid}>
        <div><span className={styles.logoTab}><LogoMark size={28} /></span><p className={styles.footerOrg}>{ORG.name}</p><p className={styles.footerCopy}>{ORG.slogan}</p><div className={styles.socialLinks}><a href={ORG.facebook} target="_blank" rel="noopener noreferrer">Facebook <ArrowUpRight size={15} aria-hidden /></a><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={15} aria-hidden /></a></div></div>
        <div><h2 className={styles.footerLabel}>Холбоо барих</h2><div className={styles.footerPhones}>{PHONES.map(phone => <a key={phone} href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>)}</div><a href={`mailto:${ORG.email}`} className={styles.email}>{ORG.email}</a></div>
        <div><h2 className={styles.footerLabel}>Салбарууд</h2><div className={styles.footerBranches}>{BRANCHES.map(branch => <div key={branch.id}><p>{branch.label}</p><p className={`selectable ${styles.footerCopy}`}>{branch.address}</p></div>)}</div></div>
      </div>
      <div className={styles.footerBottom}><p>© 2026 {ORG.name}</p><nav aria-label="Тусламж ба бодлого"><Link href="/help">Тусламж</Link><Link href="/privacy">Нууцлалын бодлого</Link><Link href="/terms">Үйлчилгээний нөхцөл</Link></nav></div>
    </div>
  </footer>;
}

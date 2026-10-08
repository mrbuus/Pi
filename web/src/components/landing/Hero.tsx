import Link from "next/link";
import { ArrowDown, ArrowUpRight, BookOpen } from "lucide-react";
import MathVisual from "./MathVisual";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { ORG } from "@/lib/orgInfo";
import styles from "./landing.module.css";

export default function Hero() {
  return (
    <section id="public-home" className={styles.hero} aria-labelledby="home-title">
      <div aria-hidden className={styles.heroOrbit} />
      <div className={styles.heroLayout}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span aria-hidden className={styles.brandLine} />{ORG.shortName}
          </p>
          <h1 id="home-title" className={`cyrillic-heading ${styles.heroTitle}`}>
            Бодож үз.
            <br />
            <span className={styles.heroAccent}>Өөрөөр хар.</span>
          </h1>
          <p className={styles.heroDescription}>
            Математик, нийгмийн ухааны танхимын сургалт.
            Цахим ном, бодлогын сангаар өөрийн хурдаар давт.
            Ойлголтоос эхэлдэг амжилтын төлөө.
          </p>
          <div className={styles.heroActions}>
            <Button asChild className={styles.primaryAction}>
              <a href="#subjects">Хичээлүүдийг үзэх <ArrowUpRight aria-hidden /></a>
            </Button>
            <Button asChild variant="ghost" className={styles.secondaryAction}>
              <Link href="/preview"><BookOpen aria-hidden /> Номоос бодож үзэх</Link>
            </Button>
          </div>
          <div className={styles.heroFootnote}>
            <div aria-hidden className={styles.ideaMark}>
              <MathText>{"$x\\longrightarrow x+1$"}</MathText>
            </div>
            <p>Өнөөдрийн ойлголт.<br /><strong>Маргаашийн боломж.</strong></p>
          </div>
        </div>
        <div className={styles.heroExhibit}><MathVisual /></div>
      </div>
      <a href="#subjects" className={styles.scrollCue}>
        <span>Цааш танилцах</span><ArrowDown aria-hidden size={16} />
      </a>
    </section>
  );
}

import { ArrowUpRight, Plus } from "lucide-react";
import styles from "./sections.module.css";

const RHYTHM = [
  { title: "Хичээл", text: "Тогтмол гараг, цагийн хуваариар багштайгаа хичээллэнэ." },
  { title: "Даалгавар", text: "Хичээл бүрийн даалгаврыг дараагийн хичээл дээр шалгана." },
  { title: "Оройн тэмдэглэл", text: "Өдөр бүр орой бодсон бодлогоо тэмдэглэж, явцаа харна." },
  { title: "Сар бүрийн шалгалт", text: "Түвшнээ шалгуулж, ахицаа хянана. Дараагийн хичээлээ үргэлжлүүлнэ." },
];

export default function CentreInfo() {
  return <section id="centre-info" className={`${styles.section} ${styles.centreSection}`}>
    <div className={styles.container}>
      <div className={`reveal ${styles.sectionHeading}`}>
        <div><p className={styles.eyebrow}>04 / Суралцах хэмнэл</p><h2 className={`cyrillic-heading ${styles.heading}`}>Нэг удаагийн бодолт.<br />Тогтмол дадлын эхлэл.</h2></div>
        <p className={styles.headingAside}>Түвшинд тохирсон анги, тогтмол багш, давтах хэмнэл. Танхимын сургалт ингэж үргэлжилнэ.</p>
      </div>
      <div className={styles.rhythmLayout}>
        <div className={`reveal ${styles.rhythmVisual}`}>
          <svg className={styles.rhythmOrbit} viewBox="0 0 320 320" fill="none" aria-hidden="true">
            <circle cx="160" cy="160" r="135" className={styles.orbitOuter} />
            <circle cx="160" cy="160" r="109" stroke="currentColor" strokeWidth="1" />
            <path d="M160 11V39M160 281V309M11 160H39M281 160H309" stroke="currentColor" strokeWidth="1" />
            <path d="M65 65L82 82M238 238L255 255M65 255L82 238M238 82L255 65" className={styles.sketchGuide} />
            <g className={styles.orbitDot}><circle cx="160" cy="25" r="5" fill="currentColor" /><path d="M160 25A135 135 0 0 1 295 160" stroke="currentColor" strokeWidth="2" /></g>
          </svg>
          <div className={styles.rhythmTime}><span className="font-display">120</span><span>минут / нэг хичээл</span></div>
          <p className={styles.rhythmCaption}>Ойлгох → Бодох → Давтах</p>
        </div>
        <ol className={styles.rhythmSteps}>{RHYTHM.map((point, index) => <li className={`reveal ${styles.rhythmStep}`} key={point.title}><span className={styles.rhythmIndex}>0{index + 1}</span><div><h3>{point.title}</h3><p>{point.text}</p></div></li>)}</ol>
      </div>
      <div className={styles.centreDetails}>
        <details className={styles.detail}><summary>Анги, багш, танхимын тухай <Plus size={18} aria-hidden /></summary>
          <div className={styles.detailBody}>
            <p>Сурагчдыг 9–10, 11, 12-р анги болон хичээлийн түвшингээр нь бүлэглэж, тогтмол цаг, багштай анги бүрдүүлдэг. Сул суудал, дүүргэлт, багшийн мэдээлэл, хуваарийг төвөөс лавлана.</p>
            <p>Баруун ба зүүн 4 замд хоёр салбартай. Багш нарын зөвшөөрөлтэй зураг, танхимын бодит зураг хараахан нийтлэгдээгүй.</p>
            <a href="#branches" className={styles.textLink}>Салбар, багшийн талаар лавлах <ArrowUpRight size={18} aria-hidden /></a>
          </div>
        </details>
        <details className={styles.detail}><summary>Танхим ба цахим материал <Plus size={18} aria-hidden /></summary>
          <div className={styles.detailBody}>
            <p>Математикийн танхимын сургалтаас тусдаа цахим ном, бодлогоор бие даан давтаж болно. 2026 онд төвөөс удирдах онлайн анги төлөвлөгдөөгүй.</p>
            <p>Нийгмийн ухааны сургалт танхимд явагдана. Цахим материалын боломжийг номын сангаас тусад нь шалгаарай.</p>
            <a href="#subjects" className={styles.textLink}>Хичээлийн бодлогын сан <ArrowUpRight size={18} aria-hidden /></a>
          </div>
        </details>
      </div>
    </div>
  </section>;
}

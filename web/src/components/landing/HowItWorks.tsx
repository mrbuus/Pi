import { ArrowUpRight } from "lucide-react";
import styles from "./sections.module.css";

const STEPS = [
  { title: "Төвтэй холбогдоно", text: "Сонирхож буй хичээл, ангийн түвшин, холбоо барих мэдээллээ үлдээж, элсэлтийн боломжийг лавлана." },
  { title: "Түвшнээ шалгуулна", text: "Түвшин тогтоох үнэлгээ, бичгээр хийсэн ажлын зураг эсвэл PDF-ээ хэрхэн өгөхийг төвтэй тохирно." },
  { title: "Багштай ярилцана", text: "Ажлаа багшид хянуулж, тохирох анги болон 1–2 удаагийн туршилтын ирэлтийг утсаар тохирно." },
  { title: "Нөхцөлөө тодруулна", text: "Туршилтын дараа хуваарь, төлбөр, гэрээний нөхцөлийг төвтэй ярилцана." },
] as const;

export default function HowItWorks() {
  return <section id="how" className={`${styles.section} ${styles.processSection}`}>
    <div className={`${styles.container} ${styles.processLayout}`}>
      <div className={`reveal ${styles.processIntro}`}>
        <p className={styles.eyebrow}>03 / Эхлэх алхмууд</p>
        <h2 className={`cyrillic-heading ${styles.heading}`}>Танд тохирох<br />ангиас эхэлье.</h2>
        <p className={styles.introCopy}>Хичээл, түвшин, хуваарь. Эхлээд хамтдаа тодруулна.</p>
        <a href="#branches" className={styles.textLink}>Төвтэй холбогдох <ArrowUpRight size={18} aria-hidden /></a>
        <p className={styles.processNote}>Мэдээлэл үлдээх нь элсэлт баталгаажсан гэсэн үг биш.</p>
        <svg viewBox="0 0 240 120" fill="none" className={styles.processSketch} aria-hidden="true"><path d="M14 99H225M30 113V12" className={styles.sketchGuide} /><path d="M31 98H78V75H125V50H172V24H215" stroke="currentColor" strokeWidth="1.5" /><path d="M202 13L215 24L202 35" stroke="currentColor" strokeWidth="1.5" /><circle cx="78" cy="75" r="4" fill="currentColor" /><circle cx="125" cy="50" r="4" fill="currentColor" /><circle cx="172" cy="24" r="4" fill="currentColor" /></svg>
      </div>
      <ol className={styles.steps}>{STEPS.map((step, index) => <li key={step.title} className={`reveal ${styles.step}`}>
        <span className={styles.stepNumber} aria-hidden>0{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div>
      </li>)}</ol>
    </div>
  </section>;
}

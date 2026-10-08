"use client";

import { useId, useState } from "react";
import { ArrowUpRight, ImageIcon } from "lucide-react";
import MathText from "@/components/MathText";
import { Card, CardContent } from "@/components/ui/kit/card";
import { ACHIEVEMENT_YEARS } from "./achievements-config";
import styles from "./sections.module.css";

function approvedLocalPhoto(src?: string) {
  return !!src && /^\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|avif)$/i.test(src)
    && !src.startsWith("//") && !src.split("/").includes("..");
}

function AchievementPhoto({ src, alt }: { src?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.achievementPhoto}>
    {approvedLocalPhoto(src) && alt?.trim() && !failed ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} loading="lazy" decoding="async" width={640} height={480} onError={() => setFailed(true)} />
    ) : <div className={styles.photoFallback}><ImageIcon size={24} aria-hidden /><p>{failed ? "Зургийг ачаалж чадсангүй." : "Зөвшөөрсөн зураг хараахан нийтлэгдээгүй."}</p></div>}
  </div>;
}

export default function Achievements() {
  const [year, setYear] = useState(ACHIEVEMENT_YEARS[0]?.year ?? 2026);
  const id = useId();
  const selected = ACHIEVEMENT_YEARS.find(item => item.year === year);
  // Publication requires both consent and a source, never a demo result.
  const entries = selected?.entries.filter(entry => entry.consentConfirmed && entry.source.trim()) ?? [];
  return <section id="achievements" className={`${styles.section} ${styles.achievementsSection}`}>
    <div className={styles.container}>
      <div className={`reveal ${styles.archiveHeading}`}>
        <div><p className={styles.eyebrow}>02 / Сурагчдын амжилт</p><h2 className={`cyrillic-heading ${styles.heading}`}>Үр дүн бүр<br />өөрийн түүхтэй.</h2></div>
        <div className={styles.archiveControl}><p className={styles.smallCopy}>Баталгаажсан үр дүн, зургийг сурагчийн зөвшөөрөлтэйгээр нийтэлнэ.</p><label htmlFor={`${id}-year`}>Амжилтын жил</label>
          <select id={`${id}-year`} value={year} onChange={event => setYear(Number(event.target.value))} onKeyDown={event => {
            const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
            if (event.altKey || event.ctrlKey || event.metaKey || !keys.includes(event.key)) return;
            event.preventDefault();
            const current = ACHIEVEMENT_YEARS.findIndex(item => item.year === year);
            const next = event.key === "Home" ? 0 : event.key === "End" ? ACHIEVEMENT_YEARS.length - 1
              : Math.max(0, Math.min(ACHIEVEMENT_YEARS.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)));
            if (ACHIEVEMENT_YEARS[next]) setYear(ACHIEVEMENT_YEARS[next].year);
          }} className={styles.yearSelect}>{ACHIEVEMENT_YEARS.map(item => <option key={item.year} value={item.year}>{item.year} он</option>)}</select>
        </div>
      </div>
      <div className={styles.archiveBody} aria-live="polite" aria-atomic="true">
        {entries.length ? <><h3 className={styles.archiveTitle}>{year} оны амжилт</h3><ul className={styles.achievementGrid}>{entries.map((entry, index) => <li key={`${entry.name}-${entry.subject}-${index}`}>
          <Card className={`${styles.achievementCard} ${entry.score === 800 ? styles.topScore : ""}`}>
            <AchievementPhoto key={entry.photoSrc} src={entry.photoSrc} alt={entry.photoAlt} />
            <CardContent className="space-y-2 p-5"><h4 className="break-words font-semibold">{entry.name}</h4><p className="text-sm text-ink-dim">{entry.subject}</p><p className="text-sm"><MathText>{entry.result}</MathText></p>
              {entry.score != null && Number.isFinite(entry.score) && <p className="text-sm font-semibold">Оноо: <MathText>{String(entry.score)}</MathText></p>}
            </CardContent>
          </Card>
        </li>)}</ul></> : <div className={`reveal ${styles.archiveEmpty}`}>
          <span className={`font-display ${styles.archiveYear}`} aria-hidden>{year}</span>
          <div><h3>{year} оны амжилт</h3><p>Энэ жилийн баталгаажсан амжилтын мэдээлэл, зөвшөөрсөн зураг хараахан нийтлэгдээгүй.</p><a href="#branches" className={styles.textLink}>Төвөөс мэдээлэл лавлах <ArrowUpRight size={18} aria-hidden /></a></div>
        </div>}
      </div>
    </div>
  </section>;
}

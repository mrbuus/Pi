"use client";

import { useEffect, useRef } from "react";
import styles from "./book3d.module.css";
import { BOOK_META, type BookMeta } from "./bookMeta";

// CSS 3D ном (WebGL-гүй, зураг зөвхөн репод). Компьютерт аяархан эргэлдэнэ,
// хулганаар тонгойлгож болно; утсан дээр жижиг, бас эргэлдэнэ. Хавтас байхгүй
// номд өнгө, тэмдэг, нэрээр нь хавтас зурна (нүүр хуудасны цилиндртэй ижил мотив).

export default function Book3D({ code, title, size = 240, spin = true }: { code: string; title: string; size?: number; spin?: boolean }) {
  const meta = BOOK_META[code] ?? fallbackMeta(title);
  const ref = useRef<HTMLDivElement>(null);
  const hover = useRef(false);

  // Хулганаар: хөдөлгөөн багасгах горимд ч тонгойлгож болно (хэрэглэгчийн үйлдэл)
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      hover.current = true;
      el.style.setProperty("--ry", `${28 + x * 70}deg`);
      el.style.setProperty("--rx", `${-6 - y * 24}deg`);
    };
    const leave = () => { hover.current = false; el.style.removeProperty("--ry"); el.style.removeProperty("--rx"); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, []);

  const style = { "--w": `${size}px`, "--cover": meta.color, "--cover-2": meta.color2 } as React.CSSProperties;
  return (
    <div className={`${styles.studio} ${spin ? styles.spin : ""}`} style={style} aria-hidden>
      <div className={styles.book} ref={ref}>
        <div className={`${styles.face} ${styles.front}`}>
          {meta.cover ? <img src={meta.cover} alt="" draggable={false} /> : <CoverArt meta={meta} title={title} />}
        </div>
        <div className={`${styles.face} ${styles.back}`}>{meta.back ? <img src={meta.back} alt="" draggable={false} /> : <div className={styles.backArt} />}</div>
        <div className={`${styles.face} ${styles.spine}`}>
          {meta.spine ? <img src={meta.spine} alt="" draggable={false} /> : <span className={styles.spineText}>{meta.short ?? title}</span>}
        </div>
        <div className={`${styles.face} ${styles.pages} ${styles.edge}`} />
        <div className={`${styles.face} ${styles.pages} ${styles.top}`} />
        <div className={`${styles.face} ${styles.pages} ${styles.bottom}`} />
      </div>
      <div className={styles.floor} />
    </div>
  );
}

function fallbackMeta(title: string): BookMeta {
  return { name: title, sub: "", short: title, art: "grid", color: "#1E3263", color2: "#122142", order: 99 };
}

// Хавтасны зураг: нүүр хуудасны номын цилиндрийн SVG мотивууд
function CoverArt({ meta, title }: { meta: BookMeta; title: string }) {
  const A = "rgba(184,203,239,.85)", W = "#fff";
  return (
    <div className={styles.coverArt}>
      <svg viewBox="0 0 100 100" className={styles.motif}>
        {meta.art === "grid" && <g fill="none" stroke={A} strokeWidth="1.4">{Array.from({ length: 16 }, (_, i) => <rect key={i} x={10 + (i % 4) * 21} y={10 + Math.floor(i / 4) * 21} width="16" height="16" rx="3" />)}</g>}
        {meta.art === "tri" && <><polygon points="12,86 88,86 34,16" fill="none" stroke={W} strokeWidth="2" /><circle cx="47" cy="62" r="20" fill="none" stroke={A} strokeWidth="1.6" /></>}
        {meta.art === "circ" && <><circle cx="50" cy="50" r="38" fill="none" stroke={W} strokeWidth="2" /><path d="M50 50 L88 50 A38 38 0 0 0 69 17 Z" fill="rgba(184,203,239,.18)" stroke={A} strokeWidth="1.6" /><line x1="16" y1="68" x2="84" y2="68" stroke={A} strokeWidth="1.6" /></>}
        {meta.art === "cube" && <><g fill="none" stroke={W} strokeWidth="2"><rect x="18" y="34" width="46" height="46" /><rect x="36" y="18" width="46" height="46" /><path d="M18 34 L36 18 M64 34 L82 18 M64 80 L82 64 M18 80 L36 64" /></g><line x1="18" y1="80" x2="82" y2="18" stroke={A} strokeWidth="1.8" strokeDasharray="5 4" /></>}
        {meta.art === "pi" && <><circle cx="50" cy="50" r="36" fill="none" stroke={W} strokeWidth="2" /><line x1="14" y1="50" x2="86" y2="50" stroke={A} strokeWidth="1.8" /><circle cx="50" cy="50" r="3.5" fill={A} /></>}
        {meta.art === "sum" && <g fill="none" stroke={W} strokeWidth="2.2" strokeLinejoin="round"><path d="M28 22 H72 L46 50 L72 78 H28" /><path d="M20 86 H80" stroke={A} strokeWidth="1.4" /></g>}
      </svg>
      <div className={styles.coverText}>
        <span className={styles.coverSub}>{meta.sub}</span>
        <span className={styles.coverName}>{meta.name || title}</span>
      </div>
      <span className={styles.coverBrand}>Шинэ Ирээдүйн Эзэд</span>
    </div>
  );
}

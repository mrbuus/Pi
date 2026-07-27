"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fileUrl } from "@/lib/api";

/**
 * Геометрийн зураг / график ЗУРАГТАЙ бодлогын хэсэг.
 *
 * Зорилго: зурагтай бодлого (жш: гурвалжны өнцөг, графикийн утга) уншихад
 * зураг болон бодлогын текст хамт харагдаж, дэлгэц дор нь гараас алдагдахгүй
 * байх.
 *
 *   - Desktop (≥768px): зураг + бодлогын текст ХАЖУУГААР (зураг баганын
 *     өргөн ≤ ~40-45%, босоо голлуулсан).
 *   - Mobile: зураг бодлогын текстийн ДЭЭР давхарлагдана (stacked).
 *   - Багасгасан thumbnail дээр дарахад ТОМ харах (lightbox) горим нээгдэнэ
 *     — pinch/дарж чирэх (pan) зумтай, ✕ хаах, "Reset" товчтой.
 *   - Inline thumbnail дээрээ ambient pinch-zoom АСААГҮЙ — зөвхөн lightbox
 *     дотор л зумлана, санамсаргүй auto-zoom хийхгүй.
 */

// object-fit ЗААВАЛ "contain" байх ёстой (never "cover"): гурвалжны орой,
// өнцгийн тэмдэглэгээ мэт ЗУРГИЙН ХИЛИЙН ОЙРХОН байрлах чухал мэдээллийг
// "cover" тайрч хаяж болзошгүй бөгөөд энэ нь хариултад шууд нөлөөлнө.
const CONTAIN_STYLE: React.CSSProperties = { objectFit: "contain" };

export default function ProblemFigure({
  imageKey,
  alt,
  isCurrent = false,
  isStaffView = false,
  children,
}: {
  imageKey?: string | null;
  /** Зургийн alt текст — сурагчид (screen reader) болон alt ачаалагдаагүй үед харагдана */
  alt?: string | null;
  /**
   * Энэ асуулт ОДОО дэлгэцэн дээр харагдаж буй эсэх. true үед л eager+high
   * priority ачаална — 🚨 шалгалт бодож буй сурагч хоосон хайрцаг харж
   * тайлбар бодохоор хүлээх нь бодит цаг алдалт тул ОДОО-гийн зургийг
   * хойшлуулж (lazy) БОЛОХГҮЙ. Бусад (өөр) асуултын зургийг л lazy ачаална.
   */
  isCurrent?: boolean;
  /** Багш/админ харагдацад alt дутуу бол анхааруулга үзүүлнэ (сурагчид үзүүлэхгүй, бодохыг нь блоклохгүй) */
  isStaffView?: boolean;
  children: React.ReactNode;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const url = fileUrl(imageKey);
  const hasAlt = !!alt && alt.trim() !== "";
  const effectiveAlt = hasAlt ? alt! : "Бодлогын зураг";

  if (!url) {
    // Зураггүй бодлого — энгийн текст layout, багана хуваахгүй
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="order-1 md:order-none md:w-[42%] md:shrink-0">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-line bg-surface p-2 focus-visible:outline-none"
          aria-label={`${effectiveAlt} — томруулж харах`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={effectiveAlt}
            // 🚨 ЗААВАЛ: одоогийн асуултын зураг eager+high, бусад нь lazy.
            // Шалгалтын үеэр асуултын зураг хоцорч ачаалах нь сурагчийн
            // цагийг зэрлэгээр иддэг тул энэ логикийг бүү өөрчил.
            loading={isCurrent ? "eager" : "lazy"}
            fetchPriority={isCurrent ? "high" : "auto"}
            className="max-h-72 w-auto max-w-full rounded-lg transition group-hover:opacity-90"
            style={CONTAIN_STYLE}
          />
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-panel/90 px-2 py-1 text-[11px] font-medium text-ink-dim shadow-sm">
            Томруулах ⤢
          </span>
        </button>

        {isStaffView && !hasAlt && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
            <span aria-hidden="true">⚠</span>
            Alt текст оруулаагүй байна — дэлгэцний уншигчид энэ зураг тайлбаргүй харагдана
          </p>
        )}
      </div>

      <div className="order-2 min-w-0 flex-1 md:order-none">{children}</div>

      {lightboxOpen && (
        <FigureLightbox url={url} alt={effectiveAlt} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}

/** Хоёр хурууны зайг тооцно (pinch-zoom-д зориулав) */
function touchDistance(t: React.TouchList): number {
  if (t.length < 2) return 0;
  const dx = t[0].clientX - t[1].clientX;
  const dy = t[0].clientY - t[1].clientY;
  return Math.hypot(dx, dy);
}

function FigureLightbox({
  url,
  alt,
  onClose,
}: {
  url: string;
  alt: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Esc дарахад хаана
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const next = Math.min(6, Math.max(1, scale - e.deltaY * 0.0015 * scale));
    setScale(next);
    if (next === 1) setPan({ x: 0, y: 0 });
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchStart.current = { dist: touchDistance(e.touches), scale };
    } else if (e.touches.length === 1 && scale > 1) {
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: pan.x,
        panY: pan.y,
      };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStart.current) {
      e.preventDefault();
      const dist = touchDistance(e.touches);
      const ratio = dist / (pinchStart.current.dist || dist);
      const next = Math.min(6, Math.max(1, pinchStart.current.scale * ratio));
      setScale(next);
      if (next === 1) setPan({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && dragStart.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchStart.current = null;
    if (e.touches.length < 1) dragStart.current = null;
  }

  // Хулгана чирэх (desktop pan) — зөвхөн зумласан үед
  function onMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return;
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  }
  function onMouseUp() {
    dragStart.current = null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-panel/90 px-3 py-2 text-sm font-medium text-ink shadow focus-visible:outline-none"
        >
          Дахин тохируулах
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Хаах"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-panel/90 text-lg font-bold text-ink shadow focus-visible:outline-none"
        >
          ✕
        </button>
      </div>

      <div
        className="max-h-full max-w-full touch-none overflow-hidden"
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          loading="eager"
          fetchPriority="high"
          draggable={false}
          className="max-h-[85vh] max-w-[90vw] select-none rounded-lg"
          style={{
            ...CONTAIN_STYLE,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transition: dragStart.current || pinchStart.current ? "none" : "transform 120ms ease-out",
            cursor: scale > 1 ? "grab" : "default",
          }}
        />
      </div>
    </div>
  );
}

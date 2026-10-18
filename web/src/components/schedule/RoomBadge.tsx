import { roomShapeOf, type RoomShapeKind } from "./types";
import RoomShape from "./RoomShape";

/**
 * Танхимын дүрс ДОТРОО дугаартай (эзэн 2026-10-18).
 *
 * СТАНДАРТ: бүх дүрс ижил 24×24 талбайд, төвд нь ижил «аюулгүй бүс»
 * (≈ x 6.5–17.5, y 10–14) багтахаар зурагдсан. Тиймээс дугаар бүгд НЭГ хэмжээтэй,
 * НЭГ өндөрт (y = 12), яг голдоо — зэрэгцүүлэхэд тоонууд нэг шугамд харагдана.
 * Гурвалжин: суурь нь бусадтай нэг түвшинд, орой нь бага зэрэг дээш (дугаар багтах).
 * Өнгө: логоны хар хөх (--logo, харанхуйд цайвар хувилбар) — дүрс, дугаар хоёулаа.
 *
 * size: "sm" = 36px (жагсаалтын мөр), "md" = 44px (хүснэгт, карт).
 */
const PX = { sm: 36, md: 44 } as const;

/** Дугаартай тэмдгийн дүрсүүд (RoomShape-ээс ТУСДАА — төвд дугаар багтах геометр) */
const BADGE_PATHS: Record<Exclude<RoomShapeKind, "online">, React.ReactNode> = {
  // 501 — тойрог
  circle: <circle cx="12" cy="12" r="10.4" />,
  // 502 — тэгш талт гурвалжин. Суурь бусадтай нэг түвшинд (y 22.6), бусдаас бага
  // зэрэг ТОМ (гурвалжин оптикоор жижиг харагддаг) — голын шугамд дугаар багтана.
  triangle: <path d="M12 -1 L25.6 22.6 H-1.6 Z" />,
  // 503 — трапец
  trapezoid: <path d="M6.4 3.6 H17.6 L22.6 20.4 H1.4 Z" />,
  // 504 — квадрат
  square: <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="1.6" />,
  // 405 — тэгш өнцөгт (намхан, өргөн)
  rect: <rect x="1.2" y="5.6" width="21.6" height="12.8" rx="1.6" />,
  // 404 — таван өнцөгт
  pentagon: <path d="M12 1.4 L22.8 9.3 L18.7 21.8 H5.3 L1.2 9.3 Z" />,
  // 403 — ромбо
  diamond: <path d="M12 0.8 L23.2 12 L12 23.2 L0.8 12 Z" />,
  // 301 — зургаан өнцөгт (босоо хажуу)
  hexagon: <path d="M12 1.2 L21.6 6.6 V17.4 L12 22.8 L2.4 17.4 V6.6 Z" />,
  // 302 — параллелограмм (баруун тийш налсан)
  parallelogram: <path d="M6.6 4.4 H23 L17.4 19.6 H1 Z" />,
};

/** Бүх дугаарт НЭГ хэмжээ, НЭГ төв — нэг шугамд зэрэгцэнэ. Эзэн 2026-10-18:
 *  «тоо нарийхан, ялгахад хэцүү» → том, бүдүүн (800). Гурвалжинд багтахаар
 *  төвийг бага зэрэг доош (12.8) — бусад дүрсэнд ч ижил шугам. */
const FONT = 5.6;
const CENTER_Y = 12.8;

export default function RoomBadge({
  room,
  size = "sm",
  className = "",
}: {
  room: string | null | undefined;
  size?: keyof typeof PX;
  className?: string;
}) {
  const px = PX[size];
  const shape = roomShapeOf(room);
  if (!room) return null;
  if (!shape || shape === "online") {
    return (
      <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-logo ${className}`}>
        {shape === "online" && <RoomShape room={room} size={Math.round(px * 0.6)} />}
        {room}
      </span>
    );
  }
  // Зураасны оптик зузаан ~1.5px (хэмжээнээс үл хамааран ижил)
  const strokeWidth = (24 / px) * 1.5;
  return (
    <span
      role="img"
      aria-label={`${room} танхим`}
      title={`${room} танхим`}
      className={`inline-flex shrink-0 text-logo ${className}`}
      style={{ width: px, height: px }}
    >
      <svg viewBox="0 0 24 24" width={px} height={px} aria-hidden overflow="visible">
        <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
          {BADGE_PATHS[shape]}
        </g>
        <text
          x="12"
          y={CENTER_Y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={FONT}
          fontWeight={800}
          fill="currentColor"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {room}
        </text>
      </svg>
    </span>
  );
}

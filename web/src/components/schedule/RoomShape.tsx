import { roomShapeOf, type RoomShapeKind } from "./types";

/**
 * Танхимын ХААЛГАН ДЭЭРХ бодит дүрс (501=бөөрөнхий, 502=гурвалжин, 503=трапец,
 * 504=квадрат, 403=ромбо, 404=таван өнцөгт, 405=тэгш өнцөгт).
 *
 * Дизайны шийдэл: цулгуй нимгэн хүрээ + мөн өнгийн ЗӨӨЛӨН будалт (16%).
 * Будалтгүй, зузаан хүрээтэй хувилбар нь хүүхдийн зурag шиг харагдаж
 * байсан (эзний шүүмж) — duotone нь дизайн-системийн тэмдэглэгээ шиг
 * уншигдана. Rect-үүд rx-ээр, олон өнцөгтүүд round join-оор зөөлөрнө.
 */
const SHAPE_PATHS: Record<RoomShapeKind, React.ReactNode> = {
  circle: <circle cx="8" cy="8" r="5.7" />,
  triangle: <path d="M8 2.6 L13.4 12.1 L2.6 12.1 Z" />,
  trapezoid: <path d="M5.1 3.5 H10.9 L13.8 12.5 H2.2 Z" />,
  square: <rect x="3" y="3" width="10" height="10" rx="2" />,
  rect: <rect x="1.7" y="5" width="12.6" height="6" rx="1.8" />,
  pentagon: <path d="M8 2.4 L13.7 6.5 L11.5 13.3 H4.5 L2.3 6.5 Z" />,
  diamond: <path d="M8 2 L14 8 L8 14 L2 8 Z" />,
  // Онлайн — дэлгэц
  online: (
    <>
      <rect x="2" y="3.2" width="12" height="8" rx="1.6" />
      <path d="M5.6 13.4 H10.4" fill="none" />
    </>
  ),
};

export default function RoomShape({
  room,
  size = 16,
  className = "",
  color,
}: {
  room: string | null | undefined;
  size?: number;
  className?: string;
  /** Дүрсийг ангийн өнгөөр будах — өнгө=анги, дүрс=танхим гэсэн давхар кодчилол */
  color?: string;
}) {
  const shape = roomShapeOf(room);
  if (!shape) return null;
  const stroke = color ?? "currentColor";
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill={stroke}
      fillOpacity="0.16"
      stroke={stroke}
      strokeWidth="1.3"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      {SHAPE_PATHS[shape]}
    </svg>
  );
}

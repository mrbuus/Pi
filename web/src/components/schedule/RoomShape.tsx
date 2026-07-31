import { roomShapeOf, type RoomShapeKind } from "./types";

/**
 * Танхимын ХААЛГАН ДЭЭРХ бодит дүрсийг зурна (501=бөөрөнхий, 502=гурвалжин,
 * 503=трапец, 504=квадрат, 404=таван өнцөгт, 403=ромбо, 405=тэгш өнцөгт).
 *
 * Яагаад дугаарын оронд/хамт дүрс вэ: сурагч, багш нар танхимаа дугаараар
 * биш хаалган дээрх дүрсээр нь танидаг (эзний тэмдэглэгээ). Тиймээс UI дээр
 * дүрс нь дугаараас түрүүнд нүдэнд тусах ёстой.
 *
 * Бүгд НЭГ 14×14 viewBox-т, ижил зузаан stroke-той гар зурсан SVG — lucide-ийн
 * бэлэн дүрстэй хольж хэрэглэвэл жин нь зөрж замбараагүй харагдана.
 */
const SHAPE_PATHS: Record<RoomShapeKind, React.ReactNode> = {
  circle: <circle cx="7" cy="7" r="5.4" />,
  triangle: <path d="M7 1.8 L12.8 12.2 L1.2 12.2 Z" />,
  trapezoid: <path d="M4.2 2.6 H9.8 L12.8 11.4 H1.2 Z" />,
  square: <rect x="2.2" y="2.2" width="9.6" height="9.6" />,
  rect: <rect x="1.2" y="4" width="11.6" height="6" />,
  pentagon: <path d="M7 1.2 L12.8 5.6 L10.6 12.4 H3.4 L1.2 5.6 Z" />,
  diamond: <path d="M7 1.2 L12.8 7 L7 12.8 L1.2 7 Z" />,
  // Онлайн — дэлгэц маягийн хүрээ
  online: (
    <>
      <rect x="1.6" y="2.6" width="10.8" height="7.2" rx="1" />
      <path d="M4.6 12 H9.4" />
    </>
  ),
};

export default function RoomShape({
  room,
  size = 14,
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
  return (
    <svg
      viewBox="0 0 14 14"
      width={size}
      height={size}
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      {SHAPE_PATHS[shape]}
    </svg>
  );
}

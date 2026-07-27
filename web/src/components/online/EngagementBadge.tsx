import { EngagementLevel } from "./types";

// Идэвхийн флаг — ӨНГӨ дангаараа утга илэрхийлдэггүй: дүрс + монгол шошго
// хоёулаа үргэлж хамт харагдана (өнгөгүй дэлгэц/принтэр дээр ч ялгагдана).
const META: Record<
  EngagementLevel,
  { icon: string; label: string; toneClass: string }
> = {
  ACTIVE: {
    icon: "⚡",
    label: "Идэвхтэй",
    toneClass: "bg-success/10 text-success",
  },
  SLOWING: {
    icon: "🌗",
    label: "Сулраж байна",
    toneClass: "bg-warning/10 text-warning",
  },
  DORMANT: {
    icon: "💤",
    label: "Идэвхгүй",
    toneClass: "bg-error/10 text-error",
  },
};

export default function EngagementBadge({
  level,
  className = "",
}: {
  level: EngagementLevel;
  className?: string;
}) {
  const m = META[level];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${m.toneClass} ${className}`}
    >
      <span aria-hidden>{m.icon}</span>
      {m.label}
    </span>
  );
}

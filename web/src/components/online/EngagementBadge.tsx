import { Moon, MoonStar, Zap, type LucideIcon } from "lucide-react";
import { EngagementLevel } from "./types";

// Идэвхийн флаг — ӨНГӨ дангаараа утга илэрхийлдэггүй: дүрс + монгол шошго
// хоёулаа үргэлж хамт харагдана (өнгөгүй дэлгэц/принтэр дээр ч ялгагдана).
const META: Record<
  EngagementLevel,
  { icon: LucideIcon; label: string; toneClass: string }
> = {
  ACTIVE: {
    icon: Zap,
    label: "Идэвхтэй",
    toneClass: "bg-success/10 text-success",
  },
  SLOWING: {
    icon: MoonStar,
    label: "Сулраж байна",
    toneClass: "bg-warning/10 text-warning",
  },
  DORMANT: {
    icon: Moon,
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
      <m.icon className="h-3.5 w-3.5" aria-hidden />
      {m.label}
    </span>
  );
}

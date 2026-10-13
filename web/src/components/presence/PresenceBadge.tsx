"use client";

import { Users } from "lucide-react";
import { Badge } from "@/components/ui/kit/badge";
import type { PresenceEditor } from "@/hooks/usePresence";

/**
 * «Б. Баасанжав засаж байна» — өөр багш зэрэг нээсэн үед л харагдана
 * (hooks/usePresence). Хоёроос олон бол «+2».
 */
export default function PresenceBadge({
  editors,
  verb = "засаж байна",
  className,
}: {
  editors?: PresenceEditor[];
  verb?: string;
  className?: string;
}) {
  if (!editors?.length) return null;
  const names = editors.map((e) => e.name);
  const shown = names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  return (
    <Badge tone="warning" role="status" title={names.join(", ")} className={className}>
      <Users aria-hidden />
      {shown} {verb}
    </Badge>
  );
}

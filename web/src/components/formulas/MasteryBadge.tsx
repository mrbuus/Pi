import { Badge } from "@/components/ui/kit/badge";
export function MasteryBadge({
  correctCount,
  seenCount,
}: {
  correctCount: number;
  seenCount: number;
}) {
  const ratio =
    seenCount > 0 ? Math.max(0, Math.min(1, correctCount / seenCount)) : 0;
  return (
    <Badge
      tone={ratio >= 0.8 ? "success" : ratio >= 0.5 ? "warning" : "danger"}
    >
      {ratio >= 0.8
        ? "Эзэмшсэн"
        : ratio >= 0.5
          ? "Сайжирч байна"
          : "Давтах хэрэгтэй"}{" "}
      ({correctCount}/{seenCount})
    </Badge>
  );
}

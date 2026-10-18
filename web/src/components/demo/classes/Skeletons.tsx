import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * Сервер талд (цаг хамаарсан өгөгдөл байхгүй үед) харуулах бүтцийн сүүдэр.
 * Хөтөч дээр өгөгдөл тооцогдмогц бодит агуулгаар солигдоно.
 */

function Bar() {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center" aria-hidden>
      <SkeletonLine width="100%" height={44} className="sm:max-w-xs" />
      <SkeletonLine width={220} height={44} />
    </div>
  );
}

export function ClassesSkeleton() {
  return (
    <div role="status" aria-label="Ачаалж байна">
      <Bar />
      <SkeletonLine width={120} height={18} className="mb-3" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} className="h-44" />
        ))}
      </div>
    </div>
  );
}

export function ClassSkeleton() {
  return (
    <div role="status" aria-label="Ачаалж байна" className="space-y-4">
      <SkeletonLine width={96} height={20} />
      <SkeletonCard className="h-36" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonCard key={i} className="h-24" />
        ))}
      </div>
      <SkeletonCard className="h-72" />
    </div>
  );
}

export function StudentsSkeleton() {
  return (
    <div role="status" aria-label="Ачаалж байна">
      <Bar />
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <SkeletonLine key={i} width="100%" height={56} />
        ))}
      </div>
    </div>
  );
}

export function StudentSkeleton() {
  return (
    <div role="status" aria-label="Ачаалж байна" className="space-y-4">
      <SkeletonLine width={96} height={20} />
      <SkeletonCard className="h-56" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} className="h-24" />
        ))}
      </div>
      <SkeletonCard className="h-64" />
    </div>
  );
}

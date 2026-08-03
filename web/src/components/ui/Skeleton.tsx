/**
 * Скелетон — агуулга ирэхийг хүлээх үеийн бүтцийн сүүдэр.
 *
 * ЯАГААД ЧУХАЛ ВЭ: Render-ийн үнэгүй багц унтарсан үед эхний хүсэлт 60 секунд
 * хүртэл үргэлжилдэг. Тэр хугацаанд цагаан хоосон дэлгэц харуулбал хэрэглэгч
 * "эвдэрсэн" гэж бодоод хуудсаа хаана. Бодит бүтцийн хэлбэрийг (мөр, карт)
 * үзүүлбэл "ирж байна" гэдэг нь ойлгомжтой болж, хүлээх тэсвэр эрс нэмэгддэг.
 *
 * Цэвэр CSS (globals.css → .skeleton) — сүлжээнээс нэмэлт байт татахгүй.
 */

export function SkeletonLine({
  width = "100%",
  height = 12,
  className = "",
}: {
  width?: string | number;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height }}
      aria-hidden
    />
  );
}

/** Жагсаалт/хүснэгтийн мөрүүдийн сүүдэр */
export function SkeletonRows({
  rows = 5,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonLine width={110} height={14} />
          <SkeletonLine width={`${55 + ((i * 13) % 30)}%`} height={14} />
        </div>
      ))}
    </div>
  );
}

/** Картын сүүдэр */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-line bg-panel p-4 ${className}`}
      aria-hidden
    >
      <SkeletonLine width={140} height={16} />
      <div className="mt-3 space-y-2">
        <SkeletonLine />
        <SkeletonLine width="80%" />
      </div>
    </div>
  );
}

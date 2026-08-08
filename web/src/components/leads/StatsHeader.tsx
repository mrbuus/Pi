interface StatsHeaderProps {
  total: number;
  newThisWeek: number;
  conversionRate: number | null;
}

/** Хэмжигдэхгүй байсан зүйлийг хэмжинэ гэдгийн цөм — гурван тоог л харуулна,
 * бүгд бодит өгөгдлөөс тооцоологдоно (үзэсгэлэнгийн зорилгоор хийсэн тоо биш). */
export default function StatsHeader({
  total,
  newThisWeek,
  conversionRate,
}: StatsHeaderProps) {
  const tiles = [
    { label: "Нийт хүсэлт", value: String(total), sub: "бүх цаг үеийн нийлбэр" },
    {
      label: "Энэ 7 хоногт",
      value: String(newThisWeek),
      sub: "шинээр ирсэн хүсэлт",
    },
    {
      label: "Хөрвүүлэлт",
      value: conversionRate === null ? "—" : `${conversionRate}%`,
      sub: "элссэн / нийт хүсэлт",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-xl border border-line bg-surface p-4"
        >
          <p className="text-xs font-semibold text-ink-dim">{t.label}</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{t.value}</p>
          <p className="mt-0.5 text-xs text-ink-dim">{t.sub}</p>
        </div>
      ))}
    </div>
  );
}

"use client";

export interface FrequencyBadgeProps {
  lateCount: number;
  absentCount: number;
  /**
   * Сүүлийн 2 БОДИТ хичээлтэй өдөр (өчигдөр + өнөөдөр гэсэн үг биш — хамгийн
   * сүүлийн 2 удаагийн хичээл) огт тэмдэглэгдээгүй эсэх. Энэ дүрэм 30
   * хоногийн цонхноос ХАРААТ БИШ.
   */
  unmarkedLastTwoClassDays?: boolean;
}

/**
 * Давтамжийн анхааруулгын badge. Өнгө дангаараа утга илэрхийлэхгүй байхын
 * тулд icon + бодит тоо ЯМАГТ хамт харуулна.
 *
 * - Сүүлийн 2 хичээлтэй өдөр огт тэмдэглэгдээгүй → саарал.
 * - Сүүлийн 30 хоногт 5+ хоцорсон/тасалсан (нийлбэр) → улаан.
 * - Сүүлийн 30 хоногт 3–4 → хув шар (amber).
 * - Үгүй бол юу ч харуулахгүй.
 */
export function FrequencyBadge({
  lateCount,
  absentCount,
  unmarkedLastTwoClassDays,
}: FrequencyBadgeProps) {
  if (unmarkedLastTwoClassDays) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink-dim">
        <span aria-hidden>❓</span> 2 хичээлээр тэмдэглээгүй
      </span>
    );
  }

  const total = lateCount + absentCount;
  if (total >= 5) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-error/20 px-2 py-0.5 text-xs font-bold text-error">
        <span aria-hidden>⚠</span> 30 хоногт {lateCount} хоцорсон · {absentCount}{" "}
        тасалсан
      </span>
    );
  }
  if (total >= 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-xs font-semibold text-warning">
        <span aria-hidden>△</span> 30 хоногт {lateCount} хоцорсон · {absentCount}{" "}
        тасалсан
      </span>
    );
  }
  return null;
}

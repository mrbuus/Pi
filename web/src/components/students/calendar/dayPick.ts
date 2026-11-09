/**
 * Сарын хуанлийн хайрцаг дарахад `/students/:id/lesson-days` хариунаас ЯГ тэр хайрцгийн өдрийг сонгох
 * (эзэн 2026-11-10). Нэг өдөр хоёр мөр байж болно (өөрийн анги + өөр ангид тэмдэглэсэн).
 * Цэвэр функц — api/src/student-calendar/day-pick.spec.ts шалгана. Энэ файлд `@/` импорт БҮҮ нэм.
 */
export interface PickableDay {
  date: string;
  own: boolean;
  classroomName: string;
}

/**
 * @param otherClass самбарын хайрцаг «өөр ангид тэмдэглэсэн» бол тэр ангийн нэр, үгүй бол null
 * @returns таарах мөр, огноо нь огт байхгүй бол null
 */
export function pickLessonDay<T extends PickableDay>(days: readonly T[], date: string, otherClass: string | null): T | null {
  const same = days.filter((d) => d.date === date);
  if (!same.length) return null;
  if (otherClass) {
    return same.find((d) => d.classroomName === otherClass) ?? same.find((d) => !d.own) ?? same[0];
  }
  return same.find((d) => d.own) ?? same[0];
}

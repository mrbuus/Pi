// Шалгалтын нийтлэг цонх — Test.opensAt / Test.closesAt (эзэн 2026-11-21).
// Цэвэр логик — I/O-гүй, тесттэй (exam-window.spec.ts).
//
// - opensAt-аас өмнө эхлүүлэхгүй, closesAt-аас хойш (тэр мөчид ч) эхлүүлэхгүй.
// - Хоцорч эхэлсэн сурагч бүтэн хугацаа авахгүй: deadlineAt = min(эхэлсэн + хугацаа, closesAt).
// - Хоёулаа null бол өмнөх зан төлөв яг хэвээр.
// Огноо бүр UTC-ээр хадгалагдана; сурагчид Улаанбаатарын цагаар (UTC+8) харуулна.

export interface ExamWindow {
  opensAt?: Date | null;
  closesAt?: Date | null;
}

const UB = 'Asia/Ulaanbaatar';

/** «2026-11-25 09:00» — Улаанбаатарын цагаар. */
export function formatUB(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: UB,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

/** Шинэ сесс эхлүүлэх боломжгүй бол сурагчид харуулах мессеж, боломжтой бол null. */
export function startWindowError(test: ExamWindow, now: Date): string | null {
  if (test.opensAt && now.getTime() < test.opensAt.getTime()) {
    return `Шалгалт ${formatUB(test.opensAt)} цагт нээгдэнэ (Улаанбаатарын цагаар)`;
  }
  if (test.closesAt && now.getTime() >= test.closesAt.getTime()) {
    return `Шалгалт ${formatUB(test.closesAt)} цагт хаагдсан тул одоо эхлүүлэх боломжгүй`;
  }
  return null;
}

/** Сессийн дуусах цаг: min(эхэлсэн + хугацаа, хаах цаг). Аль аль нь байхгүй бол null. */
export function sessionDeadline(
  startedAt: Date,
  timeLimitMin: number | null | undefined,
  closesAt: Date | null | undefined,
): Date | null {
  const byLimit = timeLimitMin ? startedAt.getTime() + timeLimitMin * 60_000 : null;
  const byClose = closesAt ? closesAt.getTime() : null;
  if (byLimit === null && byClose === null) return null;
  if (byLimit === null) return new Date(byClose!);
  if (byClose === null) return new Date(byLimit);
  return new Date(Math.min(byLimit, byClose));
}

/** Багшийн оруулсан цонх зөв эсэх: хаах цаг нээхээс хойш байх. Алдаатай бол мессеж. */
export function windowError(test: ExamWindow): string | null {
  if (
    test.opensAt &&
    test.closesAt &&
    test.closesAt.getTime() <= test.opensAt.getTime()
  ) {
    return 'Хаах цаг нээх цагаас хойш байх ёстой';
  }
  return null;
}

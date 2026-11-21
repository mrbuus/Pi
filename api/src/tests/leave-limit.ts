// Шалгалтаас (апп, таб) гарах дүрэм — шалгалт бүрд багш сонгоно (эзэн 2026-11-21).
// Цэвэр логик — I/O-гүй, тесттэй.
//
// - Зөөлөн (3, анхдагч): 1, 2 дахь гаралтад анхааруулга, 3 дахьд автоматаар илгээнэ.
// - Хатуу (2): 1 дэх гаралтад сүүлчийн анхааруулга, 2 дахьд автоматаар илгээнэ.
//
// Автомат илгээх шийдвэрийг КЛИЕНТ (вэб, апп) гаргадаг: сервер `leaveCount`-ийг
// тоолж, `leaveLimit`-ийг дамжуулна. Автомат илгээлтийн хүсэлт тухайн LEAVE
// үйл явдлыг өөртөө агуулдаг тул илгээгдсэн session-ий `leaveCount >= leaveLimit`
// нь «гаралтаар автоматаар илгээгдсэн» гэсэн үг.

export const LEAVE_LIMITS = [2, 3] as const;
export type LeaveLimit = (typeof LEAVE_LIMITS)[number];
export const DEFAULT_LEAVE_LIMIT: LeaveLimit = 3;

/** Санд хадгалсан утгыг зөвшөөрөгдөх утга руу (хуучин/буруу утга → 3). */
export function normalizeLeaveLimit(value: unknown): LeaveLimit {
  return value === 2 ? 2 : DEFAULT_LEAVE_LIMIT;
}

/** Илгээгдсэн шалгалт гаралтын хязгаарт хүрсэн (автоматаар илгээгдсэн) эсэх. */
export function reachedLeaveLimit(
  leaveCount: number | null | undefined,
  leaveLimit: unknown,
): boolean {
  if (typeof leaveCount !== 'number' || leaveCount <= 0) return false;
  return leaveCount >= normalizeLeaveLimit(leaveLimit);
}

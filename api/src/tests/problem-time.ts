/** Сессийн problemTimes-ийн утга → бүхэл секунд (0..24ц), бусад үед null. */
export function spentSeconds(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw <= 24 * 3600
    ? Math.round(raw)
    : null;
}

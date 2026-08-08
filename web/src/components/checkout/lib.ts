/**
 * Checkout туслах функцүүд — банкны өнгө, хэмжээ гэх мэт
 */

/**
 * FNV-1a hash функц — банкны нэрээс тогтвортой өнгө гаргана
 * (lib/classroomColor.ts-ийн hashString функцийг дуурайсан)
 */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Банкны өнгөнүүд — сайн ялгаатай, өндөр ханасан */
const BANK_COLORS: readonly string[] = [
  "#e6194B", // улаан
  "#3cb44b", // ногоон
  "#4363d8", // хөх
  "#f58231", // улбар шар
  "#911eb4", // час ягаан
  "#42d4f4", // цайвар хөх
  "#f032e6", // ягаан
  "#469990", // цэнхэр ногоон
  "#9A6324", // хүрэн
  "#800000", // бор улаан
  "#000075", // харанхуй хөх
  "#808000", // хүрэн ногоон
  "#C2185B", // час улаан
] as const;

/**
 * Банкны нэрийг өнгө болгоно (deterministic)
 */
export function getBankColor(bankName: string): string {
  if (!bankName) return BANK_COLORS[0];
  const idx = hashString(bankName) % BANK_COLORS.length;
  return BANK_COLORS[idx];
}

/**
 * Банкны нэрээс эхний 1-2 үсэг авна (logo placeholder)
 */
export function getBankInitials(bankName: string): string {
  if (!bankName) return "?";
  const parts = bankName.split(" ");
  if (parts.length === 1) {
    // Нэг үсэг сан бол эхний үсэг л авна
    return parts[0][0]?.toUpperCase() ?? "?";
  }
  // Эхний хоёр үсэглэл нь хоёр үг эхлэл
  return (parts[0][0]?.toUpperCase() ?? "") + (parts[1]?.[0]?.toUpperCase() ?? "");
}

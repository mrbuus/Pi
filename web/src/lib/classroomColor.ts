/**
 * Ангийн өнгө — нэг ЭХ СУРВАЛЖ.
 *
 * Багш нарын самбар дээрх ангийн сонгогч болон ангийг жагсаасан бусад бүх
 * газарт ижил өнгө ашиглагдах ёстой (owner-ийн хүсэлт: "reuse the same
 * colour for that classroom anywhere else it is listed"). Тиймээс өнгийг
 * тухайн бүрэлдэхүүн хэсэг бүрт ДАХИН тооцохгүй, зөвхөн энэ модулиас авна.
 *
 * Дизайн:
 * - `classroomId`-аас deterministic (FNV-1a hash → mod palette length)
 *   тооцоолсон тул анги тухайн session, төхөөрөмжөөс үл хамааран үргэлж
 *   ЯГ ИЖИЛ өнгөтэй харагдана.
 * - Палитр нь 13 гараар сонгосон, hue wheel дээр өргөн зайтай байрлуулсан,
 *   өндөр ханасан (saturated) өнгөнөөс бүрдэнэ — санамсаргүй hue-с
 *   үүсгэсэн (жишээ нь `hsl(hash * 360 / n, ...)`) арга зайлсхийсэн, учир
 *   нь ойролцоо hue-үүд бүдэг, ялгагдахад хэцүү болдог (owner-ийн онцлон
 *   дурьдсан шаардлага).
 * - Өнгө бүр өөр өөр өнгөлэг гэр бүлээс (улаан/ногоон/хөх/шар/ягаан/
 *   хүрэн...) сонгогдсон бөгөөд гэрэлтэлт (lightness) ч ялгаатай тул
 *   өнгөний ойлголт султай (colour-vision-deficient) хэрэглэгчид, мөн
 *   хар цагаан хэвлэлд ч ялгаатай харагдана. Гэсэн ч энэ өнгө хэзээ ч
 *   ГАНЦААРАА мэдээлэл дамжуулах эх сурвалж БОЛОХГҮЙ — ангийн нэр үргэлж
 *   өнгөний хажууд харагдана (WCAG 1.4.1 "Use of Color").
 * - Эх сурвалж: Sasha Trubetskoy-ийн "20 Distinct Colors" жагсаалт
 *   (greedy алгоритмаар CIE зайг максимумчилсан, өргөн ашиглагддаг
 *   категорийн палитр) — 13 хамгийн ханасан, хангалттай contrast-той
 *   өнгийг сонгож авсан (маш цайвар beige/mint/lavender/apricot зэргийг
 *   жижиг бариулын хувьд ялгагдахгүй тул хассан).
 */

export interface ClassroomColorSwatch {
  /** Hex өнгө (bar/dot дэвсгэрт ашиглана) */
  hex: string;
  /** Дэлгэрэнгүй тайлбар (title/aria-д хэрэгтэй бол) */
  name: string;
}

const CLASSROOM_COLOR_PALETTE: readonly ClassroomColorSwatch[] = [
  { hex: "#e6194B", name: "улаан" },
  { hex: "#3cb44b", name: "ногоон" },
  { hex: "#4363d8", name: "хөх" },
  { hex: "#f58231", name: "улбар шар" },
  { hex: "#911eb4", name: "час ягаан" },
  { hex: "#42d4f4", name: "цайвар хөх" },
  { hex: "#f032e6", name: "ягаан" },
  { hex: "#469990", name: "цэнхэр ногоон" },
  { hex: "#9A6324", name: "хүрэн" },
  { hex: "#800000", name: "бор улаан" },
  { hex: "#000075", name: "харанхуй хөх" },
  { hex: "#808000", name: "хүрэн ногоон" },
  { hex: "#C2185B", name: "час улаан" },
] as const;

/** FNV-1a — түлхүүр (classroom id)-ээс тогтвортой 32 битийн тоо гаргана. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Тухайн ангийн id-д харгалзах тогтвортой өнгө (hex) буцаана. */
export function getClassroomColor(classroomId: string): string {
  if (!classroomId) return CLASSROOM_COLOR_PALETTE[0].hex;
  const idx = hashString(classroomId) % CLASSROOM_COLOR_PALETTE.length;
  return CLASSROOM_COLOR_PALETTE[idx].hex;
}

/** Тухайн ангийн id-д харгалзах өнгийн бүтэн мэдээлэл (hex + монгол нэр). */
export function getClassroomColorSwatch(
  classroomId: string,
): ClassroomColorSwatch {
  if (!classroomId) return CLASSROOM_COLOR_PALETTE[0];
  const idx = hashString(classroomId) % CLASSROOM_COLOR_PALETTE.length;
  return CLASSROOM_COLOR_PALETTE[idx];
}

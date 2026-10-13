/* ============================================================================
 * fillSlots — ЭЕШ-ийн "тоо нөхөх" (Хэсэг II) бодлогын АМАН тэмдэглэгээг
 * (жиш нь "...хариу [a] байна", "[bc]", "[fgh]") илрүүлж, хэдэн НҮД (нэг нүд =
 * нэг цифр) хэрэгтэйг тооцно.
 *
 * АНХААР: энэ файл зөвхөн ХАРАГДАЦЫГ (хэдэн нүд, хэрхэн бүлэглэх) тодорхойлно.
 * Сервер рүү илгээгдэх утгын хэлбэр (нэг шулуун стринг, ж: "354") ХЭВЭЭРЭЭ —
 * нүднүүд зөвхөн тухайн ганц стрингийг бодлогын текстэд заасан дараалал,
 * бүлгээр ХАРУУЛАХ илэрхийллийн давхарга. Ингэснээр багшийн аль хэдийн
 * зассан correctAnswer-ийн хэлбэртэй ямар ч зөрчилдөөнгүй (Шийдвэр: сервер-
 * талын дүн бодолтыг СУЛАРГААГҮЙ УИ-гийн цэвэр сайжруулалт).
 * ========================================================================== */

export interface FillSlotGroup {
  /** Хаалт доторх үсгүүд яг тэр хэвээрээ (ж: "a", "bc", "fgh") — зөвхөн харагдацад ашиглана */
  key: string;
  /** Энэ бүлэгт хэдэн нүд (= key.length) */
  length: number;
}

// [a], [bc], [fgh] мэт хаалттай тэмдэглэгээг илрүүлнэ (кирилл үсгээр бичсэн
// хувилбарыг ч танина). Хаалт бүр НЭГ бүлэг, дотор нь хэдэн үсэг байна нэг
// л тооны нүд (нэг үсэг = нэг цифр). Word-оос орсон \lbrack a\rbrack хэлбэрийг
// ч танина. api/src/tests/grading.ts (fillSlotKeys)-тэй ИЖИЛ дүрэм.
const BRACKET_RE =
  /\[([a-zA-Zа-яА-ЯёЁ]{1,8})\]|\\lbrack\s*([a-zA-Zа-яА-ЯёЁ]{1,8})\s*\\rbrack/g;

export function parseFillSlots(statementText?: string | null): FillSlotGroup[] {
  if (!statementText) return [];
  const seen = new Set<string>();
  const groups: FillSlotGroup[] = [];
  for (const m of statementText.matchAll(BRACKET_RE)) {
    const key = m[1] ?? m[2];
    if (seen.has(key)) continue; // давхардсан тэмдэглэгээг нэг л удаа тооно
    seen.add(key);
    groups.push({ key, length: key.length });
  }
  return groups;
}

export function slotsTotalLength(groups: FillSlotGroup[]): number {
  return groups.reduce((sum, g) => sum + g.length, 0);
}

/* ---------------------------------------------------------------------------
 * Хоосон нүдийг стрингд ХАДГАЛАХ. Өмнө нь нүднүүдийг `join("")` хийдэг байсан
 * тул дунд нүд хоосон үлдэхэд дараагийн цифрүүд зүүн тийш шилжиж буруу нүдэнд
 * очдог байв ("3", "", "5" → "35" → b=5). Одоо хоосон нүд = "_" ("3_5"), төгсгөлийн
 * хоосныг тайрна (бүгд хоосон → ""). Сервер "_"-г хоосон нүд гэж уншина.
 * ------------------------------------------------------------------------- */
export const FILL_EMPTY = "_";

/** Стринг → нүд бүрийн цифр ("" = хоосон). */
export function decodeSlotValue(value: string, total: number): string[] {
  return Array.from({ length: total }, (_, i) => {
    const ch = value[i] ?? "";
    return ch === FILL_EMPTY ? "" : ch;
  });
}

/** Нүд бүрийн цифр → стринг (хоосон нүд "_", төгсгөлийн хоосныг тайрна). */
export function encodeSlotDigits(digits: string[]): string {
  let end = digits.length;
  while (end > 0 && !digits[end - 1]) end--;
  return digits
    .slice(0, end)
    .map((d) => d || FILL_EMPTY)
    .join("");
}

/** Физик гараас цифр — эхний ХООСОН нүдэнд бичнэ (бүгд дүүрсэн бол өөрчлөхгүй). */
export function typeSlotDigit(value: string, total: number, digit: string): string {
  const digits = decodeSlotValue(value, total);
  const idx = digits.findIndex((d) => !d);
  if (idx === -1) return value;
  digits[idx] = digit;
  return encodeSlotDigits(digits);
}

/** Backspace — хамгийн сүүлд бөглөгдсөн нүдийг цэвэрлэнэ. */
export function backspaceSlot(value: string, total: number): string {
  const digits = decodeSlotValue(value, total);
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i]) {
      digits[i] = "";
      break;
    }
  }
  return encodeSlotDigits(digits);
}

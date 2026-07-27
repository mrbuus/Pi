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
// л тооны нүд (нэг үсэг = нэг цифр).
const BRACKET_RE = /\[([a-zA-Zа-яА-ЯёЁ]{1,8})\]/g;

export function parseFillSlots(statementText?: string | null): FillSlotGroup[] {
  if (!statementText) return [];
  const seen = new Set<string>();
  const groups: FillSlotGroup[] = [];
  for (const m of statementText.matchAll(BRACKET_RE)) {
    const key = m[1];
    if (seen.has(key)) continue; // давхардсан тэмдэглэгээг нэг л удаа тооно
    seen.add(key);
    groups.push({ key, length: key.length });
  }
  return groups;
}

export function slotsTotalLength(groups: FillSlotGroup[]): number {
  return groups.reduce((sum, g) => sum + g.length, 0);
}

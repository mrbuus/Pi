// Сургалтын төлбөрийг ӨДРӨӨР нарийн тооцох ЦЭВЭР логик — I/O байхгүй тул
// unit тестэд бүрэн ордог (grading.ts-тэй ижил зарчим).
//
// Эзний шаардлага: «хүүхэд хэрэв ангиас гарахаар болвол СУУСАН ӨДРӨӨР нь
// нийт төлсөн төлбөрөөс хасаад буцааж шилжүүлэхэд яг суусан өдрийг нарийн
// тооцдог автоматжуулалт».
//
// ══ ГОЛ ШИЙДВЭР 1: ХУАНЛИЙН өдөр БИШ, ХИЧЭЭЛИЙН өдөр ═══════════════════
//
// Сурагч 7 хоногт 3 удаа (Да·Лх·Ба) ирдэг. Хуанлийн өдрөөр тооцвол:
//   9-р сарын 1-нд орж, 9-р сарын 10-нд гарвал → 10/30 = 33% төлнө.
// Гэтэл тэр 10 хоногт ЯГ 4 хичээл болсон байж болно (сарын нийт 13-аас).
//   Хичээлийн өдрөөр → 4/13 = 31%.
// Хэрэв сурагч Да·Лх·Ба-д ирдэг атлаа Пү-Ня хооронд гарвал зөрүү бүр том.
// Хуанлийн өдрөөр тооцох нь ЗАРИМ сурагчид давуу, заримд нь гарз болно —
// өөрөөр хэлбэл ШУДАРГА БУС. Тиймээс энэ модуль хичээлийн бодит өдрүүдийг
// (амралт, цуцлалт хассан) авч тооцно.
//
// ══ ГОЛ ШИЙДВЭР 2: ӨДРИЙН ХАНШИЙГ ТООЦООНД ХЭРЭГЛЭХГҮЙ ═════════════════
//
//   БУРУУ:  dailyRate = round(400000 / 78) = 5128
//           owed = 5128 × 30 = 153,840
//   ЗӨВ:    owed = round(400000 × 30 / 78) = 153,846
//
// Зөрүү нь энд ердөө 6₮ ч 78 өдөрт хуримтлагдвал мэдэгдэхүйц болно. Өдрийн
// ханшийг ЗӨВХӨН хэрэглэгчид ойлгуулах зорилгоор тооцож харуулна, тооцоонд
// ХЭЗЭЭ Ч оруулахгүй.
//
// ══ ГОЛ ШИЙДВЭР 3: ГАРСАН ӨДРИЙГ ОРУУЛЖ ТООЦНО ════════════════════════
//
// Сурагч гарсан өдрөө хичээлдээ сууж байсан бол тэр өдөр нь ТООЛОГДОНО.
// Эсрэгээр тооцвол «сүүлийн хичээлээ үнэгүй үзсэн» болно. Хэрэв гарсан
// өдөр хичээлгүй байсан бол аяндаа тоологдохгүй (жагсаалтад байхгүй).
//
// ══ ГОЛ ШИЙДВЭР 4: ДУГУЙРУУЛАЛТ СУРАГЧИЙН ТАЛД ════════════════════════
//
// `owed`-ыг Math.floor-оор бууруулж дугуйруулна → буцаалт нэг төгрөгөөр
// илүү гарна. Шалтгаан: маргаан гарвал төв «илүү авсан» биш «илүү өгсөн»
// байх нь нэр хүндэд дээр. Зөрүү нь хамгийн ихдээ 1₮.

/** Огноо «YYYY-MM-DD» хэлбэрээр. Цагийн бүсийн алдаанаас сэргийлж Date БИШ. */
export type DateKey = string;

export interface ProrationInput {
  /**
   * Гэрээний хугацаанд тухайн АНГИД болох ХИЧЭЭЛИЙН бүх өдөр («YYYY-MM-DD»).
   * Амралт, цуцалсан хичээл ХАСАГДСАН байх ёстой (schedule.expandDays-ээс).
   * Эрэмбэлэгдсэн байх шаардлагагүй — дотор нь эрэмбэлнэ.
   */
  lessonDays: DateKey[];
  /** Гэрээний НИЙТ төлбөр (₮, бүхэл тоо) */
  totalTuition: number;
  /** Сурагч ангид орсон огноо. Энэ өдрөөс өмнөх хичээл тоологдохгүй. */
  joinedOn: DateKey;
  /** Ангиас гарах огноо. ЭНЭ ӨДРИЙГ ОРУУЛЖ тооцно. */
  leftOn: DateKey;
  /** Өнөөдрийг хүртэл ТӨЛСӨН нийт дүн (₮). Зөвхөн баталгаажсан төлбөр. */
  totalPaid: number;
}

export interface ProrationResult {
  /** Гэрээний нийт хичээлийн өдөр */
  totalLessonDays: number;
  /** Сурагчийн суусан (эсвэл суух эрхтэй байсан) хичээлийн өдөр */
  attendedLessonDays: number;
  /** Нэг хичээлийн үнэ (₮) — ЗӨВХӨН харуулах зорилгоор, тооцоонд ордоггүй */
  dailyRate: number;
  /** Сурагчийн ТӨЛӨХ ЁСТОЙ дүн (₮) */
  owed: number;
  /** Төлсөн дүн (оролтоос) */
  totalPaid: number;
  /** Буцаах дүн (₮). Хэзээ ч сөрөг байхгүй. */
  refundAmount: number;
  /** Дутуу төлсөн дүн (₮). Хэзээ ч сөрөг байхгүй. refund болон shortfall хоёрын нэг нь үргэлж 0. */
  shortfall: number;
  /** Тооцоо найдваргүй болох шалтгаанууд — UI дээр ЗААВАЛ харуулна */
  warnings: ProrationWarning[];
}

export type ProrationWarning =
  | 'NO_LESSON_DAYS'
  | 'LEFT_BEFORE_JOINED'
  | 'ZERO_TUITION'
  | 'LEFT_AFTER_LAST_LESSON'
  | 'JOINED_BEFORE_FIRST_LESSON';

/**
 * «YYYY-MM-DD» мөрүүдийг ШУУД харьцуулж болно — ISO огноо нь лексикографаар
 * эрэмбэлэгдэхэд хронологийн дарааллыг өгдөг. Date объект руу хөрвүүлбэл
 * цагийн бүсээс болж нэг өдрөөр гулсах эрсдэлтэй (STATUS.md §7.8-тэй ижил урхи).
 */
function inRange(day: DateKey, from: DateKey, to: DateKey): boolean {
  return day >= from && day <= to;
}

export function prorateTuition(input: ProrationInput): ProrationResult {
  const { totalTuition, joinedOn, leftOn, totalPaid } = input;
  const warnings: ProrationWarning[] = [];

  const days = [...new Set(input.lessonDays)].sort();
  const totalLessonDays = days.length;

  if (totalLessonDays === 0) warnings.push('NO_LESSON_DAYS');
  if (totalTuition <= 0) warnings.push('ZERO_TUITION');
  if (leftOn < joinedOn) warnings.push('LEFT_BEFORE_JOINED');
  if (totalLessonDays > 0) {
    if (leftOn > days[days.length - 1]) warnings.push('LEFT_AFTER_LAST_LESSON');
    if (joinedOn < days[0]) warnings.push('JOINED_BEFORE_FIRST_LESSON');
  }

  // Гарах огноо орох огнооноос ӨМНӨ бол нэг ч хичээл суугаагүй гэж үзнэ.
  const attendedLessonDays =
    leftOn < joinedOn ? 0 : days.filter((d) => inRange(d, joinedOn, leftOn)).length;

  // Хичээлийн өдөр байхгүй, эсвэл төлбөр 0 бол тооцох зүйлгүй — бүгдийг буцаана.
  if (totalLessonDays === 0 || totalTuition <= 0) {
    return {
      totalLessonDays,
      attendedLessonDays,
      dailyRate: 0,
      owed: 0,
      totalPaid,
      refundAmount: Math.max(0, totalPaid),
      shortfall: 0,
      warnings,
    };
  }

  // Өдрийн ханш — ЗӨВХӨН харуулах зорилгоор (Шийдвэр 2).
  const dailyRate = Math.round(totalTuition / totalLessonDays);

  // Нэг үйлдлээр — дугуйруулалтын алдаа хуримтлагдахгүй (Шийдвэр 2).
  // Math.floor — сурагчийн талд (Шийдвэр 4).
  const owed = Math.min(
    totalTuition,
    Math.floor((totalTuition * attendedLessonDays) / totalLessonDays),
  );

  const diff = totalPaid - owed;

  return {
    totalLessonDays,
    attendedLessonDays,
    dailyRate,
    owed,
    totalPaid,
    refundAmount: Math.max(0, diff),
    shortfall: Math.max(0, -diff),
    warnings,
  };
}

/**
 * Тооцооллыг хүнд ойлгомжтой МОНГОЛ өгүүлбэр болгоно.
 *
 * Яагаад энэ функц хэрэгтэй вэ: буцаалтын дүн бол эцэг эхтэй маргалддаг цэг.
 * «Яагаад ийм дүн гарав?» гэсэн асуултад UI дээр ШУУД хариулж чадвал
 * маргаан үүсэхгүй. Тоог нуухгүй, бүх алхмыг харуулна.
 */
export function explainProration(r: ProrationResult): string[] {
  const mnt = (n: number) => `${n.toLocaleString('en-US').replace(/,/g, ' ')}₮`;
  const lines = [
    `Гэрээний нийт хичээл: ${r.totalLessonDays} өдөр`,
    `Суусан хичээл: ${r.attendedLessonDays} өдөр`,
    `Нэг хичээлийн үнэ: ${mnt(r.dailyRate)}`,
    `Төлөх ёстой: ${mnt(r.owed)}`,
    `Төлсөн: ${mnt(r.totalPaid)}`,
  ];
  if (r.refundAmount > 0) lines.push(`Буцаах дүн: ${mnt(r.refundAmount)}`);
  else if (r.shortfall > 0) lines.push(`Дутуу төлбөр: ${mnt(r.shortfall)}`);
  else lines.push('Тооцоо тэнцсэн — буцаах болон нэхэх дүн байхгүй');
  return lines;
}

/** Анхааруулгыг хэрэглэгчид харуулах монгол бичвэр. */
export const PRORATION_WARNING_TEXT: Record<ProrationWarning, string> = {
  NO_LESSON_DAYS:
    'Энэ хугацаанд хичээлийн өдөр олдсонгүй. Ангийн хуваарь тохируулагдсан эсэхийг шалгана уу.',
  LEFT_BEFORE_JOINED:
    'Гарах огноо орсон огнооноос өмнө байна. Огноог шалгана уу.',
  ZERO_TUITION:
    'Сурагчийн сургалтын төлбөр тохируулагдаагүй байна. Бүртгэлээс төлбөрийн дүнг оруулна уу.',
  LEFT_AFTER_LAST_LESSON:
    'Гарах огноо гэрээний сүүлийн хичээлээс хойш байна — бүтэн хугацаагаар тооцов.',
  JOINED_BEFORE_FIRST_LESSON:
    'Орсон огноо гэрээний эхний хичээлээс өмнө байна — эхнээс нь тооцов.',
};

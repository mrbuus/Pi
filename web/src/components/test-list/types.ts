/* ============================================================================
 * Тестийн жагсаалт — нийтлэг төрлүүд ба цэвэр (side-effect-гүй) хэлперүүд.
 * page.tsx болон энэ фолдер доторх компонентууд эндээс импортолно.
 * ========================================================================== */

export interface TestRow {
  id: string;
  title: string;
  type: string;
  gradingMode?: string;
  timeLimitMin?: number;
  variantLabel?: string;
  groupKey?: string | null;
  // chapter.title / chapter.topic одоогоор /tests-ийн API select-д ороогүй
  // (зөвхөн chapter.book.code ирдэг) — ирээдүйд нэмэгдвэл splitTopic() доор
  // heuristic-ээс өмнө автоматаар ашиглагдана.
  chapter?: {
    book?: { code: string } | null;
    title?: string;
    topic?: { name?: string } | null;
  } | null;
  _count: { problems: number; results?: number };
  results?: { totalScore: number; maxScore: number }[];
  sessionStatus?: "IN_PROGRESS" | "SUBMITTED" | null;
}

export interface AttendanceRow {
  date: string;
  status: string;
}

export type Tab = "TEST" | "EXAM";

export interface GroupRow {
  row: TestRow;
  num: number | null;
}

// Ном бүр өөрийн өнгөтэй — 100/200/300/1000 номын тестүүд ялгаатай харагдана
export const BOOK_COLORS: Record<string, { chip: string; bar: string }> = {
  "100": { chip: "bg-accent-sky/15 text-accent-sky", bar: "border-l-accent-sky/60" },
  "200": { chip: "bg-accent-fuchsia/15 text-accent-fuchsia", bar: "border-l-accent-fuchsia/60" },
  "300": { chip: "bg-accent-gold/15 text-accent-gold", bar: "border-l-accent-gold/60" },
  "1000": { chip: "bg-accent-teal/15 text-accent-teal", bar: "border-l-accent-teal/60" },
};

// Урт код түрүүлж таарна ("1000" нь "100"-аас өмнө)
export function bookColor(code?: string | null) {
  const key = ["1000", "300", "200", "100"].find((k) => code?.startsWith(k));
  return key ? { key, ...BOOK_COLORS[key] } : null;
}

// Шалгалт = жинхэнэ шалгалтын төрлүүд; бусад нь энгийн дасгал ТЕСТ
export function isExamType(type: string) {
  return type === "CHAPTER_EXAM" || type === "EESH_MOCK";
}

// groupKey/chapter-ийн БОДИТ талбаруудыг эхэлж оролдоно; тэдгээр байхгүй үед
// л ГАРЧГИЙН ТЕКСТЭЭС таамаглана (heuristic: төгсгөлийн тоог regex-ээр
// салгана). API ирээдүйд chapter.title/topic-ийг буцаавал энэ fallback
// шаардлагагүй болно — доорх мөр яг тэр л heuristic хэсэг.
export function splitTopic(t: TestRow): { topic: string; num: number | null } {
  const key = (t.groupKey ?? t.chapter?.topic?.name ?? t.chapter?.title ?? t.title).trim();
  // heuristic fallback: "Илтгэгч тэгшитгэл 1" → { topic: "Илтгэгч тэгшитгэл", num: 1 }
  const m = key.match(/^(.*?)\s+(\d+)$/);
  if (m) return { topic: m[1], num: Number(m[2]) };
  return { topic: "Бусад", num: null };
}

// А/Б хувилбаруудыг ижил бодлого гэж танихад ашиглах түлхүүр (splitTopic-тэй
// нэг конвенц): groupKey байвал түүгээр, үгүй бол гарчгаар.
export function variantKey(t: TestRow): string {
  return (t.groupKey ?? t.title).trim();
}

// Сурагчид ижил бүлгийн (А/Б) хувилбаруудаас ЗӨВХӨН НЭГИЙГ харна. Backend
// одоогоор variant-ыг санамсаргүй/тогтмол оноодог логикгүй тул (Аудит §-д
// тэмдэглэсэн дутагдал) эндээс frontend талд шийднэ: аль хэдийн эхэлсэн/
// дуусгасан хувилбар байвал үүнийг илүүд үзнэ; үгүй бол сурагчийн ID +
// бүлгийн түлхүүрээс тогтвортой hash тооцож сонгоно (ижил сурагч үргэлж ижил
// хувилбар авна, ангийн сурагчид хувилбаруудад жигд тархана).
export function pickForStudent(rows: GroupRow[], studentId: string | null): GroupRow {
  if (rows.length === 1) return rows[0];
  const engaged =
    rows.find((r) => (r.row.results?.length ?? 0) > 0) ??
    rows.find((r) => r.row.sessionStatus === "IN_PROGRESS");
  if (engaged) return engaged;
  const key = `${studentId ?? ""}:${variantKey(rows[0].row)}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return rows[hash % rows.length];
}

export function collapseVariants(rows: GroupRow[], studentId: string | null): GroupRow[] {
  const buckets = new Map<string, GroupRow[]>();
  const order: string[] = [];
  for (const r of rows) {
    const key = variantKey(r.row);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(r);
  }
  return order.map((key) => {
    const siblings = buckets.get(key)!;
    return siblings.length > 1 ? pickForStudent(siblings, studentId) : siblings[0];
  });
}

export const SUBJECTS = [
  { value: "", label: "Бүх хичээл" },
  { value: "MATH", label: "Математик" },
  { value: "SOCIAL_STUDIES", label: "Нийгмийн ухаан" },
];

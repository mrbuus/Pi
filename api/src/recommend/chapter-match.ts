/**
 * Хичээлийн чөлөөт бичвэртэй сэдвийг бүлэгтэй тааруулах (цэвэр логик, тесттэй).
 *
 * Зөвхөн ЯГ эсвэл хэвшүүлсэн гарчгийн тэнцүү байдал — ойролцоо (fuzzy) тааруулалт ХИЙХГҮЙ.
 * Эргэлзээтэй үед null: буруу бүлэг нээхээс юу ч нээхгүй нь дээр.
 *
 * Хэвшүүлэлт: жижиг үсэг, хашилт/цэг таслал, эхний дугаарлалт («1.2», «3)»), илүү зай хасна.
 * Бүлгийн гарчгийн « · Тест N» дагавар нь нэг сэдвийг тестүүдэд хуваасан хэсэг тул суурь гарчгаар
 * тааруулна (бүгд ижил сэдэв — таамаг биш).
 */

export interface ChapterTitleRow {
  id: string;
  title: string;
  order: number;
  grade: number | null;
}

export interface ChapterMatch {
  chapterId: string;
  chapterIds: string[];
  title: string;
}

const TEST_SUFFIX = /\s*[·•|-]\s*тест\s*\d+[a-zа-яөү-]*\s*$/iu;

export function normalizeTopicTitle(raw: string): string {
  return raw
    .normalize('NFC')
    .toLocaleLowerCase('mn-MN')
    .replace(/[«»"'“”„`]/gu, ' ')
    // «1.2 », «3) », «4. » — гэхдээ «1000 бодлого»-ийн тоог хасахгүй
    .replace(/^\s*(?:§\s*)?(?:\d+(?:\.\d+)+\.?|\d+[.)])\s+/u, '')
    .replace(/[.,:;!?]+\s*$/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

/** Гарчгийн суурь — « · Тест N» дагаваргүй. */
export function chapterBaseTitle(title: string): string {
  return normalizeTopicTitle(title.replace(TEST_SUFFIX, ''));
}

/**
 * [topic]-д таарах бүлэг. Эхлээд яг гарчгийн тэнцүү (1 л бол), дараа нь суурь гарчгаар (« · Тест N»-ийн
 * бүлгүүд). Ангийн [grade] өгвөл тэр анги эсвэл ангигүй бүлгийг илүүд үзнэ. Хоёр өөр суурь гарчиг
 * үлдвэл эсвэл юу ч таарахгүй бол null.
 */
export function matchChapter(topic: string, chapters: ChapterTitleRow[], grade?: number | null): ChapterMatch | null {
  const wanted = normalizeTopicTitle(topic);
  if (wanted.length < 3) return null;
  const sorted = [...chapters].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const narrow = (rows: ChapterTitleRow[]) => {
    if (grade == null || rows.length <= 1) return rows;
    const same = rows.filter((r) => r.grade === grade || r.grade === null);
    return same.length ? same : rows;
  };

  const exact = narrow(sorted.filter((c) => normalizeTopicTitle(c.title) === wanted));
  if (exact.length === 1) return { chapterId: exact[0].id, chapterIds: [exact[0].id], title: exact[0].title };
  if (exact.length > 1) return null;

  const base = narrow(sorted.filter((c) => chapterBaseTitle(c.title) === wanted));
  if (!base.length) return null;
  return { chapterId: base[0].id, chapterIds: base.slice(0, 12).map((c) => c.id), title: topic.trim() };
}

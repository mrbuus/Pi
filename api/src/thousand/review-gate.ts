// «1000 бодлогын шалгалт»-ын эргэн харалтын ЦЭВЭР логик (I/O байхгүй, бүрэн тесттэй).
//
// Түвшин:
//   NONE     — юу ч харуулахгүй
//   PROBLEMS — бодлого + зураг + сурагчийн өөрийн хариу (зөв хариу ЗАДРАХГҮЙ)
//   FULL     — + зөв хариу, бодолт, YouTube бичлэг
//
// Багш ангийнхаа түвшинг гараар тавьж болно (reviewOpenedAt бөглөгдөнө). Гараар
// огт хөндөөгүй бол reviewAutoAt (өгөгдмөл: ангид оноосноос хойш 7 хоног)
// хүрэхэд FULL болж автоматаар нээгдэнэ.

export type ReviewLevelValue = 'NONE' | 'PROBLEMS' | 'FULL';

export const REVIEW_AUTO_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const RANK: Record<ReviewLevelValue, number> = { NONE: 0, PROBLEMS: 1, FULL: 2 };

export interface ReviewAccessRow {
  assignedAt: Date;
  reviewLevel: ReviewLevelValue;
  reviewAutoAt: Date | null;
  reviewOpenedAt: Date | null;
}

/** Автоматаар нээгдэх мөч: тавьсан огноо, эс бөгөөс ангид оноосноос 7 хоног. */
export function autoOpenAt(row: Pick<ReviewAccessRow, 'assignedAt' | 'reviewAutoAt'>): Date {
  return row.reviewAutoAt ?? new Date(row.assignedAt.getTime() + REVIEW_AUTO_DAYS * DAY_MS);
}

/** Нэг ангийн (TestAccess мөрийн) одоогийн бодит түвшин. */
export function effectiveLevel(row: ReviewAccessRow, now: Date): ReviewLevelValue {
  // Багш гараар тавьсан бол (хаасан ч гэсэн) автомат нээлт давамгайлахгүй.
  if (row.reviewOpenedAt) return row.reviewLevel;
  return now.getTime() >= autoOpenAt(row).getTime() ? 'FULL' : 'NONE';
}

/** Сурагч хэд хэдэн ангиар хамрагдвал хамгийн нээлттэй түвшин нь хүчинтэй. */
export function maxLevel(levels: ReviewLevelValue[]): ReviewLevelValue {
  return levels.reduce<ReviewLevelValue>(
    (best, level) => (RANK[level] > RANK[best] ? level : best),
    'NONE',
  );
}

export function levelAllows(level: ReviewLevelValue, needed: ReviewLevelValue): boolean {
  return RANK[level] >= RANK[needed];
}

/**
 * Ангигүй (зөвхөн худалдан авалт/эрхийн бичгээр) өгсөн сурагч: хариуцах багш
 * байхгүй тул илгээснээс хойш 7 хоногийн дараа FULL нээгдэнэ.
 */
export function purchaseOnlyLevel(submittedAt: Date | null, now: Date): {
  level: ReviewLevelValue;
  opensAt: Date | null;
} {
  if (!submittedAt) return { level: 'NONE', opensAt: null };
  const opensAt = new Date(submittedAt.getTime() + REVIEW_AUTO_DAYS * DAY_MS);
  return { level: now.getTime() >= opensAt.getTime() ? 'FULL' : 'NONE', opensAt };
}

// ============ YouTube холбоос ============

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

/**
 * youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID хэлбэрийг л
 * хүлээн авна. Бусад бүх зүйл (playlist, channel, өөр домэйн, javascript:)
 * → null. Буцаах утга нь видеоны 11 тэмдэгтийн ID.
 */
export function parseYoutubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > 500) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  let id: string | null = null;
  if (host === 'youtu.be') {
    id = parts.length === 1 ? parts[0] : null;
  } else if (YT_HOSTS.has(host)) {
    if (parts.length === 1 && parts[0] === 'watch') id = url.searchParams.get('v');
    else if (parts.length === 2 && parts[0] === 'shorts') id = parts[1];
  }
  return id && YT_ID.test(id) ? id : null;
}

/** ӨС-д хадгалах каноник хэлбэр. */
export function canonicalYoutubeUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** Эргэн харалтад суулгах нууцлалтай (cookie-гүй) хаяг. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

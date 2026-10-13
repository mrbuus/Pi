import {
  autoOpenAt,
  canonicalYoutubeUrl,
  effectiveLevel,
  maxLevel,
  parseYoutubeId,
  purchaseOnlyLevel,
  youtubeEmbedUrl,
} from './review-gate';

const assignedAt = new Date('2026-10-01T00:00:00Z');
const day = 24 * 60 * 60 * 1000;

describe('1000 бодлого — эргэн харалтын түвшин', () => {
  const untouched = { assignedAt, reviewLevel: 'NONE' as const, reviewAutoAt: null, reviewOpenedAt: null };

  it('өгөгдмөл автомат нээлт = ангид оноосноос 7 хоног', () => {
    expect(autoOpenAt(untouched).toISOString()).toBe('2026-10-08T00:00:00.000Z');
  });

  it('хөндөөгүй бол автомат огнооноос өмнө NONE, дараа нь FULL', () => {
    expect(effectiveLevel(untouched, new Date(assignedAt.getTime() + 7 * day - 1))).toBe('NONE');
    expect(effectiveLevel(untouched, new Date(assignedAt.getTime() + 7 * day))).toBe('FULL');
  });

  it('багш тавьсан reviewAutoAt өгөгдмөлийг орлоно', () => {
    const row = { ...untouched, reviewAutoAt: new Date('2026-10-03T00:00:00Z') };
    expect(effectiveLevel(row, new Date('2026-10-02T23:59:59Z'))).toBe('NONE');
    expect(effectiveLevel(row, new Date('2026-10-03T00:00:00Z'))).toBe('FULL');
  });

  it('гараар тавьсан түвшин автомат нээлтээс давамгайлна (PROBLEMS хэвээр, NONE хэвээр)', () => {
    const late = new Date(assignedAt.getTime() + 30 * day);
    const opened = new Date(assignedAt.getTime() + day);
    expect(effectiveLevel({ ...untouched, reviewLevel: 'PROBLEMS', reviewOpenedAt: opened }, late)).toBe('PROBLEMS');
    expect(effectiveLevel({ ...untouched, reviewLevel: 'NONE', reviewOpenedAt: opened }, late)).toBe('NONE');
    expect(effectiveLevel({ ...untouched, reviewLevel: 'FULL', reviewOpenedAt: opened }, assignedAt)).toBe('FULL');
  });

  it('хэд хэдэн ангид хамгийн нээлттэй түвшин', () => {
    expect(maxLevel([])).toBe('NONE');
    expect(maxLevel(['NONE', 'PROBLEMS'])).toBe('PROBLEMS');
    expect(maxLevel(['PROBLEMS', 'FULL', 'NONE'])).toBe('FULL');
  });

  it('ангигүй (худалдан авсан) сурагч илгээснээс 7 хоногийн дараа FULL', () => {
    const submitted = new Date('2026-10-01T10:00:00Z');
    expect(purchaseOnlyLevel(submitted, new Date(submitted.getTime() + day)).level).toBe('NONE');
    expect(purchaseOnlyLevel(submitted, new Date(submitted.getTime() + 7 * day)).level).toBe('FULL');
    expect(purchaseOnlyLevel(null, new Date()).level).toBe('NONE');
  });
});

describe('1000 бодлого — YouTube холбоосын шалгалт', () => {
  const id = 'dQw4w9WgXcQ';
  it.each([
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s`,
    `http://m.youtube.com/watch?v=${id}`,
    `www.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `  https://youtube.com/shorts/${id}?feature=share  `,
  ])('хүлээн авна: %s', (url) => {
    expect(parseYoutubeId(url)).toBe(id);
  });

  it.each([
    '',
    'hello',
    `https://vimeo.com/${id}`,
    `https://www.youtube.com.evil.com/watch?v=${id}`,
    `https://evil.com/?u=https://youtu.be/${id}`,
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/playlist?list=PL123',
    'https://www.youtube.com/@channel',
    `https://www.youtube.com/embed/${id}`,
    `javascript:alert(1)//youtu.be/${id}`,
    `ftp://youtu.be/${id}`,
    `https://user:pw@youtu.be/${id}`,
    `https://youtu.be/${id}/extra`,
  ])('татгалзана: %s', (url) => {
    expect(parseYoutubeId(url)).toBeNull();
  });

  it('каноник ба nocookie embed хаяг', () => {
    expect(canonicalYoutubeUrl(id)).toBe(`https://www.youtube.com/watch?v=${id}`);
    expect(youtubeEmbedUrl(id)).toBe(`https://www.youtube-nocookie.com/embed/${id}`);
  });
});

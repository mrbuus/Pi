import { readFileSync } from 'fs';
import { join } from 'path';
import {
  keepAssignedVariants,
  orderVariants,
  pickAssignedVariant,
  variantHash,
  VariantRow,
} from './variant-assign';

// Аппын алтан вектор (piemath_app/test/features/exam/variant_golden_test.dart)-ыг ШУУД уншина —
// апп, сервер хоёр нэг эх сурвалжтай тулгагдана (файл өөрчлөгдвөл энэ тест дагаж шалгана).
const GOLDEN_FILE = join(
  __dirname,
  '../../../piemath_app/test/features/exam/variant_golden_test.dart',
);

function dartString(body: string): string {
  return body.replace(/\\u\{([0-9A-Fa-f]+)\}/g, (_m, hex: string) =>
    String.fromCodePoint(parseInt(hex, 16)),
  );
}

function goldenVectors(): [string, number][] {
  const src = readFileSync(GOLDEN_FILE, 'utf8');
  const block = src.slice(src.indexOf('const _golden'), src.indexOf('];'));
  return [...block.matchAll(/\('((?:[^'\\]|\\.)*)',\s*(\d+)\)/g)].map((m) => [
    dartString(m[1]),
    Number(m[2]),
  ]);
}

const row = (id: string, groupKey: string, extra: Partial<VariantRow> = {}): VariantRow => ({
  id,
  groupKey,
  title: groupKey,
  createdAt: new Date('2026-11-21T00:00:00Z'),
  hasResult: false,
  sessionStatus: null,
  ...extra,
});

describe('variantHash — аппын алтан утгатай ижил', () => {
  const vectors = goldenVectors();
  it('вектор уншигдсан (20-иос олон)', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(20);
  });
  it.each(vectors)('hash(%j) = %d', (key, want) => {
    expect(variantHash(key)).toBe(want);
  });
  it.each(vectors.filter(([k]) => k.indexOf(':') > 0))(
    'pickAssignedVariant N=2,3: %j',
    (key, want) => {
      const i = key.indexOf(':');
      const student = key.slice(0, i);
      const group = key.slice(i + 1);
      for (const n of [2, 3]) {
        const rows = Array.from({ length: n }, (_, k) => row(`r${k}`, group));
        expect(pickAssignedVariant(rows, student).id).toBe(`r${want % n}`);
      }
    },
  );
});

describe('pickAssignedVariant — дүн → эхэлсэн → hash', () => {
  it('дүнтэй хувилбар давамгайлна', () => {
    const rows = [row('a', 'G'), row('b', 'G', { hasResult: true })];
    expect(pickAssignedVariant(rows, 'u1').id).toBe('b');
  });
  it('дүнгүй бол эхэлсэн сесстэй нь', () => {
    const rows = [row('a', 'G', { sessionStatus: 'IN_PROGRESS' }), row('b', 'G')];
    expect(pickAssignedVariant(rows, 'u1').id).toBe('a');
  });
  it('нэг мөр бол тэр', () => {
    expect(pickAssignedVariant([row('x', 'G')], 'u').id).toBe('x');
  });
});

describe('orderVariants — жагсаалтын дараалал', () => {
  it('шинэ нь эхэнд, тэнцвэл id', () => {
    const t = (id: string, iso: string) =>
      row(id, 'G', { createdAt: new Date(iso) });
    const out = orderVariants([
      t('b', '2026-01-01T00:00:00Z'),
      t('a', '2026-01-02T00:00:00Z'),
      t('c', '2026-01-01T00:00:00Z'),
    ]);
    expect(out.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('keepAssignedVariants — жагсаалтад зөвхөн өөрийн хувилбар', () => {
  const paper = new Set(['a', 'b']);
  it('цаасан горимын бүлэгт нэг л үлдэнэ, бусад хөндөгдөхгүй', () => {
    const rows = [row('a', 'NS1'), row('b', 'NS1'), row('c', 'Other'), row('d', 'Other')];
    const out = keepAssignedVariants(rows, 'u1', (r) => paper.has(r.id));
    const kept = out.filter((r) => paper.has(r.id));
    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe(pickAssignedVariant(orderVariants([rows[0], rows[1]]), 'u1').id);
    expect(out.map((r) => r.id)).toEqual(expect.arrayContaining(['c', 'd']));
  });
  it('хоёулаа дүнтэй бол хоёулаа харагдана', () => {
    const rows = [row('a', 'NS1', { hasResult: true }), row('b', 'NS1', { sessionStatus: 'SUBMITTED', hasResult: true })];
    expect(keepAssignedVariants(rows, 'u1', () => true)).toHaveLength(2);
  });
});

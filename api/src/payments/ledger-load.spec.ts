import type { PrismaService } from '../prisma/prisma.service';
import { classDays, primaryEnrollment } from './ledger-load';

const now = new Date('2026-11-01T12:00:00Z');
const d = (s: string) => new Date(`${s}T00:00:00Z`);
// ӨС-ийн шүүлтийг (effectiveTo null эсвэл > now) дуурайсан хуурамч prisma
const fake = (rows: { classroomId: string; weekday: number; effectiveFrom: Date; effectiveTo: Date | null }[]) =>
  ({
    classSchedule: {
      findMany: async () => rows.filter((r) => !r.effectiveTo || r.effectiveTo > now),
    },
  }) as unknown as PrismaService;

describe('ангийн 7 хоногийн өдөр', () => {
  it('гараг солих завсарт өдөр дутахгүй (Бямба маргааш Ням болно)', async () => {
    const days = await classDays(
      fake([
        ...[1, 3, 5].map((weekday) => ({ classroomId: 'c12', weekday, effectiveFrom: d('2026-07-30'), effectiveTo: null })),
        { classroomId: 'c12', weekday: 6, effectiveFrom: d('2026-07-30'), effectiveTo: d('2026-11-01') },
        { classroomId: 'c12', weekday: 0, effectiveFrom: d('2026-11-02'), effectiveTo: null },
      ]),
      ['c12'],
      now,
    );
    expect(days.get('c12')).toBe(4);
  });

  it('нэг гарагт хоёр цаг — нэг өдөр; бүгд түр мөртэй анги одоо хүчинтэйгээр', async () => {
    const days = await classDays(
      fake([
        { classroomId: 'a', weekday: 2, effectiveFrom: d('2026-07-30'), effectiveTo: null },
        { classroomId: 'a', weekday: 2, effectiveFrom: d('2026-07-30'), effectiveTo: null },
        { classroomId: 'a', weekday: 4, effectiveFrom: d('2026-07-30'), effectiveTo: null },
        { classroomId: 'tmp', weekday: 1, effectiveFrom: d('2026-10-01'), effectiveTo: d('2026-12-01') },
        { classroomId: 'tmp', weekday: 3, effectiveFrom: d('2026-12-01'), effectiveTo: d('2027-01-01') },
      ]),
      ['a', 'tmp', 'none'],
      now,
    );
    expect(days.get('a')).toBe(2);
    expect(days.get('tmp')).toBe(1);
    expect(days.has('none')).toBe(false);
  });

  it('үнийн анги: Нийгмээс өмнө математикийн танхимын анги', () => {
    const cls = (name: string, type = 'IN_PERSON', archived = false) => ({ classroom: { name, type, archived } });
    expect(primaryEnrollment([cls('НИЙГЭМ (Зүүн 4)'), cls('12-4 (Баруун 4)')])?.classroom.name).toBe('12-4 (Баруун 4)');
    expect(primaryEnrollment([cls('НИЙГЭМ (Зүүн 4)')])?.classroom.name).toBe('НИЙГЭМ (Зүүн 4)');
    expect(primaryEnrollment([cls('Онлайн', 'ONLINE'), cls('11-1')])?.classroom.name).toBe('11-1');
    expect(primaryEnrollment([])).toBeNull();
  });
});

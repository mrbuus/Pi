import { ClassroomsService } from './classrooms.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '../generated/prisma/enums';
import { classTrack, mainFirst } from '../common/class-track';

/** Хоёр ангид зэрэг суух (эзэн 2026-11-12): математик + Нийгэм */
describe('ClassroomsService.enroll — чиглэл тус бүрт нэг анги', () => {
  const CLASSES: Record<string, { id: string; name: string; subject: string | null; archived: boolean }> = {
    m1: { id: 'm1', name: '12-4 (Баруун 4)', subject: null, archived: false },
    m2: { id: 'm2', name: '12-5 (Баруун 4)', subject: null, archived: false },
    soc: { id: 'soc', name: 'НИЙГЭМ (Зүүн 4)', subject: null, archived: false },
  };

  function setup(openIds: string[]) {
    const open = openIds.map((cid) => ({
      id: `e-${cid}`,
      classroomId: cid,
      classroom: { name: CLASSES[cid].name, subject: CLASSES[cid].subject },
    }));
    const tx = {
      enrollment: {
        findMany: jest.fn().mockResolvedValue(open),
        findUniqueOrThrow: jest.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(async ({ data }: { data: object }) => ({ id: 'new', ...data })),
      },
    };
    const db = {
      classroom: { findUnique: jest.fn(async ({ where }: { where: { id: string } }) => CLASSES[where.id]) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 's', role: Role.STUDENT, archivedAt: null }) },
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    const service = new ClassroomsService(db as unknown as PrismaService, {} as AuditService);
    return { tx, service };
  }

  it('математикийн ангийн сурагчийг Нийгэмд нэмэхэд математикийн анги ХААГДАХГҮЙ', async () => {
    const { tx, service } = setup(['m1']);
    await service.enroll('soc', 's', 'admin', Role.ADMIN);
    expect(tx.enrollment.updateMany).not.toHaveBeenCalled();
    expect(tx.enrollment.create.mock.calls[0][0].data).toMatchObject({ studentId: 's', classroomId: 'soc' });
  });

  it('математикийн анги солиход зөвхөн математикийн өмнөх анги хаагдана, Нийгэм үлдэнэ', async () => {
    const { tx, service } = setup(['m1', 'soc']);
    await service.enroll('m2', 's', 'admin', Role.ADMIN);
    expect(tx.enrollment.updateMany.mock.calls[0][0].where).toEqual({ id: { in: ['e-m1'] } });
    expect(tx.enrollment.create.mock.calls[0][0].data).toMatchObject({ classroomId: 'm2' });
  });

  it('аль хэдийн байгаа ангид дахин нэмэхэд шинэ бичилт үүсгэхгүй (орсон өдөр хэвээр)', async () => {
    const { tx, service } = setup(['m1', 'soc']);
    await service.enroll('soc', 's', 'admin', Role.ADMIN);
    expect(tx.enrollment.updateMany).not.toHaveBeenCalled();
    expect(tx.enrollment.create).not.toHaveBeenCalled();
  });

  it('чиглэл: subject түрүүлнэ, хоосон бол нэрээр; үндсэн анги эхэнд', () => {
    expect(classTrack({ name: 'НИЙГЭМ (Зүүн 4)', subject: null })).toBe('SOCIAL_STUDIES');
    expect(classTrack({ name: '12-4', subject: null })).toBe('MATH');
    expect(classTrack({ name: 'Нийгэм-2', subject: 'MATH' })).toBe('MATH');
    expect(classTrack({ name: 'X', subject: 'SOCIAL_STUDIES' })).toBe('SOCIAL_STUDIES');
    const rows = [{ classroom: CLASSES.soc }, { classroom: CLASSES.m1 }];
    expect(mainFirst(rows).map((r) => r.classroom.id)).toEqual(['m1', 'soc']);
  });
});

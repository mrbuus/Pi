import { dismissalDate, dismissalClock, dismissalValues } from './dismissal';
import { DismissalService } from './dismissal.service';
import { DismissalController } from './dismissal.controller';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
describe('teacher-issued class dismissal', () => {
  it('validates leap days and exact date strings', () => {
    expect(dismissalDate('2024-02-29').toISOString()).toBe(
      '2024-02-29T00:00:00.000Z',
    );
    for (const value of [
      '2026-02-29',
      '2026-04-31',
      '2026-10-07T00:00Z',
      '2026-10-07junk',
      '1999-01-01',
    ])
      expect(() => dismissalDate(value)).toThrow();
  });
  it('interprets HH:mm in Ulaanbaatar regardless of OS timezone', () => {
    expect(dismissalClock('2026-10-07', '18:30').toISOString()).toBe(
      '2026-10-07T10:30:00.000Z',
    );
    expect(dismissalClock('2026-10-07', '00:05').toISOString()).toBe(
      '2026-10-06T16:05:00.000Z',
    );
    for (const time of [
      '24:00',
      '23:60',
      '9:00',
      '18:30Z',
      '18:30+08:00',
      'NaN',
      null,
    ])
      expect(() => dismissalClock('2026-10-07', time)).toThrow();
  });
  it('optional last departure is class-level and note is bounded pupil-visible only', () => {
    expect(
      dismissalValues('2026-10-07', {
        approximateTime: '18:30',
        note: ' parents may read ',
      }),
    ).toEqual({
      approximateAt: new Date('2026-10-07T10:30Z'),
      lastLeftAt: null,
      note: 'parents may read',
    });
    expect(() =>
      dismissalValues('2026-10-07', {
        approximateTime: '18:30',
        lastLeftTime: '18:29',
      }),
    ).toThrow();
    expect(() =>
      dismissalValues('2026-10-07', {
        approximateTime: '18:30',
        note: 'x'.repeat(1001),
      }),
    ).toThrow();
    expect(() =>
      dismissalValues('2026-10-07', {
        approximateTime: '18:30',
        staffNote: 'private',
      } as any),
    ).toThrow();
  });
  it('teacher and teacher-plus require ownership; archived/random classes denied', async () => {
    const prisma: any = {
      classroom: {
        findUnique: jest.fn(async () => ({
          id: 'own',
          teacherId: 'teacher',
          archived: false,
        })),
      },
      classDismissal: {
        upsert: jest.fn(async ({ create }) => create),
        findUnique: jest.fn(async () => null),
      },
    };
    const service = new DismissalService(prisma as PrismaService);
    for (const role of [Role.TEACHER, Role.TEACHER_PLUS])
      await expect(
        service.save('other', role, 'own', '2026-10-07', {
          approximateTime: '18:30',
        }),
      ).rejects.toThrow();
    for (const role of [Role.PARENT, Role.STUDENT])
      await expect(
        service.get('teacher', role, 'own', '2026-10-07'),
      ).rejects.toThrow();
    expect(prisma.classDismissal.upsert).not.toHaveBeenCalled();
    await service.save('teacher', Role.TEACHER_PLUS, 'own', '2026-10-07', {
      approximateTime: '18:30',
    });
    expect(
      prisma.classDismissal.upsert.mock.calls[0][0].create.issuedById,
    ).toBe('teacher');
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'own',
      teacherId: 'teacher',
      archived: true,
    });
    await expect(
      service.get('teacher', Role.TEACHER, 'own', '2026-10-07'),
    ).rejects.toThrow();
  });
  it('teacher controller has no parent/student role bypass', () => {
    expect(Reflect.getMetadata(ROLES_KEY, DismissalController)).toEqual([
      Role.ADMIN,
      Role.TEACHER_PLUS,
      Role.TEACHER,
    ]);
  });
});

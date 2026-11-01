import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from '../generated/prisma/enums';
import { SaveSessionDto } from './dto/submit-test.dto';
import { countIntegrityEvents, countsAsLeave, SESSION_EVENTS } from './integrity-events';
import { TestsService } from './tests.service';

describe('Шалгалтын бүрэн бүтэн байдлын үйл явдал (гар утасны апп)', () => {
  it('SaveSessionDto шинэ үйл явдлуудыг хүлээн авна, мэдэгдэхгүйг татгалзана', async () => {
    for (const event of SESSION_EVENTS) {
      const errors = await validate(plainToInstance(SaveSessionDto, { event }));
      expect(errors).toEqual([]);
    }
    const bad = await validate(plainToInstance(SaveSessionDto, { event: 'HACK' }));
    expect(bad).toHaveLength(1);
  });

  it('зөвхөн LEAVE / FULLSCREEN_EXIT л «гарсан» гэж тооцогдоно', () => {
    expect(countsAsLeave('LEAVE')).toBe(true);
    expect(countsAsLeave('FULLSCREEN_EXIT')).toBe(true);
    for (const e of ['RETURN', 'SCREENSHOT', 'RECORDING_START', 'RECORDING_STOP', undefined])
      expect(countsAsLeave(e)).toBe(false);
  });

  it('events-ээс дэлгэцийн зураг, бичлэгийн тоог гаргана (эвдэрсэн мөрийг алгасна)', () => {
    expect(
      countIntegrityEvents([
        { t: 'x', type: 'SCREENSHOT' },
        { t: 'x', type: 'SCREENSHOT' },
        { t: 'x', type: 'RECORDING_START' },
        { t: 'x', type: 'RECORDING_STOP' },
        { t: 'x', type: 'LEAVE' },
        null,
        'garbage',
      ]),
    ).toEqual({ screenshotCount: 2, recordingCount: 1 });
    expect(countIntegrityEvents(null)).toEqual({ screenshotCount: 0, recordingCount: 0 });
  });

  describe('mergeDrafts — leaveCount', () => {
    const service = new TestsService({} as never, {} as never);
    const merge = (
      service as unknown as {
        mergeDrafts: (
          p: unknown[],
          s: unknown,
          d: unknown,
        ) => { leaveCount: number; events: { type: string }[] };
      }
    ).mergeDrafts.bind(service);
    const session = {
      draftAnswers: {},
      draftStates: {},
      problemTimes: {},
      leaveCount: 2,
      events: [],
    };

    it.each(['SCREENSHOT', 'RECORDING_START', 'RECORDING_STOP'])(
      '%s нь leaveCount-ийг нэмэхгүй, events-д бичигдэнэ',
      (event) => {
        const m = merge([], session, { event });
        expect(m.leaveCount).toBe(2);
        expect(m.events.map((e) => e.type)).toEqual([event]);
      },
    );

    it('LEAVE нь leaveCount-ийг нэмнэ (хуучин зан төлөв хэвээр)', () => {
      expect(merge([], session, { event: 'LEAVE' }).leaveCount).toBe(3);
    });
  });

  it('багшийн дүнгийн харагдац screenshotCount / recordingCount-ийг буцаана', async () => {
    const db = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ role: Role.ADMIN, archivedAt: null, externalTeacherProfile: null }),
      },
      test: { findFirst: jest.fn().mockResolvedValue({ createdById: 'admin' }) },
      testAccess: { findFirst: jest.fn() },
      testResult: {
        findMany: jest.fn().mockResolvedValue([{ studentId: 's1' }, { studentId: 's2' }]),
      },
      testAttemptSession: {
        findMany: jest.fn().mockResolvedValue([
          {
            studentId: 's1',
            leaveCount: 1,
            events: [
              { t: 'x', type: 'LEAVE' },
              { t: 'x', type: 'SCREENSHOT' },
              { t: 'x', type: 'RECORDING_START' },
            ],
          },
        ]),
      },
    };
    const rows = await new TestsService(db as never, {} as never).results(
      'test',
      'admin',
      Role.ADMIN,
    );
    expect(db.testAttemptSession.findMany.mock.calls[0][0].select).toEqual({
      studentId: true,
      leaveCount: true,
      events: true,
    });
    expect(rows).toEqual([
      { studentId: 's1', leaveCount: 1, screenshotCount: 1, recordingCount: 1 },
      { studentId: 's2', leaveCount: null, screenshotCount: null, recordingCount: null },
    ]);
  });
});

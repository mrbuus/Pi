import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import {
  cleanFlagNote,
  isBehaviorFlagKind,
  isConcernFlag,
} from './behavior-flags';
import { ClassDashboardController } from './class-dashboard.controller';
import {
  attendancePercent,
  homeworkPercent,
  laggingTopics,
  makeupOwed,
  monthKeyUB,
  paymentStateOf,
  riskFlags,
  schoolYearStartMonth,
  scoreBins,
  weekStart,
  weeklyRates,
} from './class-dashboard.logic';
import { ClassDashboardService } from './class-dashboard.service';

describe('class-dashboard — цэвэр тооцоо', () => {
  it('ирц: чөлөөтэйг хасаж, хоцорсныг ирсэнд тооцно', () => {
    expect(attendancePercent(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'])).toEqual({
      rate: 67,
      marked: 3,
      absent: 1,
    });
    expect(attendancePercent([]).rate).toBeNull();
  });

  it('даалгавар: дутуу = хагас', () => {
    expect(homeworkPercent(['DONE', 'PARTIAL', 'NOT_DONE', null])).toEqual({
      rate: 50,
      marked: 3,
    });
  });

  it('7 хоног Даваа гарагаас эхэлнэ', () => {
    // 2026-10-13 = Мягмар → 10-12 Даваа
    expect(weekStart(new Date('2026-10-13T05:00:00Z')).toISOString().slice(0, 10)).toBe(
      '2026-10-12',
    );
    expect(weekStart(new Date('2026-10-18T05:00:00Z')).toISOString().slice(0, 10)).toBe(
      '2026-10-12',
    );
  });

  it('7 хоногийн хувь: тэмдэглэгээгүй 7 хоногт null', () => {
    const now = new Date('2026-10-13T05:00:00Z');
    const rows = [
      { at: new Date('2026-10-12'), credit: 1 },
      { at: new Date('2026-10-13'), credit: 0 },
      { at: new Date('2026-10-01'), credit: 1 },
      { at: new Date('2026-10-02'), credit: null },
    ];
    const w = weeklyRates(rows, now, 4);
    expect(w).toHaveLength(4);
    expect(w[3]).toEqual({ week: '2026-10-12', rate: 50, n: 2 });
    expect(w[1]).toEqual({ week: '2026-09-28', rate: 100, n: 1 });
    expect(w[2].rate).toBeNull();
    expect(w[0].rate).toBeNull();
  });

  it('эрсдэлийн дохио', () => {
    const base = {
      attendanceRate: 100,
      attendanceMarked: 5,
      homeworkRate: 100,
      homeworkMarked: 5,
      examAvg: 80,
      examTrend: [80, 82],
      missedExams: 0,
      competencyChange: 0,
    };
    expect(riskFlags(base)).toEqual([]);
    expect(riskFlags({ ...base, attendanceRate: 60 })).toEqual(['LOW_ATTENDANCE']);
    // Цөөн тэмдэглэгээтэй үед дүгнэхгүй
    expect(riskFlags({ ...base, attendanceRate: 0, attendanceMarked: 2 })).toEqual([]);
    expect(riskFlags({ ...base, homeworkRate: 40 })).toEqual(['LOW_HOMEWORK']);
    expect(riskFlags({ ...base, examAvg: 30 })).toEqual(['LOW_SCORE']);
    expect(riskFlags({ ...base, examTrend: [80, 60] })).toEqual(['FALLING']);
    expect(riskFlags({ ...base, competencyChange: -9 })).toEqual(['FALLING']);
    expect(riskFlags({ ...base, missedExams: 2 })).toEqual(['MISSED_EXAMS']);
    expect(riskFlags({ ...base, examAvg: null, attendanceRate: null })).toEqual([]);
  });

  it('онооны тархалт 5 багана', () => {
    expect(scoreBins([0, 19, 20, 55, 79, 80, 100])).toEqual([2, 1, 1, 1, 2]);
  });

  it('нөхөх хичээл: батлагдсан хичээлгүй бол null', () => {
    expect(makeupOwed([])).toBeNull();
    expect(
      makeupOwed([{ attendance: 'ABSENT' }, { attendance: 'PRESENT' }, { attendance: null }]),
    ).toBe(1);
  });

  it('төлбөрийн төлөв — Төлбөр хэсгийн сарын блокоос', () => {
    const base = { block: { state: 'OWED' as const }, owedNow: 300000, paidTotal: 0, pendingThisMonth: 0 };
    expect(paymentStateOf(base)).toBe('NONE');
    expect(paymentStateOf({ ...base, pendingThisMonth: 300000 })).toBe('PENDING');
    // өмнөх сараа төлсөн, энэ сар өртэй → дутуу
    expect(paymentStateOf({ ...base, paidTotal: 300000 })).toBe('PARTIAL');
    expect(paymentStateOf({ ...base, block: { state: 'PARTIAL' }, paidTotal: 200000 })).toBe('PARTIAL');
    // зун бүтэн жилээ төлсөн (forMonth 6–8-р сар) — блок PAID
    expect(paymentStateOf({ ...base, block: { state: 'PAID' }, owedNow: 0, paidTotal: 2000000 })).toBe('PAID');
    // энэ сарын төлөх өдөр болоогүй, өмнөх нь төлөгдсөн
    expect(paymentStateOf({ ...base, block: { state: 'FUTURE' }, owedNow: 0, paidTotal: 300000 })).toBe('PAID');
    expect(paymentStateOf({ ...base, block: { state: 'FUTURE' }, owedNow: 0, paidTotal: 0 })).toBe('NONE');
    // бүтэн жилээс 2 сая төлсөн (2.5 сая): энэ сарын блок дүүрсэн ч үлдэгдэл өр → дутуу
    expect(paymentStateOf({ ...base, block: { state: 'PAID' }, owedNow: 500000, paidTotal: 2000000 })).toBe('PARTIAL');
    // идэвхгүй сар (жилийн дундаас орсон, гарсан)
    expect(paymentStateOf({ ...base, block: { state: 'OFF' }, owedNow: 0 })).toBe('NONE');
    expect(paymentStateOf({ ...base, block: undefined, owedNow: 0 })).toBe('NONE');
  });

  it('хичээлийн жилийн эхлэл ба УБ-ын сар', () => {
    expect(schoolYearStartMonth('2026-10')).toBe('2026-09');
    expect(schoolYearStartMonth('2027-02')).toBe('2026-09');
    // УБ = UTC+8: 2026-10-31 20:00 UTC → 11-р сар
    expect(monthKeyUB(new Date('2026-10-31T20:00:00Z'))).toBe('2026-11');
  });

  it('сул сэдэв: 50%-иас доош, хамгийн сул нь эхэнд', () => {
    expect(
      laggingTopics([
        { name: 'Функц', percent: 40, max: 4 },
        { name: 'Геометр', percent: 10, max: 6 },
        { name: 'Алгебр', percent: 80, max: 6 },
        { name: 'Магадлал', percent: 0, max: 1 },
      ]),
    ).toEqual([
      { name: 'Геометр', percent: 10 },
      { name: 'Функц', percent: 40 },
    ]);
  });
});

describe('зан төлөвийн шошго', () => {
  it('төрөл ба өнгө аяс', () => {
    expect(isBehaviorFlagKind('GUESSES')).toBe(true);
    expect(isBehaviorFlagKind('toString')).toBe(false);
    expect(isConcernFlag('COPIES')).toBe(true);
    expect(isConcernFlag('IMPROVED')).toBe(false);
  });

  it('тэмдэглэл цэвэрлэх', () => {
    expect(cleanFlagNote('  ')).toBeNull();
    expect(cleanFlagNote(' a \n b ')).toBe('a b');
    expect(cleanFlagNote('x'.repeat(400))).toHaveLength(300);
    expect(cleanFlagNote(5)).toBeNull();
  });
});

describe('ClassDashboardController — эрх', () => {
  it('ажилтан л (ADMIN/TEACHER_PLUS/TEACHER), JWT + RolesGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ClassDashboardController);
    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
    expect(Reflect.getMetadata(ROLES_KEY, ClassDashboardController)).toEqual([
      Role.ADMIN,
      Role.TEACHER_PLUS,
      Role.TEACHER,
    ]);
  });
});

describe('ClassDashboardService — харагдах анги', () => {
  const prisma = {
    classroom: { findMany: jest.fn() },
    classSchedule: { findMany: jest.fn() },
    lessonStaffing: { findMany: jest.fn() },
  };
  const service = new ClassDashboardService(prisma as never, {} as never);

  it('Багш+/Админ бүх анги', async () => {
    await expect(
      service.visibleClassIds({ userId: 'u', role: Role.TEACHER_PLUS }),
    ).resolves.toBe('ALL');
    await expect(
      service.visibleClassIds({ userId: 'u', role: Role.ADMIN }),
    ).resolves.toBe('ALL');
  });

  it('Багш — эзэн 2026-10-22: бүх ангийг харна (засах эрх тусдаа)', async () => {
    const ids = await service.visibleClassIds({ userId: 't', role: Role.TEACHER });
    expect(ids).toBe('ALL');
  });
});

import { computeTeacherHours, monthRange, weekStartsOfMonth } from './teacher-hours';
import type { ResolverSchedule } from './week-resolver';

const base: ResolverSchedule = {
  id: 's1',
  classroomId: 'c1',
  classroomName: '12А',
  weekday: 1, // Даваа (JS)
  startMinute: 9 * 60,
  endMinute: 10 * 60 + 30,
  teacherId: 't1',
  teacherName: 'Номин Д',
  room: null,
  subject: null,
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
};

describe('teacher hours', () => {
  it('monthRange / weekStarts', () => {
    expect(monthRange('2026-02')).toEqual({ first: '2026-02-01', days: 28 });
    expect(weekStartsOfMonth('2026-09')).toEqual(['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29']);
    expect(() => monthRange('2026-13')).toThrow();
    expect(() => monthRange('26-9')).toThrow();
  });

  it('2026-09: 4 Даваа × 90 мин; сарын гаднах өдрийг тоолохгүй', () => {
    // 2026-09 сарын Даваа: 7, 14, 21, 28 (29-нөөс эхлэх цонх 10-р сарын 5-ыг оруулна — хасагдах ёстой)
    const rows = computeTeacherHours('2026-09', { schedules: [base], exceptions: [], topics: [], holidays: [] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ teacherId: 't1', lessons: 4, minutes: 360 });
  });

  it('цуцалсан хичээл ба амралтын өдрийг хасна, зөөсөн хичээлийн шинэ цагийг тооцно', () => {
    const rows = computeTeacherHours('2026-09', {
      schedules: [base],
      exceptions: [
        { scheduleId: 's1', date: '2026-09-07', kind: 'CANCELLED', newDate: null, newStartMinute: null, newEndMinute: null, newRoom: null, note: null },
        { scheduleId: 's1', date: '2026-09-14', kind: 'MOVED', newDate: '2026-09-15', newStartMinute: 600, newEndMinute: 660, newRoom: null, note: null },
      ],
      topics: [],
      holidays: [{ date: '2026-09-21', type: 'HOLIDAY', title: 'Амралт' }],
    });
    // 28-ны 90 мин + 15-ны 60 мин (зөөсөн) = 150 мин, 2 хичээл
    expect(rows[0]).toMatchObject({ lessons: 2, minutes: 150 });
    expect(rows[0].sessions.map((s) => s.date)).toEqual(['2026-09-15', '2026-09-28']);
  });

  it('багшгүй хуваарийг алгасна', () => {
    const rows = computeTeacherHours('2026-09', {
      schedules: [{ ...base, teacherId: null, teacherName: null }],
      exceptions: [],
      topics: [],
      holidays: [],
    });
    expect(rows).toEqual([]);
  });
});

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TeacherHoursQueryDto } from './dto/teacher-hours-query.dto';

describe('TeacherHoursQueryDto', () => {
  it('зөвхөн YYYY-MM', async () => {
    expect(await validate(plainToInstance(TeacherHoursQueryDto, { month: '2026-09' }))).toHaveLength(0);
    for (const month of ['2026-9', '2026-13', 'abc', undefined]) {
      expect(await validate(plainToInstance(TeacherHoursQueryDto, { month }))).not.toHaveLength(0);
    }
  });
});

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TeacherHoursController } from './teacher-hours.controller';

describe('TeacherHoursController эрх', () => {
  const roles = (t: object) => Reflect.getMetadata(ROLES_KEY, t);
  it('RolesGuard; бүх багшийн цаг зөвхөн ADMIN/TEACHER_PLUS, өөрийнх багш', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, TeacherHoursController)).toContain(RolesGuard);
    expect(roles(TeacherHoursController.prototype.all)).toEqual(['ADMIN', 'TEACHER_PLUS']);
    expect(roles(TeacherHoursController.prototype.mine)).toEqual(['TEACHER', 'TEACHER_PLUS']);
  });
});

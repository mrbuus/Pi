import { AttendanceService } from './attendance.service';
import { lessonAssignmentIds, submittedStudentIds, ubDateKey } from './board-logic';
import { Role } from '../generated/prisma/enums';

const at = (iso: string) => new Date(iso);

describe('«Илгээсэн» — хичээлийн даалгавар сонгох дүрэм', () => {
  it('УБ цагаар огноо: 16:30Z = маргааш 00:30', () => {
    expect(ubDateKey(at('2026-10-17T16:30:00Z'))).toBe('2026-10-18');
    expect(ubDateKey(at('2026-10-17T15:59:00Z'))).toBe('2026-10-17');
  });

  it('хугацаа нь D бол зөвхөн тэд; үгүй бол өмнөх хичээлийн өдрөөс (орно) D хүртэл үүсгэсэн', () => {
    const list = [
      { id: 'due', dueDate: at('2026-10-18T05:00:00Z'), createdAt: at('2026-10-10T03:00:00Z') },
      { id: 'new', dueDate: null, createdAt: at('2026-10-17T12:00:00Z') },
    ];
    expect(lessonAssignmentIds(list, '2026-10-18', '2026-10-17')).toEqual(['due']);
    const noDue = [
      { id: 'old', dueDate: null, createdAt: at('2026-10-16T02:00:00Z') }, // 10-16 = өмнөх хичээл бол орно, 10-17 бол орохгүй
      { id: 'onPrev', dueDate: null, createdAt: at('2026-10-17T02:00:00Z') }, // өмнөх хичээлийн өдөр
      { id: 'after', dueDate: null, createdAt: at('2026-10-17T17:00:00Z') }, // УБ 10-18 01:00
      { id: 'future', dueDate: at('2026-10-24T02:00:00Z'), createdAt: at('2026-10-18T01:00:00Z') },
      { id: 'tomorrow', dueDate: null, createdAt: at('2026-10-18T17:00:00Z') },
    ];
    // [өмнөх хичээлийн өдөр, D): өмнөх хичээлийн өдөр өгсөн нь ОРНО; D өдөр үүсгэсэн нь
    // (хугацаагүй) дараагийн хичээлийнх — 'after', 'future' орохгүй
    expect(lessonAssignmentIds(noDue, '2026-10-18', '2026-10-16')).toEqual(['old', 'onPrev']);
    expect(lessonAssignmentIds(noDue, '2026-10-18', '2026-10-17')).toEqual(['onPrev']);
  });

  it('илгээсэн = submittedAt эсвэл зурагтай, одоогийн сурагч, давхардалгүй', () => {
    const subs = [
      { studentId: 'a', submittedAt: at('2026-10-17T12:00:00Z'), imageKeys: [] },
      { studentId: 'a', submittedAt: null, imageKeys: ['x.jpg'] },
      { studentId: 'b', submittedAt: null, imageKeys: [] },
      { studentId: 'c', submittedAt: null, imageKeys: ['y.jpg'] },
      { studentId: 'left', submittedAt: at('2026-10-17T12:00:00Z'), imageKeys: [] },
    ];
    expect(submittedStudentIds(subs, ['a', 'b', 'c'])).toEqual(['a', 'c']);
  });

  it('самбарын өгөгдөлд: даалгаваргүй бол 0, байвал илгээсэн сурагчдын тоо', async () => {
    const db: any = {
      classroom: { findUnique: jest.fn().mockResolvedValue({ id: 'class', teacherId: 't', archived: false, riskCriteria: null }) },
      enrollment: { findMany: jest.fn().mockResolvedValue([{ studentId: 'a' }, { studentId: 'b' }]) },
      attendance: { findMany: jest.fn().mockResolvedValue([]) },
      dailyHomeworkMark: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      assignment: { findMany: jest.fn().mockResolvedValue([]) },
      submission: { findMany: jest.fn().mockResolvedValue([]) },
      homeworkAttempt: { findMany: jest.fn().mockResolvedValue([]) },
      homeworkPhoto: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new AttendanceService(db, {} as never, { record: jest.fn() } as never);
    expect((await svc.marks('class', '2026-10-18', 't', Role.TEACHER)).sent).toEqual({ assignmentIds: [], students: [] });
    expect(db.submission.findMany).not.toHaveBeenCalled();

    db.assignment.findMany.mockResolvedValue([{ id: 'hw', dueDate: at('2026-10-18T02:00:00Z'), createdAt: at('2026-10-17T03:00:00Z') }]);
    db.submission.findMany.mockResolvedValue([{ studentId: 'b', submittedAt: at('2026-10-17T13:00:00Z'), imageKeys: ['p.jpg'] }]);
    const res = await svc.marks('class', '2026-10-18', 't', Role.TEACHER);
    expect(res.sent).toEqual({ assignmentIds: ['hw'], students: ['b'] });
    const where = db.submission.findMany.mock.calls[0][0].where;
    expect(where.assignmentId).toEqual({ in: ['hw'] });
    expect(where.studentId).toEqual({ in: ['a', 'b'] });
    expect(db.assignment.findMany.mock.calls[0][0].where).toMatchObject({ classroomId: 'class', deletedAt: null });
  });
  it('онлайн бодсон гэрийн даалгавар (SUBMITTED) эсвэл зураг = илгээсэн, зөвхөн өмнөх хичээлийнх', async () => {
    const d = (k: string) => new Date(`${k}T00:00:00.000Z`);
    const db: any = {
      classroom: { findUnique: jest.fn().mockResolvedValue({ id: 'class', teacherId: 't', archived: false, riskCriteria: null }) },
      enrollment: { findMany: jest.fn().mockResolvedValue([{ studentId: 'a' }, { studentId: 'b' }, { studentId: 'c' }]) },
      attendance: { findMany: jest.fn().mockResolvedValue([]) },
      dailyHomeworkMark: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      assignment: { findMany: jest.fn().mockResolvedValue([]) },
      submission: { findMany: jest.fn().mockResolvedValue([]) },
      homeworkAttempt: { findMany: jest.fn().mockResolvedValue([
        { studentId: 'a', lessonDate: d('2026-10-15') },
        { studentId: 'c', lessonDate: d('2026-10-13') }, // өмнөх хичээл биш
      ]) },
      homeworkPhoto: { findMany: jest.fn().mockResolvedValue([{ studentId: 'b', lessonDate: d('2026-10-15') }]) },
      classSchedule: { findMany: jest.fn().mockResolvedValue([]) },
      classTestSession: { findMany: jest.fn().mockResolvedValue([{ date: d('2026-10-13'), testId: 'x' }, { date: d('2026-10-15'), testId: 'y' }]) },
      scheduleException: { findMany: jest.fn().mockResolvedValue([]) },
      academicCalendarDay: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new AttendanceService(db, {} as never, { record: jest.fn() } as never);
    const res = await svc.marks('class', '2026-10-18', 't', Role.TEACHER);
    expect(res.sent.students.sort()).toEqual(['a', 'b']);
    const where = db.homeworkAttempt.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ classroomId: 'class', status: 'SUBMITTED' });
    expect(db.homeworkPhoto.findMany.mock.calls[0][0].where).toMatchObject({ classroomId: 'class', deletedAt: null });
  });
});

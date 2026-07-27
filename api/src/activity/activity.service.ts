import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addDateDays, dateKey, todayUB } from '../common/date';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeActivityLevel,
  computeClassActivityLevel,
  NON_CLASS_DAY_TYPES,
} from './activity.constants';

export interface ActivityDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  isHoliday: boolean;
  isClassDay: boolean;
}

export interface ClassActivityDay {
  date: string;
  activeStudents: number;
  totalStudents: number;
  percent: number;
  level: 0 | 1 | 2 | 3 | 4;
  isHoliday: boolean;
  isClassDay: boolean;
}

function yearRange(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year, 11, 31)),
  };
}

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  // TEACHER зөвхөн өөрийн ангид, TEACHER_PLUS/ADMIN бүх ангид (attendance/
  // assignments сервистэй ижил загвар — SPEC §13)
  private async assertClassAccess(
    classroomId: string,
    userId: string,
    role: Role,
  ) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom || classroom.archived) {
      throw new NotFoundException('Анги олдсонгүй');
    }
    if (role === Role.ADMIN || role === Role.TEACHER_PLUS) return classroom;
    if (role === Role.TEACHER && classroom.teacherId === userId) {
      return classroom;
    }
    throw new ForbiddenException('Энэ ангид хандах эрхгүй');
  }

  // TEACHER зөвхөн өөрийн ангийн сурагчийн идэвхийг харна; TEACHER_PLUS/ADMIN
  // бүх сурагчийг харна.
  private async assertStudentAccess(
    studentId: string,
    userId: string,
    role: Role,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Сурагч олдсонгүй');
    }
    if (role === Role.ADMIN || role === Role.TEACHER_PLUS) return student;
    if (role === Role.TEACHER) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId,
          leftAt: null,
          classroom: { teacherId: userId },
        },
      });
      if (enrollment) return student;
    }
    throw new ForbiddenException('Энэ сурагчийн мэдээлэлд хандах эрхгүй');
  }

  private yearDateKeys(year: number): string[] {
    const { start, end } = yearRange(year);
    const keys: string[] = [];
    for (let d = start; d <= end; d = addDateDays(d, 1)) {
      keys.push(dateKey(d));
    }
    return keys;
  }

  // 🚨 ГҮЙЦЭТГЭЛ: жилийн Attempt мөрүүдийг санах ойд бүхэлд нь ачаалахгүй —
  // occurredOn-оор SQL түвшинд (Prisma groupBy) л бүлэглэж тоолно. 359 сурагчтай,
  // жил ирэх тусам Attempt хүснэгт томроход энэ query O(өдрийн тоо) хэвээр үлдэнэ.
  async yearActivity(studentId: string, year: number) {
    const { start, end } = yearRange(year);
    const [grouped, calendarDays] = await Promise.all([
      this.prisma.attempt.groupBy({
        by: ['occurredOn'],
        where: { studentId, occurredOn: { gte: start, lte: end } },
        _count: { _all: true },
      }),
      this.prisma.academicCalendarDay.findMany({
        where: { date: { gte: start, lte: end }, type: { in: NON_CLASS_DAY_TYPES } },
        select: { date: true },
      }),
    ]);

    const countByDate = new Map(
      grouped.map((g) => [dateKey(g.occurredOn), g._count._all]),
    );
    const nonClassDates = new Set(calendarDays.map((c) => dateKey(c.date)));

    const days: ActivityDay[] = this.yearDateKeys(year).map((date) => {
      const count = countByDate.get(date) ?? 0;
      const isHoliday = nonClassDates.has(date);
      return {
        date,
        count,
        level: computeActivityLevel(count),
        isHoliday,
        isClassDay: !isHoliday,
      };
    });

    const totalActiveDays = days.filter((d) => d.count > 0).length;
    return { year, totalActiveDays, days };
  }

  async myYearActivity(studentId: string, year: number) {
    return this.yearActivity(studentId, year);
  }

  async studentYearActivity(
    studentId: string,
    year: number,
    userId: string,
    role: Role,
  ) {
    await this.assertStudentAccess(studentId, userId, role);
    return this.yearActivity(studentId, year);
  }

  // 🧠 СТРИЙКИЙН ДҮРЭМ (санаатайгаар ингэж бичсэн — хялбарчилж болохгүй):
  // Судалгаагаар стрийк механизм суралцагчийн идэвхийг мэдэгдэхүйц нэмэгдүүлдэг
  // ч, стрийк ТАСРАХ нь суралцагчийг бүрмөсөн орхиход хүргэх магадлалыг эрс
  // өсгөдгийг харуулдаг. Тиймээс StreakFreeze болон хуанлийн амралт/завсарлагын
  // өдрийг (AcademicCalendarDay: HOLIDAY/BREAK/NO_CLASS) СТРИЙК ТАСАЛДАГГҮЙ
  // өдөр гэж үзнэ — төвийн хуваарийн буруугаас болж сурагчийг шийтгэхгүй.
  // Энэ хамгаалалтыг хасвал стрийк "урамшуулагч" биш "шийтгэгч" механизм болж хувирна.
  async streak(studentId: string) {
    const [grouped, freezes, calendarDays] = await Promise.all([
      this.prisma.attempt.groupBy({
        by: ['occurredOn'],
        where: { studentId },
        _count: { _all: true },
      }),
      this.prisma.streakFreeze.findMany({
        where: { studentId },
        select: { date: true },
      }),
      this.prisma.academicCalendarDay.findMany({
        where: { type: { in: NON_CLASS_DAY_TYPES } },
        select: { date: true },
      }),
    ]);

    const totalActiveDays = grouped.length;
    if (totalActiveDays === 0) {
      return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 };
    }

    const activeDates = new Set(grouped.map((g) => dateKey(g.occurredOn)));
    const protectedDates = new Set<string>([
      ...freezes.map((f) => dateKey(f.date)),
      ...calendarDays.map((c) => dateKey(c.date)),
    ]);

    const sortedActive = Array.from(activeDates).sort();
    const firstActive = new Date(sortedActive[0]);
    // УБ-ын цагийн бүсээр "өнөөдөр" — сервер UTC дээр ажилладаг тул шууд
    // UTC "өнөөдөр" ашиглавал шөнийн 00:00-07:59 (УБ) хооронд буруу өдөр гарна.
    const today = todayUB();
    const yesterday = addDateDays(today, -1);

    let runThroughYesterday = 0;
    let longest = 0;
    for (let d = firstActive; d <= yesterday; d = addDateDays(d, 1)) {
      const key = dateKey(d);
      if (activeDates.has(key)) {
        runThroughYesterday += 1;
        longest = Math.max(longest, runThroughYesterday);
      } else if (!protectedDates.has(key)) {
        // Жинхэнэ тасарсан өдөр — хамгаалагдаагүй, идэвхгүй
        runThroughYesterday = 0;
      }
      // protected боловч идэвхгүй өдөр: стрийк ТАСРАХГҮЙ, гэхдээ өсөхгүй ч гэсэн
    }

    const todayKey = dateKey(today);
    const todayActive = activeDates.has(todayKey);
    // Өнөөдөр әли дуусаагүй тул идэвхгүй байсан ч стрийк шууд тасрахгүй —
    // хэрэглэгчид өнөөдрийг дуустал стрийкээ сунгах боломж үлдэнэ.
    const currentStreak = todayActive
      ? runThroughYesterday + 1
      : runThroughYesterday;
    longest = Math.max(longest, currentStreak);

    return { currentStreak, longestStreak: longest, totalActiveDays };
  }

  // Ангийн бүлэг идэвх — сурагч хоорондын жагсаалт/харьцуулалт БИШ, зөвхөн
  // "тухайн өдөр анги хэр идэвхтэй байсан бэ" гэдгийг л харуулна.
  async classroomYearActivity(
    classroomId: string,
    year: number,
    userId: string,
    role: Role,
  ) {
    await this.assertClassAccess(classroomId, userId, role);
    const { start, end } = yearRange(year);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classroomId, leftAt: null },
      select: { studentId: true },
    });
    const studentIds = enrollments.map((e) => e.studentId);
    const totalStudents = studentIds.length;

    const activeStudentsByDate = new Map<string, Set<string>>();
    if (totalStudents > 0) {
      const grouped = await this.prisma.attempt.groupBy({
        by: ['occurredOn', 'studentId'],
        where: {
          studentId: { in: studentIds },
          occurredOn: { gte: start, lte: end },
        },
        _count: { _all: true },
      });
      for (const row of grouped) {
        const key = dateKey(row.occurredOn);
        if (!activeStudentsByDate.has(key)) {
          activeStudentsByDate.set(key, new Set());
        }
        activeStudentsByDate.get(key)!.add(row.studentId);
      }
    }

    const calendarDays = await this.prisma.academicCalendarDay.findMany({
      where: { date: { gte: start, lte: end }, type: { in: NON_CLASS_DAY_TYPES } },
      select: { date: true },
    });
    const nonClassDates = new Set(calendarDays.map((c) => dateKey(c.date)));

    const days: ClassActivityDay[] = this.yearDateKeys(year).map((date) => {
      const activeStudents = activeStudentsByDate.get(date)?.size ?? 0;
      const percent =
        totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0;
      const isHoliday = nonClassDates.has(date);
      return {
        date,
        activeStudents,
        totalStudents,
        percent: Math.round(percent),
        level: computeClassActivityLevel(percent),
        isHoliday,
        isClassDay: !isHoliday,
      };
    });

    return { year, totalStudents, days };
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { addDateDays, parseDateOnly } from '../common/date';
import { Prisma } from '../generated/prisma/client';
import { Role, SubmissionState } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReviewAction, ReviewDto } from './dto/review.dto';
import { SubmitDto } from './dto/submit.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // parseDateOnly plain Error шидвэл HTTP 500 болчихно — энд эргүүлж 400
  // болгож, хэрэглэгчид ойлгомжтой монгол мессеж өгнө.
  private parseDate(value: string): Date {
    try {
      return parseDateOnly(value);
    } catch {
      throw new BadRequestException(
        'Огнооны формат буруу байна (YYYY-MM-DD)',
      );
    }
  }

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

  async create(
    classroomId: string,
    dto: CreateAssignmentDto,
    userId: string,
    role: Role,
  ) {
    await this.assertClassAccess(classroomId, userId, role);
    return this.prisma.assignment.create({
      data: {
        classroomId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        imageKeys: dto.imageKeys ?? [],
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdById: userId,
      },
    });
  }

  // Хуанлийн навигацид зориулж [from, to] (өдрөөр) мужаар шүүх боломжтой —
  // үүсгэсэн огноогоор (createdAt) шүүнэ, "to" өдрийг бүхэлд нь хамруулна.
  // Хамгийн шинэ нь эхэндээ (createdAt desc) — "өмнөх хичээлийн даалгаврын
  // нэр" автоматаар бөглөхөд title + createdAt хамгийн шинээрээ [0]-т ирнэ.
  async listForClass(
    classroomId: string,
    userId: string,
    role: Role,
    from?: string,
    to?: string,
  ) {
    await this.assertClassAccess(classroomId, userId, role);
    const fromDate = from ? this.parseDate(from) : undefined;
    const toDate = to ? addDateDays(this.parseDate(to), 1) : undefined;
    if (fromDate && toDate && fromDate >= toDate) {
      throw new BadRequestException(
        '"from" огноо "to" огнооноос өмнө байх ёстой',
      );
    }
    return this.prisma.assignment.findMany({
      where: {
        classroomId,
        deletedAt: null,
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lt: toDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            submissions: { where: { state: SubmissionState.SUBMITTED } },
          },
        },
      },
    });
  }

  // 🎯 Сурагч тус бүрийн ХИЙГЭЭГҮЙ (submission мөр байхгүй эсвэл NOT_DONE)
  // болон дутуу/шалгагдаагүй (SUBMITTED — илгээсэн ч хараагүй, RETURNED —
  // буцаасан, дахин илгээх ёстой) даалгаврын тоо [from, to] мужид.
  // Бүх аггрегат нэг raw SQL query дотор (FILTER-тэй COUNT), JS давталтгүй —
  // "submission мөргүй" тохиолдлыг LEFT JOIN-оор л зөв тооцно (Prisma
  // groupBy үүнийг дангаараа хийж чадахгүй тул raw ашиглав).
  async stats(
    classroomId: string,
    from: string,
    to: string,
    userId: string,
    role: Role,
  ) {
    await this.assertClassAccess(classroomId, userId, role);
    if (!from || !to) {
      throw new BadRequestException(
        '"from" болон "to" огноо заавал шаардлагатай',
      );
    }
    const fromDate = this.parseDate(from);
    const toDateExclusive = addDateDays(this.parseDate(to), 1);
    if (fromDate >= toDateExclusive) {
      throw new BadRequestException(
        '"from" огноо "to" огнооноос өмнө байх ёстой',
      );
    }

    const rows = await this.prisma.$queryRaw<
      { studentId: string; notDoneCount: bigint; partialCount: bigint }[]
    >(Prisma.sql`
      SELECT
        e."studentId" AS "studentId",
        COUNT(a.id) FILTER (
          WHERE s.id IS NULL OR s.state = 'NOT_DONE'
        )::bigint AS "notDoneCount",
        COUNT(a.id) FILTER (
          WHERE s.state IN ('SUBMITTED', 'RETURNED')
        )::bigint AS "partialCount"
      FROM "Enrollment" e
      JOIN "Assignment" a
        ON a."classroomId" = e."classroomId"
        AND a."deletedAt" IS NULL
        AND a."createdAt" >= ${fromDate}
        AND a."createdAt" < ${toDateExclusive}
        AND a."createdAt" >= e."joinedAt"
      LEFT JOIN "Submission" s
        ON s."assignmentId" = a.id AND s."studentId" = e."studentId"
      WHERE e."classroomId" = ${classroomId} AND e."leftAt" IS NULL
      GROUP BY e."studentId"
    `);
    const byStudent = new Map(
      rows.map((r) => [
        r.studentId,
        { notDone: Number(r.notDoneCount), partial: Number(r.partialCount) },
      ]),
    );

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classroomId, leftAt: null },
      select: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { student: { firstName: 'asc' } },
    });

    return enrollments.map((e) => {
      const counted = byStudent.get(e.student.id) ?? { notDone: 0, partial: 0 };
      return {
        student: e.student,
        notDone: counted.notDone,
        partial: counted.partial,
      };
    });
  }

  // Ангийг эзэмшигч Багш эсвэл Багш+/Админ засна
  async update(
    id: string,
    dto: UpdateAssignmentDto,
    userId: string,
    role: Role,
  ) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });
    if (!assignment || assignment.deletedAt) {
      throw new NotFoundException('Даалгавар олдсонгүй');
    }
    await this.assertClassAccess(assignment.classroomId, userId, role);

    const updated = await this.prisma.assignment.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.imageKeys !== undefined ? { imageKeys: dto.imageKeys } : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
      },
    });

    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: 'UPDATE',
      entity: 'Assignment',
      entityId: id,
      before: assignment,
      after: updated,
    });

    return updated;
  }

  // Зөөлөн устгал: Submission-ы түүх орфон үлдэхгүйн тулд hard DELETE хийхгүй
  async remove(id: string, userId: string, role: Role) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });
    if (!assignment || assignment.deletedAt) {
      throw new NotFoundException('Даалгавар олдсонгүй');
    }
    await this.assertClassAccess(assignment.classroomId, userId, role);

    const updated = await this.prisma.assignment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: 'DELETE',
      entity: 'Assignment',
      entityId: id,
      before: assignment,
      after: updated,
    });

    return { removed: true };
  }

  // Сурагч идэвхтэй ангийнхаа, элссэн өдрөөс хойшхи даалгавруудыг л харна (SPEC §6.3)
  async myAssignments(studentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, leftAt: null },
      include: { classroom: { select: { id: true, name: true } } },
    });
    if (!enrollment) return [];

    const assignments = await this.prisma.assignment.findMany({
      where: {
        classroomId: enrollment.classroomId,
        createdAt: { gte: enrollment.joinedAt },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        submissions: {
          where: { studentId },
          select: {
            state: true,
            note: true,
            imageKeys: true,
            submittedAt: true,
            checkedAt: true,
          },
        },
      },
    });
    return assignments.map(({ submissions, ...a }) => ({
      ...a,
      classroom: enrollment.classroom,
      myStatus: submissions[0]?.state ?? SubmissionState.NOT_DONE,
      mySubmission: submissions[0] ?? null,
    }));
  }

  // Онлайн зам: сурагч дэвтрийн зураг/хариугаа илгээнэ (SPEC §10)
  async submit(assignmentId: string, studentId: string, dto: SubmitDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || assignment.deletedAt) {
      throw new NotFoundException('Даалгавар олдсонгүй');
    }

    const enrolled = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        classroomId: assignment.classroomId,
        leftAt: null,
        joinedAt: { lte: assignment.createdAt },
      },
    });
    const enrolledNow = await this.prisma.enrollment.findFirst({
      where: { studentId, classroomId: assignment.classroomId, leftAt: null },
    });
    if (!enrolledNow) {
      throw new ForbiddenException('Та энэ ангийн сурагч биш байна');
    }
    if (!enrolled) {
      throw new ForbiddenException(
        'Энэ даалгавар таныг элсэхээс өмнө өгөгдсөн байна',
      );
    }

    return this.prisma.submission.upsert({
      where: {
        assignmentId_studentId: { assignmentId, studentId },
      },
      create: {
        assignmentId,
        studentId,
        state: SubmissionState.SUBMITTED,
        imageKeys: dto.imageKeys ?? [],
        note: dto.note,
        submittedAt: new Date(),
      },
      update: {
        state: SubmissionState.SUBMITTED,
        imageKeys: dto.imageKeys ?? [],
        note: dto.note,
        submittedAt: new Date(),
      },
    });
  }

  // Багшийн шалгалт: онлайн батлах / буцаах / танхимд биетээр шалгасан
  async review(
    assignmentId: string,
    dto: ReviewDto,
    userId: string,
    role: Role,
  ) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || assignment.deletedAt) {
      throw new NotFoundException('Даалгавар олдсонгүй');
    }
    await this.assertClassAccess(assignment.classroomId, userId, role);

    const existing = await this.prisma.submission.findUnique({
      where: {
        assignmentId_studentId: { assignmentId, studentId: dto.studentId },
      },
    });

    const stateByAction: Record<ReviewAction, SubmissionState> = {
      [ReviewAction.APPROVE]: SubmissionState.DONE_ONLINE,
      [ReviewAction.RETURN]: SubmissionState.RETURNED,
      [ReviewAction.MARK_IN_CLASS]: SubmissionState.DONE_IN_CLASS,
    };
    const newState = stateByAction[dto.action];

    // Онлайн батлах/буцаахад илгээсэн зүйл байх ёстой; ангид шалгасан бол шаардлагагүй
    if (
      dto.action !== ReviewAction.MARK_IN_CLASS &&
      (!existing || existing.state === SubmissionState.NOT_DONE)
    ) {
      throw new BadRequestException('Сурагч хараахан юу ч илгээгээгүй байна');
    }

    return this.prisma.submission.upsert({
      where: {
        assignmentId_studentId: { assignmentId, studentId: dto.studentId },
      },
      create: {
        assignmentId,
        studentId: dto.studentId,
        state: newState,
        note: dto.note,
        checkedById: userId,
        checkedAt: new Date(),
      },
      update: {
        state: newState,
        ...(dto.note ? { note: dto.note } : {}),
        checkedById: userId,
        checkedAt: new Date(),
      },
    });
  }

  // Багшид: ангийн бүх сурагчийн төлөв (илгээгээгүй нь NOT_DONE-оор харагдана)
  async submissionsRoster(assignmentId: string, userId: string, role: Role) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || assignment.deletedAt) {
      throw new NotFoundException('Даалгавар олдсонгүй');
    }
    await this.assertClassAccess(assignment.classroomId, userId, role);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classroomId: assignment.classroomId, leftAt: null },
      select: {
        joinedAt: true,
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { student: { firstName: 'asc' } },
    });
    const submissions = await this.prisma.submission.findMany({
      where: { assignmentId },
    });
    const byStudent = new Map(submissions.map((s) => [s.studentId, s]));

    return enrollments
      .filter((e) => e.joinedAt <= assignment.createdAt)
      .map((e) => {
        const s = byStudent.get(e.student.id);
        return {
          student: e.student,
          state: s?.state ?? SubmissionState.NOT_DONE,
          imageKeys: s?.imageKeys ?? [],
          note: s?.note ?? null,
          submittedAt: s?.submittedAt ?? null,
          checkedAt: s?.checkedAt ?? null,
        };
      });
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Logger,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { addDateDays, parseDateOnly } from '../common/date';
import { Prisma } from '../generated/prisma/client';
import { Role, SubmissionState } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationCenterService } from '../notification-center/notification-center.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReviewAction, ReviewDto } from './dto/review.dto';
import { SubmitDto } from './dto/submit.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import {
  resolveAssignmentLessonDate,
  withHomeworkLessons,
} from './homework-lesson';
import { ubKeyOf } from './homework-lesson.logic';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationCenterService,
  ) {}

  // parseDateOnly plain Error шидвэл HTTP 500 болчихно — энд эргүүлж 400
  // болгож, хэрэглэгчид ойлгомжтой монгол мессеж өгнө.
  /** YYYY-MM-DD шалгана (буруу бол 400) */
  private lessonKey(value: string): string {
    return this.parseDate(value).toISOString().slice(0, 10);
  }

  private parseDate(value: string): Date {
    try {
      return parseDateOnly(value);
    } catch {
      throw new BadRequestException('Огнооны формат буруу байна (YYYY-MM-DD)');
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

  private async assertTeacherAttachments(
    keys: string[],
    actorId: string,
    retained: string[] = [],
  ) {
    if (keys.length > 10)
      throw new BadRequestException('Хамгийн ихдээ 10 файл хавсаргана.');
    const added = keys.filter((key) => !retained.includes(key));
    if (!added.length) return;
    const files = await this.prisma.storedFile.findMany({
      where: { key: { in: added } },
      select: { key: true, ownerId: true, mime: true, size: true },
    });
    if (
      added.some(
        (key) =>
          !files.some((file) => file.key === key && file.ownerId === actorId),
      )
    )
      throw new ForbiddenException(
        'Зөвхөн өөрийн байршуулсан файлыг хавсаргана уу.',
      );
    if (
      files.some(
        (file) =>
          ![
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/heic',
            'image/heif',
            'application/pdf',
          ].includes(file.mime) || file.size > 25 * 1024 * 1024,
      )
    )
      throw new BadRequestException(
        '25 МБ хүртэлх зураг эсвэл PDF файл хавсаргана уу.',
      );
  }

  async create(
    classroomId: string,
    dto: CreateAssignmentDto,
    userId: string,
    role: Role,
  ) {
    await this.assertClassAccess(classroomId, userId, role);
    await this.assertTeacherAttachments(dto.imageKeys ?? [], userId);
    // Даалгавар өгсөн хичээл (эзэн 2026-10-27): сурагч сэдэв сонгохгүй
    const lessonDate = await resolveAssignmentLessonDate(
      this.prisma,
      classroomId,
      dto.lessonDate ? this.lessonKey(dto.lessonDate) : ubKeyOf(new Date()),
    );
    const created = await this.prisma.assignment.create({
      data: {
        classroomId,
        lessonDate: parseDateOnly(lessonDate),
        title: dto.title,
        description: dto.description,
        type: dto.type,
        imageKeys: dto.imageKeys ?? [],
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdById: userId,
      },
    });
    const [assignment] = await withHomeworkLessons(this.prisma, [created]);

    try {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          classroomId,
          leftAt: null,
          student: { archivedAt: null },
          joinedAt: { lte: assignment.createdAt },
        },
        select: { studentId: true },
      });
      await this.notifications.notify(
        enrollments.map((enrollment) => enrollment.studentId),
        {
          kind: 'HOMEWORK',
          title: 'Шинэ гэрийн даалгавар',
          body: assignment.lesson.label,
          link: '/app/student',
        },
      );
    } catch (error) {
      this.logger.warn(
        `Даалгаврын мэдэгдэл үүсгэж чадсангүй: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    return assignment;
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
    const list = await this.prisma.assignment.findMany({
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
    return withHomeworkLessons(this.prisma, list);
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
      JOIN "User" student ON student.id = e."studentId" AND student."archivedAt" IS NULL
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
      where: { classroomId, leftAt: null, student: { archivedAt: null } },
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
    if (dto.imageKeys !== undefined)
      await this.assertTeacherAttachments(
        dto.imageKeys,
        userId,
        assignment.imageKeys,
      );

    const lessonDate =
      dto.lessonDate !== undefined
        ? await resolveAssignmentLessonDate(
            this.prisma,
            assignment.classroomId,
            this.lessonKey(dto.lessonDate),
          )
        : undefined;
    const saved = await this.prisma.assignment.update({
      where: { id },
      data: {
        ...(lessonDate ? { lessonDate: parseDateOnly(lessonDate) } : {}),
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
      after: saved,
    });

    const [updated] = await withHomeworkLessons(this.prisma, [saved]);
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
  async myClassrooms(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId,
        leftAt: null,
        student: { archivedAt: null },
        classroom: { archived: false },
      },
      select: { classroom: { select: { id: true, name: true, type: true } } },
      orderBy: { joinedAt: 'desc' },
    });
    return enrollments.map((enrollment) => enrollment.classroom);
  }

  async myAssignments(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, student: { archivedAt: null } },
      include: { classroom: { select: { id: true, name: true, type: true } } },
      orderBy: { joinedAt: 'desc' },
    });
    if (enrollments.length === 0) return [];

    const assignments = await this.prisma.assignment.findMany({
      where: {
        OR: enrollments.map((enrollment) => ({
          classroomId: enrollment.classroomId,
          createdAt: {
            gte: enrollment.joinedAt,
            ...(enrollment.leftAt ? { lte: enrollment.leftAt } : {}),
          },
        })),
        AND: [
          {
            OR: [{ deletedAt: null }, { submissions: { some: { studentId } } }],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        submissions: {
          where: { studentId },
          select: {
            state: true,
            note: true,
            studentNote: true,
            reviewNote: true,
            revisions: { orderBy: { at: 'asc' } },
            imageKeys: true,
            submittedAt: true,
            checkedAt: true,
          },
        },
      },
    });
    const labelled = await withHomeworkLessons(this.prisma, assignments);
    return labelled.map(({ submissions, ...a }) => {
      const enrollment = enrollments.find(
        (e) =>
          e.classroomId === a.classroomId &&
          e.joinedAt <= a.createdAt &&
          (!e.leftAt || e.leftAt >= a.createdAt),
      );
      return {
        ...a,
        classroom: enrollment!.classroom,
        canSubmit: enrollment!.leftAt == null && a.deletedAt == null,
        myStatus: submissions[0]?.state ?? SubmissionState.NOT_DONE,
        mySubmission: submissions[0] ?? null,
      };
    });
  }

  /** Snapshot legacy content without claiming whether its shared note was pupil or teacher authored. */
  private async preserveLegacySubmission(
    tx: Prisma.TransactionClient,
    assignmentId: string,
    studentId: string,
  ) {
    const current = await tx.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      include: { revisions: { take: 1 } },
    });
    if (current && current.revisions.length === 0) {
      await tx.submissionRevision.create({
        data: {
          submissionId: current.id,
          action: 'LEGACY',
          actorId: 'legacy',
          state: current.state,
          imageKeys: current.imageKeys,
          studentNote: current.studentNote,
          reviewNote: current.reviewNote,
          legacyNote: current.studentNote == null ? current.note : null,
          at: current.updatedAt,
        },
      });
    }
    return current;
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
        student: { archivedAt: null },
        joinedAt: { lte: assignment.createdAt },
      },
    });
    const enrolledNow = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        classroomId: assignment.classroomId,
        leftAt: null,
        student: { archivedAt: null },
      },
    });
    if (!enrolledNow) {
      throw new ForbiddenException('Та энэ ангийн сурагч биш байна');
    }
    if (!enrolled) {
      throw new ForbiddenException(
        'Энэ даалгавар таныг элсэхээс өмнө өгөгдсөн байна',
      );
    }

    const submission = await this.prisma.$transaction(async (tx) => {
      // Serialize both first submissions and revisions for this assignment/student.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${assignmentId}), hashtext(${studentId}))::text`;
      const keys = dto.imageKeys ?? [];
      if (keys.length > 10)
        throw new BadRequestException('Хамгийн ихдээ 10 файл хавсаргана.');
      if (keys.length) {
        const previous = await tx.submission.findUnique({
          where: { assignmentId_studentId: { assignmentId, studentId } },
          select: { imageKeys: true },
        });
        const stored = await tx.storedFile.findMany({
          where: { key: { in: keys } },
          select: { key: true, ownerId: true, mime: true, size: true },
        });
        if (
          stored.some(
            (file) =>
              file.ownerId === studentId &&
              (![
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/heic',
                'image/heif',
                'application/pdf',
              ].includes(file.mime) ||
                file.size > 25 * 1024 * 1024),
          )
        ) {
          throw new BadRequestException(
            '25 МБ хүртэлх зураг эсвэл PDF файл хавсаргана уу.',
          );
        }
        const owners = new Map(stored.map((file) => [file.key, file.ownerId]));
        if (
          keys.some(
            (key) =>
              owners.get(key) !== studentId &&
              !(owners.get(key) == null && previous?.imageKeys.includes(key)),
          )
        ) {
          throw new ForbiddenException(
            'Зөвхөн өөрийн байршуулсан файлыг хавсаргана уу.',
          );
        }
      }
      await this.preserveLegacySubmission(tx, assignmentId, studentId);
      const saved = await tx.submission.upsert({
        where: { assignmentId_studentId: { assignmentId, studentId } },
        create: {
          assignmentId,
          studentId,
          state: SubmissionState.SUBMITTED,
          imageKeys: dto.imageKeys ?? [],
          note: dto.note ?? null,
          studentNote: dto.note ?? null,
          submittedAt: new Date(),
        },
        update: {
          state: SubmissionState.SUBMITTED,
          imageKeys: dto.imageKeys ?? [],
          note: dto.note ?? null,
          studentNote: dto.note ?? null,
          reviewNote: null,
          checkedAt: null,
          checkedById: null,
          submittedAt: new Date(),
        },
      });
      await tx.submissionRevision.create({
        data: {
          submissionId: saved.id,
          action: 'SUBMIT',
          actorId: studentId,
          state: saved.state,
          imageKeys: saved.imageKeys,
          studentNote: saved.studentNote,
          reviewNote: saved.reviewNote,
        },
      });
      return tx.submission.findUniqueOrThrow({
        where: { id: saved.id },
        include: { revisions: { orderBy: { at: 'asc' } } },
      });
    });

    return submission;
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

    // A current roster action must not create a mark for an archived/unrelated pupil.
    const enrolled = await this.prisma.enrollment.findFirst({
      where: {
        classroomId: assignment.classroomId,
        studentId: dto.studentId,
        leftAt: null,
        student: { archivedAt: null },
        joinedAt: { lte: assignment.createdAt },
      },
    });
    if (!enrolled)
      throw new NotFoundException(
        'Сурагч энэ даалгаврын идэвхтэй бүртгэлд алга байна',
      );

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

    const submission = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${assignmentId}), hashtext(${dto.studentId}))::text`;
      const current = await this.preserveLegacySubmission(
        tx,
        assignmentId,
        dto.studentId,
      );
      if (
        dto.action !== ReviewAction.MARK_IN_CLASS &&
        (!current || current.state === SubmissionState.NOT_DONE)
      ) {
        throw new BadRequestException('Сурагч хараахан юу ч илгээгээгүй байна');
      }
      const saved = await tx.submission.upsert({
        where: {
          assignmentId_studentId: { assignmentId, studentId: dto.studentId },
        },
        create: {
          assignmentId,
          studentId: dto.studentId,
          state: newState,
          imageKeys: [],
          reviewNote: dto.note ?? null,
          checkedById: userId,
          checkedAt: new Date(),
        },
        update: {
          state: newState,
          ...(dto.note !== undefined ? { reviewNote: dto.note } : {}),
          checkedById: userId,
          checkedAt: new Date(),
        },
      });
      await tx.submissionRevision.create({
        data: {
          submissionId: saved.id,
          action: dto.action,
          actorId: userId,
          state: saved.state,
          imageKeys: saved.imageKeys,
          studentNote: saved.studentNote,
          reviewNote: saved.reviewNote,
          legacyNote: saved.studentNote == null ? saved.note : null,
        },
      });
      return tx.submission.findUniqueOrThrow({
        where: { id: saved.id },
        include: { revisions: { orderBy: { at: 'asc' } } },
      });
    });

    if (
      dto.action === ReviewAction.APPROVE ||
      dto.action === ReviewAction.RETURN
    ) {
      await this.notifications.notify([dto.studentId], {
        kind: 'HOMEWORK',
        title:
          dto.action === ReviewAction.APPROVE
            ? 'Даалгавар шалгагдлаа'
            : 'Даалгавар засварлах шаардлагатай',
        body: dto.note ? `${assignment.title}: ${dto.note}` : assignment.title,
        link: '/app/student',
      });
    }

    return submission;
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
      where: {
        classroomId: assignment.classroomId,
        leftAt: null,
        student: { archivedAt: null },
      },
      select: {
        joinedAt: true,
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { student: { firstName: 'asc' } },
    });
    const submissions = await this.prisma.submission.findMany({
      where: { assignmentId },
      include: { revisions: { orderBy: { at: 'asc' } } },
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
          studentNote: s?.studentNote ?? null,
          reviewNote: s?.reviewNote ?? null,
          revisions: s?.revisions ?? [],
          submittedAt: s?.submittedAt ?? null,
          checkedAt: s?.checkedAt ?? null,
        };
      });
  }
}

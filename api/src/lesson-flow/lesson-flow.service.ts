import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { beginRevision, commitRevision } from '../revisions/revision-store';
import { dismissalDate } from '../learning-lab/dismissal';
import { packetInput, receiptInput, turnInput } from './input';
import { choosePhotoTurn, homeworkPrefill, RotationPupil } from './rotation';
import { isClassTeacher } from '../common/class-teachers';

/**
 * Өдрийн багцын ажилтны эрх (засвар 2026-10-18): ADMIN, TEACHER_PLUS — бүх анги;
 * TEACHER — ангийн үндсэн эсвэл туслах багш (common/class-teachers.ts).
 * Өмнө нь зөвхөн Classroom.teacherId байсан тул Багш+ ба туслах багш ордоггүй байв.
 */
export function canRunClass(
  classroom: { teacherId: string | null; assistantTeacherId?: string | null },
  userId: string,
  role: Role,
): boolean {
  if (role === Role.ADMIN || role === Role.TEACHER_PLUS) return true;
  return role === Role.TEACHER && isClassTeacher(classroom, userId);
}
@Injectable()
export class LessonFlowService {
  constructor(private readonly prisma: PrismaService) {}
  async preview(
    classroomId: string,
    dateText: string,
    chapterId: string,
    userId: string,
    role: Role,
  ) {
    const date = dismissalDate(dateText),
      start = new Date(`${dateText}T00:00:00+08:00`),
      end = new Date(start.getTime() + 86400000);
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        teacherId: true,
        assistantTeacherId: true,
        archived: true,
        name: true,
      },
    });
    if (!classroom || classroom.archived)
      throw new NotFoundException('Анги олдсонгүй');
    if (!canRunClass(classroom, userId, role))
      throw new ForbiddenException('Өөрийн ангийг сонгоно уу.');
    const chapter = await this.prisma.chapter.findFirst({
      where: { id: chapterId, deletedAt: null },
      select: {
        id: true,
        title: true,
        theories: {
          orderBy: { order: 'asc' },
          select: { id: true, title: true, imageKeys: true },
        },
        tests: {
          where: { isDraft: false, deletedAt: null },
          select: { id: true, title: true },
        },
      },
    });
    if (!chapter) throw new NotFoundException('Сэдэв олдсонгүй');
    const [enrollments, attendance, sessions, assignments] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          classroomId,
          joinedAt: { lt: end },
          OR: [{ leftAt: null }, { leftAt: { gte: end } }],
        },
        select: {
          studentId: true,
          student: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.attendance.findMany({
        where: { classroomId, date },
        select: { studentId: true, status: true },
      }),
      this.prisma.classTestSession.findMany({
        where: { classroomId, date },
        select: { id: true, testId: true, manualTitle: true },
      }),
      this.prisma.assignment.findMany({
        where: {
          classroomId,
          deletedAt: null,
          createdAt: { gte: start, lt: end },
        },
        select: {
          id: true,
          title: true,
          submissions: {
            select: { studentId: true, submittedAt: true, state: true },
          },
        },
      }),
    ]);
    const pupils = new Map(enrollments.map((e) => [e.studentId, e]));
    const attendanceMap = new Map(
      attendance.map((a) => [a.studentId, a.status]),
    );
    const rotation = choosePhotoTurn(
      [...pupils.keys()].map((id) => ({
        id,
        attendance: attendanceMap.get(id) ?? 'UNKNOWN',
      })),
    );
    const testIds = sessions.flatMap((s) => (s.testId ? [s.testId] : []));
    const results = testIds.length
      ? await this.prisma.testResult.findMany({
          where: {
            testId: { in: testIds },
            studentId: { in: [...pupils.keys()] },
            createdAt: { gte: start, lt: end },
          },
          select: { studentId: true },
        })
      : [];
    const submitted = new Set(
      assignments.flatMap((a) =>
        a.submissions
          .filter((s) => s.submittedAt && pupils.has(s.studentId))
          .map((s) => s.studentId),
      ),
    );
    const packet = await this.prisma.lessonPacket.findUnique({
      where: { classroomId_date: { classroomId, date } },
      include: {
        receipts: { select: { studentId: true, kind: true } },
        photoTurn: true,
      },
    });
    const completedClassTest = new Set<string>();
    if (packet?.testSessionId) {
      const session = await this.prisma.classTestSession.findUnique({
        where: { id: packet.testSessionId },
        select: { testId: true, excludedProblemIds: true },
      });
      if (session?.testId) {
        const problems = await this.prisma.testProblem.findMany({
          where: {
            testId: session.testId,
            problemId: { notIn: session.excludedProblemIds },
          },
          select: { problemId: true },
        });
        if (problems.length) {
          const attempts = await this.prisma.attempt.findMany({
            where: {
              classroomId,
              occurredOn: date,
              studentId: { in: [...pupils.keys()] },
              problemId: { in: problems.map((p) => p.problemId) },
              selfState: { not: null },
            },
            select: { studentId: true, problemId: true },
          });
          const byPupil = new Map<string, Set<string>>();
          for (const attempt of attempts) {
            const marked = byPupil.get(attempt.studentId) ?? new Set<string>();
            marked.add(attempt.problemId);
            byPupil.set(attempt.studentId, marked);
          }
          for (const pupil of pupils.keys())
            if (problems.every((p) => byPupil.get(pupil)?.has(p.problemId)))
              completedClassTest.add(pupil);
        }
        const online = await this.prisma.testAttemptSession.findMany({
          where: {
            testId: session.testId,
            studentId: { in: [...pupils.keys()] },
            status: 'SUBMITTED',
            startedAt: { gte: start, lt: end },
          },
          select: { studentId: true },
        });
        for (const attempt of online) completedClassTest.add(attempt.studentId);
      }
    }
    const linkedHomework = packet?.homeworkAssignmentId
      ? await this.prisma.assignment.findUnique({
          where: { id: packet.homeworkAssignmentId },
          select: {
            title: true,
            description: true,
            imageKeys: true,
            dueDate: true,
            submissions: { select: { studentId: true, submittedAt: true } },
          },
        })
      : null;
    const count = (kind: string) =>
      new Set(
        packet?.receipts
          .filter((r) => r.kind === kind && pupils.has(r.studentId))
          .map((r) => r.studentId) ?? [],
      ).size;
    return {
      packet,
      classroom,
      date: dateText,
      chapter,
      sessions,
      assignments: assignments.map((a) => ({ id: a.id, title: a.title })),
      counters: {
        classSize: pupils.size,
        theorySubmitted: packet ? count('THEORY') : null,
        classTestSubmitted: packet
          ? new Set([
              ...completedClassTest,
              ...packet.receipts
                .filter(
                  (r) => r.kind === 'CLASS_TEST' && pupils.has(r.studentId),
                )
                .map((r) => r.studentId),
            ]).size
          : new Set(results.map((r) => r.studentId)).size,
        homeworkSubmitted: packet
          ? new Set([
              ...packet.receipts
                .filter((r) => r.kind === 'HOMEWORK' && pupils.has(r.studentId))
                .map((r) => r.studentId),
              ...(linkedHomework?.submissions
                .filter((s) => s.submittedAt && pupils.has(s.studentId))
                .map((s) => s.studentId) ?? []),
            ]).size
          : submitted.size,
      },
      photoCandidates: [...pupils.keys()]
        .filter((id) =>
          ['PRESENT', 'LATE'].includes(attendanceMap.get(id) ?? ''),
        )
        .map((studentId) => ({ studentId, ...pupils.get(studentId)?.student })),
      rotation: rotation.map((r) => ({
        ...r,
        ...pupils.get(r.studentId)?.student,
      })),
      makeupPupils: [...pupils.keys()]
        .filter((id) =>
          ['ABSENT', 'EXCUSED'].includes(attendanceMap.get(id) ?? ''),
        )
        .map((studentId) => ({ studentId, ...pupils.get(studentId)?.student })),
      homeworkImageKeys: linkedHomework?.imageKeys ?? [],
      homeworkDueDate: linkedHomework?.dueDate ?? null,
      prefill: linkedHomework
        ? {
            title: linkedHomework.title,
            description: linkedHomework.description ?? '',
          }
        : homeworkPrefill(
            chapter.title,
            chapter.tests.find((t) => testIds.includes(t.id))?.title,
          ),
      limitations: [
        'Тест: бүх орсон бодлогын оройн тэмдэглэгээ, дууссан онлайн тест, эсвэл тестийн хавсралт илгээсэн сурагч; зөв хариулсан гэсэн үг биш.',
        'Хадгалсан багцын тоо нь бодит хавсралт илгээсэн сурагчдын тоо; зөв хариулсан гэсэн үг биш.',
        'Зураг авах ээлжийг тусад нь батална; өмнөх ээлжийн түүх хадгалагдана.',
      ],
    };
  }

  private async ownClass(
    classroomId: string,
    userId: string,
    role: Role,
    db: Prisma.TransactionClient = this.prisma,
    allowArchived = false,
  ) {
    const c = await db.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        teacherId: true,
        assistantTeacherId: true,
        archived: true,
      },
    });
    if (!c || (c.archived && !allowArchived))
      throw new NotFoundException('Анги олдсонгүй');
    if (!canRunClass(c, userId, role))
      throw new ForbiddenException('Өөрийн ангийг сонгоно уу.');
    return c;
  }
  private async ownKeys(
    keys: unknown,
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
    retainedKeys: string[] = [],
  ) {
    if (
      !Array.isArray(keys) ||
      keys.length > 10 ||
      keys.some(
        (k) =>
          typeof k !== 'string' || k.length > 200 || !/^\w[\w.-]*$/.test(k),
      )
    )
      throw new BadRequestException('Хавсралт 0–10 файл байна.');
    const unique = [...new Set(keys)] as string[];
    const newKeys = unique.filter((k) => !retainedKeys.includes(k));
    const files = await db.storedFile.findMany({
      where: { key: { in: newKeys }, ownerId: userId },
      select: { key: true, mime: true, size: true },
    });
    if (
      files.length !== newKeys.length ||
      files.some(
        (f) =>
          ![
            'image/png',
            'image/jpeg',
            'image/webp',
            'image/gif',
            'image/heic',
            'application/pdf',
          ].includes(f.mime) || f.size > 10 * 1024 * 1024,
      )
    )
      throw new ForbiddenException('Зөвхөн өөрийн зураг / PDF хавсаргана.');
    return unique;
  }
  async save(
    classroomId: string,
    dateText: string,
    raw: unknown,
    userId: string,
    role: Role,
  ) {
    const body = packetInput(raw);
    const date = dismissalDate(dateText);
    await this.ownClass(classroomId, userId, role);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${classroomId}))::text`;
      await this.ownClass(classroomId, userId, role, tx);
      const chapter = await tx.chapter.findFirst({
        where: { id: body.chapterId, deletedAt: null },
        select: { id: true, theories: { select: { id: true } } },
      });
      if (!chapter) throw new NotFoundException('Сэдэв олдсонгүй');
      const old = await tx.lessonPacket.findUnique({
        where: { classroomId_date: { classroomId, date } },
      });
      const theoryIds =
        body.theoryBlockIds ??
        old?.theoryBlockIds ??
        chapter.theories.map((t) => t.id);
      if (
        !Array.isArray(theoryIds) ||
        theoryIds.length > 100 ||
        (body.theoryBlockIds !== undefined &&
          theoryIds.some(
            (id: string) => !chapter.theories.some((t) => t.id === id),
          ))
      )
        throw new BadRequestException('Онол энэ сэдэвт харьяалагдах ёстой.');
      for (const testId of [body.testId, body.makeupTestId].filter(
        (id): id is string => typeof id === 'string',
      )) {
        if (
          typeof testId !== 'string' ||
          testId.length > 200 ||
          !(await tx.test.findFirst({
            where: {
              id: testId,
              chapterId: chapter.id,
              ...(testId === body.makeupTestId ? { variantLabel: 'A' } : {}),
              isDraft: false,
              deletedAt: null,
            },
            select: { id: true },
          }))
        )
          throw new BadRequestException(
            'Тест энэ сэдвийн нийтлэгдсэн хувилбар байх ёстой.',
          );
      }
      for (const testId of [body.testId, body.makeupTestId].filter(
        (id): id is string => typeof id === 'string',
      )) {
        // Ангид шинээр оноогдвол тестийн өөрчлөлтийн түүхэд бичигдэнэ
        // (аль хэдийн оноогдсон бол өөрчлөлтгүй — юу ч бичихгүй).
        const rev = await beginRevision(tx, 'TEST', testId);
        await tx.testAccess.upsert({
          where: { testId_classroomId: { testId, classroomId } },
          create: { testId, classroomId },
          update: {},
        });
        await commitRevision(tx, rev, {
          actor: { id: userId, role },
          action: 'UPDATE',
        });
      }
      if (old && old.chapterId !== chapter.id)
        throw new ConflictException(
          'Өдрийн хадгалсан сэдвийг сольж болохгүй; шинэ өдөр / тусдаа нөхөх багц сонгоно.',
        );
      let testSessionId = old?.testSessionId;
      if (body.testId) {
        const session = await tx.classTestSession.upsert({
          where: {
            classroomId_testId_date: { classroomId, testId: body.testId, date },
          },
          create: {
            classroomId,
            testId: body.testId,
            date,
            createdById: userId,
          },
          update: {},
        });
        testSessionId = session.id;
      }
      let homeworkAssignmentId = old?.homeworkAssignmentId;
      if (body.homework) {
        const h = body.homework;
        if (
          typeof h.title !== 'string' ||
          !h.title.trim() ||
          h.title.length > 200 ||
          typeof h.description !== 'string' ||
          h.description.length > 10000 ||
          Object.keys(h).some(
            (k) =>
              !['title', 'description', 'imageKeys', 'dueDate'].includes(k),
          )
        )
          throw new BadRequestException('Даалгаврын тайлбарыг шалгана уу.');
        const retained = homeworkAssignmentId
          ? await tx.assignment.findUnique({
              where: { id: homeworkAssignmentId },
              select: { imageKeys: true },
            })
          : null;
        const imageKeys = await this.ownKeys(
          h.imageKeys ?? [],
          userId,
          tx,
          retained?.imageKeys ?? [],
        );
        let dueDate: Date | undefined;
        if (h.dueDate) {
          dismissalDate(h.dueDate);
          dueDate = new Date(`${h.dueDate}T20:00:00+08:00`);
        }
        if (homeworkAssignmentId) {
          await tx.assignment.update({
            where: { id: homeworkAssignmentId },
            data: {
              title: h.title.trim(),
              description: h.description,
              imageKeys,
              ...(dueDate ? { dueDate } : {}),
            },
          });
        } else {
          const assignment = await tx.assignment.create({
            data: {
              classroomId,
              title: h.title.trim(),
              description: h.description,
              imageKeys,
              dueDate,
              createdById: userId,
              type: 'DAILY',
            },
          });
          homeworkAssignmentId = assignment.id;
        }
      }
      return tx.lessonPacket.upsert({
        where: { classroomId_date: { classroomId, date } },
        create: {
          classroomId,
          date,
          chapterId: chapter.id,
          theoryBlockIds: theoryIds,
          testSessionId,
          homeworkAssignmentId,
          makeupTestId: body.makeupTestId ?? null,
          createdById: userId,
        },
        update: {
          chapterId: chapter.id,
          theoryBlockIds: theoryIds,
          testSessionId,
          homeworkAssignmentId,
          ...(body.makeupTestId !== undefined
            ? { makeupTestId: body.makeupTestId }
            : {}),
        },
      });
    });
  }
  private async member(
    packet: { date: Date; classroomId: string },
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const day = packet.date.toISOString().slice(0, 10),
      start = new Date(`${day}T00:00:00+08:00`),
      end = new Date(start.getTime() + 86400000);
    return db.enrollment.findFirst({
      where: {
        classroomId: packet.classroomId,
        studentId: userId,
        joinedAt: { lt: end },
        OR: [{ leftAt: null }, { leftAt: { gte: end } }],
      },
      select: { id: true },
    });
  }
  async read(packetId: string, userId: string, role: Role, studentId?: string) {
    const packet = await this.prisma.lessonPacket.findUnique({
      where: { id: packetId },
      include: {
        chapter: { select: { id: true, title: true } },
        photoTurn: {
          select: { studentId: true, reason: true, createdAt: true },
        },
      },
    });
    if (!packet) throw new NotFoundException('Өдрийн багц олдсонгүй');
    let pupil = userId;
    if (
      role === Role.ADMIN ||
      role === Role.TEACHER ||
      role === Role.TEACHER_PLUS
    ) {
      await this.ownClass(packet.classroomId, userId, role, this.prisma, true);
      if (studentId) {
        if (!(await this.member(packet, studentId)))
          throw new ForbiddenException(
            'Сурагч энэ өдрийн ангид харьяалагдахгүй.',
          );
        pupil = studentId;
      }
    } else if (role === Role.PARENT) {
      const links = await this.prisma.parentLink.findMany({
        where: { parentId: userId, verifiedAt: { not: null } },
        select: { studentId: true },
      });
      const children = [] as string[];
      for (const link of links)
        if (await this.member(packet, link.studentId))
          children.push(link.studentId);
      if (!children.length)
        throw new ForbiddenException('Энэ багцыг үзэх эрхгүй.');
      if (studentId && !children.includes(studentId))
        throw new ForbiddenException('Энэ хүүхдийн баримтыг үзэх эрхгүй.');
      pupil = studentId ?? children[0];
    } else if (
      role !== Role.STUDENT ||
      (studentId && studentId !== userId) ||
      !(await this.member(packet, userId))
    )
      throw new ForbiddenException('Энэ багцыг үзэх эрхгүй.');
    const theories = await this.prisma.theoryBlock.findMany({
      where: { id: { in: packet.theoryBlockIds } },
      orderBy: { order: 'asc' },
      select: { id: true, title: true, content: true, imageKeys: true },
    });
    const shared = await this.prisma.lessonReceipt.findMany({
      where: { packetId, kind: 'THEORY' },
      orderBy: { submittedAt: 'asc' },
      select: { id: true, imageKeys: true, submittedAt: true },
    });
    const receipts = await this.prisma.lessonReceipt.findMany({
      where: { packetId, studentId: pupil },
      orderBy: { submittedAt: 'asc' },
      select: { id: true, kind: true, imageKeys: true, submittedAt: true },
    });
    return { packet, theories, sharedTheoryPhotos: shared, receipts };
  }
  async mine(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: userId },
      select: { classroomId: true },
    });
    const packets = await this.prisma.lessonPacket.findMany({
      where: { classroomId: { in: enrollments.map((e) => e.classroomId) } },
      orderBy: { date: 'desc' },
      take: 100,
      select: {
        id: true,
        date: true,
        classroomId: true,
        chapter: { select: { title: true } },
      },
    });
    const result: typeof packets = [];
    for (const packet of packets)
      if (await this.member(packet, userId)) result.push(packet);
    return result;
  }
  async receipt(packetId: string, raw: unknown, userId: string) {
    const body = receiptInput(raw);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${packetId}),hashtext(${userId}))::text`;
      const packet = await tx.lessonPacket.findUnique({
        where: { id: packetId },
      });
      if (!packet) throw new NotFoundException('Багц олдсонгүй');
      if (!(await this.member(packet, userId, tx)))
        throw new ForbiddenException('Энэ өдрийн ангид бүртгэлгүй.');
      if (body.kind === 'MAKEUP' && !packet.makeupTestId)
        throw new BadRequestException('Нөхөх тестийг багш эхлээд сонгоно.');
      if (
        (body.kind === 'CLASS_TEST' && !packet.testSessionId) ||
        (body.kind === 'HOMEWORK' && !packet.homeworkAssignmentId)
      )
        throw new BadRequestException('Өдрийн тест / даалгавар холбоогүй.');
      const imageKeys = await this.ownKeys(body.imageKeys, userId, tx);
      if (!imageKeys.length)
        throw new BadRequestException('Бодит зураг / PDF хавсаргана.');
      const previous = await tx.lessonReceipt.findUnique({
        where: {
          packetId_studentId_kind_clientRequestId: {
            packetId,
            studentId: userId,
            kind: body.kind,
            clientRequestId: body.clientRequestId,
          },
        },
      });
      if (previous) {
        if (JSON.stringify(previous.imageKeys) !== JSON.stringify(imageKeys))
          throw new ConflictException(
            'Энэ илгээх дугаар өөр хавсралттай байна.',
          );
        return previous;
      }
      return tx.lessonReceipt.upsert({
        where: {
          packetId_studentId_kind_clientRequestId: {
            packetId,
            studentId: userId,
            kind: body.kind,
            clientRequestId: body.clientRequestId,
          },
        },
        create: {
          packetId,
          studentId: userId,
          kind: body.kind,
          clientRequestId: body.clientRequestId,
          imageKeys,
        },
        update: {},
      });
    });
  }
  async turn(packetId: string, raw: unknown, userId: string, role: Role) {
    const body = turnInput(raw);
    return this.prisma.$transaction(async (tx) => {
      const packet = await tx.lessonPacket.findUnique({
        where: { id: packetId },
      });
      if (!packet) throw new NotFoundException('Багц олдсонгүй');
      await this.ownClass(packet.classroomId, userId, role, tx);
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${packet.classroomId}))::text`;
      const existing = await tx.lessonPhotoTurn.findUnique({
        where: { packetId },
      });
      if (
        existing &&
        (!body.studentId ||
          (existing.studentId === body.studentId &&
            existing.reason === body.reason))
      )
        return existing;
      const day = packet.date.toISOString().slice(0, 10),
        end = new Date(new Date(`${day}T00:00:00+08:00`).getTime() + 86400000);
      const roster = await tx.enrollment.findMany({
        where: {
          classroomId: packet.classroomId,
          joinedAt: { lt: end },
          OR: [{ leftAt: null }, { leftAt: { gte: end } }],
        },
        select: { studentId: true },
      });
      const statuses = await tx.attendance.findMany({
        where: { classroomId: packet.classroomId, date: packet.date },
        select: { studentId: true, status: true },
      });
      const byId = new Map(statuses.map((a) => [a.studentId, a.status]));
      const state = await tx.lessonRotation.upsert({
        where: { classroomId: packet.classroomId },
        create: { classroomId: packet.classroomId },
        update: {},
      });
      const pending = new Set(
        state.pendingStudentIds.filter((id) =>
          roster.some((r) => r.studentId === id),
        ),
      );
      for (const r of roster)
        if (
          ['ABSENT', 'EXCUSED'].includes(byId.get(r.studentId) ?? '') &&
          !state.servedStudentIds.includes(r.studentId)
        )
          pending.add(r.studentId);
      const eligible = roster.filter((r) =>
        ['PRESENT', 'LATE'].includes(byId.get(r.studentId) ?? ''),
      );
      let served = state.servedStudentIds,
        cycle = state.cycle;
      if (
        !existing &&
        eligible.length &&
        eligible.every((r) => served.includes(r.studentId))
      ) {
        served = [];
        cycle++;
      }
      const candidates = eligible
        .filter(
          (r) => pending.has(r.studentId) || !served.includes(r.studentId),
        )
        .map((r) => ({
          id: r.studentId,
          attendance: byId.get(r.studentId) as RotationPupil['attendance'],
          missedTurn: pending.has(r.studentId),
        }));
      const chosen = body.studentId
        ? eligible.find((r) => r.studentId === body.studentId)?.studentId
        : choosePhotoTurn(candidates, 1)[0]?.studentId;
      if (!chosen)
        throw new BadRequestException(
          'Ирсэн / хоцорсон сурагчийн ирцийг эхлээд тэмдэглэнэ.',
        );
      if (existing && existing.studentId !== chosen) {
        const photo = await tx.lessonReceipt.findFirst({
          where: { packetId, studentId: existing.studentId, kind: 'THEORY' },
          select: { id: true },
        });
        if (!photo) {
          served = served.filter((id) => id !== existing.studentId);
          if (roster.some((r) => r.studentId === existing.studentId))
            pending.add(existing.studentId);
        }
      }
      const wasMissed = pending.has(chosen);
      pending.delete(chosen);
      served = [...new Set([...served, chosen])];
      await tx.lessonRotation.update({
        where: { classroomId: packet.classroomId },
        data: {
          cursorStudentId: chosen,
          pendingStudentIds: [...pending],
          servedStudentIds: served,
          cycle,
        },
      });
      const turnData = {
        studentId: chosen,
        reason: body.studentId
          ? (body.reason ?? 'TEACHER_OVERRIDE')
          : wasMissed
            ? 'MISSED_TURN'
            : 'ATTENDANCE_ROTATION',
        assignedById: userId,
      };
      if (existing)
        return tx.lessonPhotoTurn.update({
          where: { id: existing.id },
          data: turnData,
        });
      return tx.lessonPhotoTurn.create({
        data: {
          packetId,
          studentId: chosen,
          reason: body.studentId
            ? body.reason
            : wasMissed
              ? 'MISSED_TURN'
              : 'ATTENDANCE_ROTATION',
          assignedById: userId,
        },
      });
    });
  }
}

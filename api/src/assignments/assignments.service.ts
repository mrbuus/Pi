import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, SubmissionState } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReviewAction, ReviewDto } from './dto/review.dto';
import { SubmitDto } from './dto/submit.dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

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

  async listForClass(classroomId: string, userId: string, role: Role) {
    await this.assertClassAccess(classroomId, userId, role);
    return this.prisma.assignment.findMany({
      where: { classroomId },
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
    if (!assignment) throw new NotFoundException('Даалгавар олдсонгүй');

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
    if (!assignment) throw new NotFoundException('Даалгавар олдсонгүй');
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
    if (!assignment) throw new NotFoundException('Даалгавар олдсонгүй');
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

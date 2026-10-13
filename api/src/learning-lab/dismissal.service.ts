import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';
import { dismissalDate, dismissalValues } from './dismissal';
import type { DismissalInput } from './dismissal';
@Injectable()
export class DismissalService {
  constructor(private readonly prisma: PrismaService) {}
  // Эрх (эзэн 2026-10-08, өдрийн хуваарийн мөрөөс тэмдэглэх): ADMIN ба
  // TEACHER_PLUS — бүх идэвхтэй анги (25 ангийн ихэнх нь Classroom.teacherId-гүй);
  // TEACHER — ангийн багш, хуваарийн багш эсвэл тухайн өдрийн ахлах/туслах багш.
  private async classroom(
    actorId: string,
    role: Role,
    classroomId: string,
    date?: string,
  ) {
    if (
      !([Role.ADMIN, Role.TEACHER, Role.TEACHER_PLUS] as Role[]).includes(role)
    )
      throw new ForbiddenException('Энэ бүртгэлийг гаргах эрхгүй.');
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, teacherId: true, archived: true },
    });
    if (!classroom || classroom.archived)
      throw new NotFoundException('Идэвхтэй анги олдсонгүй.');
    if (role !== Role.TEACHER || classroom.teacherId === actorId) return;
    const staffed =
      date &&
      (await this.prisma.lessonStaffing.count({
        where: {
          date: dismissalDate(date),
          schedule: { classroomId },
          OR: [{ leadTeacherId: actorId }, { assistantTeacherId: actorId }],
        },
      }));
    const ownsSchedule = await this.prisma.classSchedule.count({
      where: { classroomId, teacherId: actorId },
    });
    if (!staffed && !ownsSchedule)
      throw new ForbiddenException('Зөвхөн өөрийн ангийн цагийг тэмдэглэнэ.');
  }
  async get(actorId: string, role: Role, classroomId: string, date: string) {
    await this.classroom(actorId, role, classroomId, date);
    const parsed = dismissalDate(date);
    return this.prisma.classDismissal.findUnique({
      where: { classroomId_date: { classroomId, date: parsed } },
    });
  }
  async save(
    actorId: string,
    role: Role,
    classroomId: string,
    date: string,
    body: DismissalInput,
  ) {
    await this.classroom(actorId, role, classroomId, date);
    const parsed = dismissalDate(date),
      values = dismissalValues(date, body);
    return this.prisma.classDismissal.upsert({
      where: { classroomId_date: { classroomId, date: parsed } },
      create: { classroomId, date: parsed, issuedById: actorId, ...values },
      update: { issuedById: actorId, ...values },
    });
  }
}

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
  private async classroom(actorId: string, role: Role, classroomId: string) {
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
    if (role !== Role.ADMIN && classroom.teacherId !== actorId)
      throw new ForbiddenException('Зөвхөн өөрийн ангийн цагийг тэмдэглэнэ.');
  }
  async get(actorId: string, role: Role, classroomId: string, date: string) {
    await this.classroom(actorId, role, classroomId);
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
    await this.classroom(actorId, role, classroomId);
    const parsed = dismissalDate(date),
      values = dismissalValues(date, body);
    return this.prisma.classDismissal.upsert({
      where: { classroomId_date: { classroomId, date: parsed } },
      create: { classroomId, date: parsed, issuedById: actorId, ...values },
      update: { issuedById: actorId, ...values },
    });
  }
}

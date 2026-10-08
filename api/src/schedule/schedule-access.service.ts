import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';
import { StaffCapabilityService } from '../staff-capabilities/staff-capability.service';

export type ScheduleActor = { userId: string; role: Role };
@Injectable()
export class ScheduleAccessService {
  constructor(
    private prisma: PrismaService,
    private capabilities: StaffCapabilityService,
  ) {}

  async manage(actor: ScheduleActor, classroomId?: string) {
    await this.capabilities.assert(
      actor.userId,
      'schedule.manage',
      classroomId,
    );
  }
  async manageSchedule(
    actor: ScheduleActor,
    id: string,
    destinationId?: string,
  ) {
    const schedule = await this.prisma.classSchedule.findUnique({
      where: { id },
      select: { classroomId: true },
    });
    if (!schedule) throw new NotFoundException('Хуваарь олдсонгүй');
    await this.manage(actor, schedule.classroomId);
    if (destinationId && destinationId !== schedule.classroomId)
      await this.manage(actor, destinationId);
  }
  async topic(actor: ScheduleActor, id: string) {
    const schedule = await this.prisma.classSchedule.findUnique({
      where: { id },
      select: {
        classroomId: true,
        teacherId: true,
        classroom: { select: { teacherId: true } },
      },
    });
    if (!schedule) throw new NotFoundException('Хуваарь олдсонгүй');
    if (
      (actor.role === Role.TEACHER || actor.role === Role.TEACHER_PLUS) &&
      (schedule.teacherId ?? schedule.classroom.teacherId) === actor.userId
    )
      return;
    await this.manage(actor, schedule.classroomId);
  }
  async readableClassrooms(
    actor: ScheduleActor,
  ): Promise<string[] | undefined> {
    if (await this.capabilities.has(actor.userId, 'schedule.manage'))
      return undefined;
    if (actor.role === Role.STUDENT || actor.role === Role.PARENT) {
      const rows = await this.prisma.enrollment.findMany({
        where: {
          leftAt: null,
          classroom: { archived: false },
          ...(actor.role === Role.STUDENT
            ? { studentId: actor.userId }
            : {
                student: {
                  childLinks: {
                    some: { parentId: actor.userId, verifiedAt: { not: null } },
                  },
                },
              }),
        },
        select: { classroomId: true },
      });
      return [...new Set(rows.map((r) => r.classroomId))];
    }
    if (actor.role === Role.TEACHER || actor.role === Role.TEACHER_PLUS) {
      const rows = await this.prisma.classroom.findMany({
        where: { archived: false },
        select: {
          id: true,
          teacherId: true,
          classSchedules: {
            where: { teacherId: actor.userId },
            select: { id: true },
          },
        },
      });
      const ids: string[] = [];
      for (const row of rows)
        if (
          row.teacherId === actor.userId ||
          row.classSchedules.length ||
          (await this.capabilities.has(actor.userId, 'schedule.manage', row.id))
        )
          ids.push(row.id);
      return ids;
    }
    return [];
  }
  async readClassroom(actor: ScheduleActor, id: string) {
    const ids = await this.readableClassrooms(actor);
    if (ids && !ids.includes(id))
      throw new ForbiddenException('Энэ ангийн хуваарийг харах эрхгүй');
  }
  async readSchedule(actor: ScheduleActor, id: string) {
    const row = await this.prisma.classSchedule.findUnique({
      where: { id },
      select: { classroomId: true },
    });
    if (!row) throw new NotFoundException('Хуваарь олдсонгүй');
    await this.readClassroom(actor, row.classroomId);
  }
}

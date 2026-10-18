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
  // Багшийн ажлын өдрийн хүснэгт (сондгой/тэгш): Багш+ өдөр бүр хуваарь
  // зохиодог тул (эзэн 2026-10-11) ADMIN, TEACHER_PLUS schedule.manage-гүйгээр
  // уншиж, засна. Бусад нь schedule.manage тусгай эрхтэй байх ёстой.
  async roster(actor: ScheduleActor) {
    if (actor.role === Role.ADMIN || actor.role === Role.TEACHER_PLUS) return;
    await this.manage(actor);
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
    // Багш+ өдрийн хуваарийн сэдэв/төлөвлөгөөг БҮХ ангид зооно (эзэн 2026-10-08) —
    // танхим/цаг/давталт өөрчлөх нь schedule.manage-тэй хэвээр. Энгийн Багш
    // төлөвлөгөөг зөвхөн ХАРНА (эзэн 2026-10-18) — бичихгүй.
    if (actor.role === Role.TEACHER_PLUS) return;
    if (actor.role !== Role.ADMIN)
      throw new ForbiddenException('Төлөвлөгөөг Багш+ тавина');
    await this.manage(actor, schedule.classroomId);
  }
  async readableClassrooms(
    actor: ScheduleActor,
  ): Promise<string[] | undefined> {
    if (await this.capabilities.has(actor.userId, 'schedule.manage'))
      return undefined;
    // Эзний шийдвэр (2026-10-08): ажилтан (Багш, Багш+) БҮХ ангийн хуваарийг
    // ХАРНА — «аль анги хэдэн цагаас аль танхимд орох» ерөнхий зураг. Засах нь
    // schedule.manage тусгай эрхтэй хэвээр (manage()).
    if (actor.role === Role.TEACHER || actor.role === Role.TEACHER_PLUS)
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

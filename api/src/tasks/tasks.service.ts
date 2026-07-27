import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Role, TaskStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AddAssigneeDto } from './dto/add-assignee.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { FindTasksQueryDto } from './dto/find-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { WorkloadQueryDto } from './dto/workload-query.dto';

// 16 ажилтан: Админ + Багш+ + Багш нар л энэ төлөвлөгчийг ашиглана
// (сурагч/эцэг эх/худалдан авагч хамааралгүй).
export const STAFF_ROLES: Role[] = [
  Role.ADMIN,
  Role.TEACHER_PLUS,
  Role.TEACHER,
];

const ASSIGNEE_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: true,
} satisfies Prisma.UserSelect;

const TASK_INCLUDE = {
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  classroom: { select: { id: true, name: true } },
  assignees: { include: { user: { select: ASSIGNEE_USER_SELECT } } },
  subtasks: {
    orderBy: { orderIndex: 'asc' as const },
    include: {
      assignees: { include: { user: { select: ASSIGNEE_USER_SELECT } } },
      classroom: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.StaffTaskInclude;

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  // dueDate эхлэх огнооноос өмнө байж болохгүй (аль нэг нь undefined бол шалгах шаардлагагүй)
  private assertDateOrder(startDate?: Date | null, dueDate?: Date | null) {
    if (startDate && dueDate && dueDate.getTime() < startDate.getTime()) {
      throw new BadRequestException(
        'Дуусах огноо эхлэх огнооноос өмнө байж болохгүй',
      );
    }
  }

  // ХУГАЦАА харагдацын [from, to] мужтай ДАВХЦАХ даалгаврыг сонгоно.
  // Огнооноо огт тавиагүй даалгавар (startDate/dueDate хоёулаа null) үргэлж харагдана.
  private dateRangeWhere(from?: string, to?: string): Prisma.StaffTaskWhereInput {
    const clauses: Prisma.StaffTaskWhereInput[] = [];
    if (from) {
      clauses.push({
        OR: [{ dueDate: { gte: new Date(from) } }, { dueDate: null }],
      });
    }
    if (to) {
      clauses.push({
        OR: [{ startDate: { lte: new Date(to) } }, { startDate: null }],
      });
    }
    return clauses.length ? { AND: clauses } : {};
  }

  private buildFilterWhere(q: FindTasksQueryDto): Prisma.StaffTaskWhereInput {
    return {
      ...(q.status ? { status: q.status } : {}),
      ...(q.assigneeId
        ? { assignees: { some: { userId: q.assigneeId } } }
        : {}),
      ...(q.classroomId ? { classroomId: q.classroomId } : {}),
      ...(q.subject ? { subject: q.subject } : {}),
      ...this.dateRangeWhere(q.from, q.to),
    };
  }

  private async assertAssigneesExist(assigneeIds?: string[]) {
    if (!assigneeIds || assigneeIds.length === 0) return;
    const count = await this.prisma.user.count({
      where: { id: { in: assigneeIds } },
    });
    if (count !== assigneeIds.length) {
      throw new BadRequestException(
        'Хариуцах ажилтнуудын заримыг нь олсонгүй',
      );
    }
  }

  private async assertParentIsTopLevel(parentTaskId: string) {
    const parent = await this.prisma.staffTask.findUnique({
      where: { id: parentTaskId },
      select: { id: true, parentTaskId: true },
    });
    if (!parent) throw new NotFoundException('Эцэг даалгавар олдсонгүй');
    if (parent.parentTaskId) {
      throw new BadRequestException(
        'Дэд даалгаварт дахин дэд даалгавар нэмэх боломжгүй (нэг л түвшин дэмждэг)',
      );
    }
  }

  async create(dto: CreateTaskDto, createdById: string) {
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    this.assertDateOrder(startDate, dueDate);
    if (dto.parentTaskId) await this.assertParentIsTopLevel(dto.parentTaskId);
    await this.assertAssigneesExist(dto.assigneeIds);

    return this.prisma.staffTask.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        startDate,
        dueDate,
        parentTaskId: dto.parentTaskId,
        classroomId: dto.classroomId,
        subject: dto.subject,
        estimateHours: dto.estimateHours,
        createdById,
        assignees: dto.assigneeIds?.length
          ? { createMany: { data: dto.assigneeIds.map((userId) => ({ userId })) } }
          : undefined,
      },
      include: TASK_INCLUDE,
    });
  }

  // "Багана" болон "Хугацаа" харагдац хоёулаа энэ жагсаалтыг ашиглана.
  // Эцэг даалгавар шүүлтүүрт таарахгүй ч дэд даалгавар нь таарвал багц бүхлээрээ гарна
  // (ингэж хиймэл байдлаар "эцгээ алдсан" дэд даалгавар харагдахгүй).
  async findAll(q: FindTasksQueryDto) {
    const match = this.buildFilterWhere(q);
    return this.prisma.staffTask.findMany({
      where: {
        parentTaskId: null,
        OR: [match, { subtasks: { some: match } }],
      },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
      include: TASK_INCLUDE,
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.staffTask.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    });
    if (!task) throw new NotFoundException('Даалгавар олдсонгүй');
    return task;
  }

  private async findRaw(id: string) {
    const task = await this.prisma.staffTask.findUnique({
      where: { id },
      include: { assignees: true },
    });
    if (!task) throw new NotFoundException('Даалгавар олдсонгүй');
    return task;
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    userId: string,
    role: Role,
  ) {
    const existing = await this.findRaw(id);

    if (role === Role.TEACHER) {
      // Плайн багш зөвхөн ӨӨРТ нь оноогдсон даалгаврын ТӨЛӨВИЙГ л өөрчилж чадна.
      const isAssigned = existing.assignees.some((a) => a.userId === userId);
      if (!isAssigned) {
        throw new ForbiddenException(
          'Танд оноогдоогүй даалгаварт өөрчлөлт оруулах эрхгүй',
        );
      }
      const otherFields = Object.keys(dto).filter((k) => k !== 'status');
      if (otherFields.length > 0 || dto.status === undefined) {
        throw new ForbiddenException(
          'Багш зөвхөн даалгаврын ТӨЛӨВИЙГ л өөрчлөх эрхтэй',
        );
      }
      return this.prisma.staffTask.update({
        where: { id },
        data: { status: dto.status },
        include: TASK_INCLUDE,
      });
    }

    // ADMIN / TEACHER_PLUS — бүх талбарыг засах эрхтэй
    const startDate =
      dto.startDate !== undefined
        ? dto.startDate
          ? new Date(dto.startDate)
          : null
        : existing.startDate;
    const dueDate =
      dto.dueDate !== undefined
        ? dto.dueDate
          ? new Date(dto.dueDate)
          : null
        : existing.dueDate;
    this.assertDateOrder(startDate, dueDate);

    if (dto.parentTaskId) {
      if (dto.parentTaskId === id) {
        throw new BadRequestException(
          'Даалгавар өөрийгөө эцэг болгож чадахгүй',
        );
      }
      await this.assertParentIsTopLevel(dto.parentTaskId);
    }
    await this.assertAssigneesExist(dto.assigneeIds);

    if (dto.assigneeIds) {
      await this.prisma.staffTaskAssignee.deleteMany({ where: { taskId: id } });
    }

    return this.prisma.staffTask.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        startDate,
        dueDate,
        parentTaskId:
          dto.parentTaskId !== undefined ? dto.parentTaskId : undefined,
        classroomId: dto.classroomId,
        subject: dto.subject,
        estimateHours: dto.estimateHours,
        assignees: dto.assigneeIds?.length
          ? { createMany: { data: dto.assigneeIds.map((uid) => ({ userId: uid })) } }
          : undefined,
      },
      include: TASK_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findRaw(id);
    await this.prisma.staffTask.delete({ where: { id } });
    return { id };
  }

  async addAssignee(taskId: string, dto: AddAssigneeDto) {
    await this.findRaw(taskId);
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй');
    await this.prisma.staffTaskAssignee.upsert({
      where: { taskId_userId: { taskId, userId: dto.userId } },
      create: { taskId, userId: dto.userId },
      update: {},
    });
    return this.findOne(taskId);
  }

  async removeAssignee(taskId: string, userId: string) {
    await this.findRaw(taskId);
    await this.prisma.staffTaskAssignee
      .delete({ where: { taskId_userId: { taskId, userId } } })
      .catch(() => {
        throw new NotFoundException('Энэ хэрэглэгч даалгаварт оноогдоогүй байна');
      });
    return this.findOne(taskId);
  }

  // Даалгавар оноох цонхны багц сонголт — 16 ажилтны нэр/зураг.
  // /users эндпойнт зөвхөн ADMIN-д нээлттэй тул (users.controller class-level
  // @Roles(ADMIN)) Багш+-д зориулж энэ модулиндаа хөнгөн хувилбарыг гаргав.
  staffDirectory() {
    return this.prisma.user.findMany({
      where: { role: { in: STAFF_ROLES } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  // АЧААЛАЛ харагдац: ажилтан бүрийн муж дахь даалгаврын тоо (төлөв тус бүрээр)
  // болон нийт тооцоолсон цагийг буцаана — хэн хэт ачаалалтай байгааг харуулна.
  async workload(q: WorkloadQueryDto) {
    const where = this.dateRangeWhere(q.from, q.to);

    const staff = await this.prisma.user.findMany({
      where: { role: { in: STAFF_ROLES } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const tasks = await this.prisma.staffTask.findMany({
      where,
      select: {
        status: true,
        estimateHours: true,
        assignees: { select: { userId: true } },
      },
    });

    const emptyCounts = (): Record<TaskStatus, number> => ({
      PLANNED: 0,
      IN_PROGRESS: 0,
      DONE: 0,
      BLOCKED: 0,
      CANCELLED: 0,
    });

    const byUser = new Map<
      string,
      { counts: Record<TaskStatus, number>; totalEstimateHours: number }
    >();
    for (const s of staff) {
      byUser.set(s.id, { counts: emptyCounts(), totalEstimateHours: 0 });
    }

    for (const task of tasks) {
      for (const a of task.assignees) {
        const bucket = byUser.get(a.userId);
        if (!bucket) continue; // сурагч гэх мэт staff бус хэрэглэгч байх боломжгүй ч аюулгүйн үүднээс
        bucket.counts[task.status] += 1;
        bucket.totalEstimateHours += task.estimateHours ?? 0;
      }
    }

    return staff
      .map((s) => {
        const bucket = byUser.get(s.id)!;
        const openCount =
          bucket.counts.PLANNED + bucket.counts.IN_PROGRESS + bucket.counts.BLOCKED;
        return {
          user: s,
          counts: bucket.counts,
          totalEstimateHours: bucket.totalEstimateHours,
          openCount,
        };
      })
      .sort((a, b) => b.totalEstimateHours - a.totalEstimateHours);
  }
}

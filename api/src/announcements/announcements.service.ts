import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnnouncementAudience,
  Role,
  StudentType,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  create(
    data: {
      title: string;
      body: string;
      audience: AnnouncementAudience;
      classroomId?: string;
      classroomIds?: string[];
      pinned?: boolean;
    },
    byUserId: string,
  ) {
    return this.prisma.announcement.create({
      data: {
        title: data.title,
        body: data.body,
        audience: data.audience,
        classroomId:
          data.audience === AnnouncementAudience.ONE_CLASSROOM
            ? data.classroomId
            : null,
        pinned: data.pinned ?? false,
        createdById: byUserId,
        classroomTargets:
          data.audience === AnnouncementAudience.SELECTED_CLASSROOMS &&
          data.classroomIds?.length
            ? {
                create: Array.from(new Set(data.classroomIds)).map(
                  (classroomId) => ({ classroomId }),
                ),
              }
            : undefined,
      },
      include: {
        classroomTargets: {
          include: { classroom: { select: { id: true, name: true } } },
        },
      },
    });
  }

  // Сурагчид зориулсан зарууд: төвийн нийт + төрөл + өөрийн ангиар нарийвчилна.
  async forStudent(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!profile) return [];

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId: userId, leftAt: null },
      select: { classroomId: true },
    });

    return this.prisma.announcement.findMany({
      where: {
        OR: [
          { audience: AnnouncementAudience.ALL_STUDENTS },
          ...(profile.type === StudentType.CLASSROOM
            ? [{ audience: AnnouncementAudience.ALL_CLASSROOM }]
            : []),
          ...(profile.type === StudentType.ONLINE
            ? [{ audience: AnnouncementAudience.ALL_ONLINE }]
            : []),
          ...(enrollment
            ? [
                { classroomId: enrollment.classroomId },
                {
                  classroomTargets: {
                    some: { classroomId: enrollment.classroomId },
                  },
                },
              ]
            : []),
        ],
      },
      include: {
        classroomTargets: {
          include: { classroom: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });
  }

  // Багш/админ удирдлагад — бүх зар
  manageList() {
    return this.prisma.announcement.findMany({
      include: {
        classroomTargets: {
          include: { classroom: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  async remove(id: string, role: Role) {
    const ann = await this.prisma.announcement.findUnique({ where: { id } });
    if (!ann) throw new NotFoundException('Зар олдсонгүй');
    const allowed: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];
    if (!allowed.includes(role)) {
      throw new ForbiddenException('Эрхгүй');
    }
    await this.prisma.announcement.delete({ where: { id } });
    return { removed: true };
  }
}

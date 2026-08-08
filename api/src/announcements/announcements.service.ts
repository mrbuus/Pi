import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import {
  AnnouncementAudience,
  Role,
  StudentType,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

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
        deletedAt: null,
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

  // Эцэг эхийн хүүхдүүдийн ангийн зарууд
  async forParentChildren(parentId: string) {
    const children = await this.prisma.parentLink.findMany({
      where: { parentId, verifiedAt: { not: null } },
      select: { studentId: true },
    });

    if (children.length === 0) return [];

    const classroomIds = await this.prisma.enrollment.findMany({
      where: {
        studentId: { in: children.map((c) => c.studentId) },
        leftAt: null,
      },
      select: { classroomId: true },
      distinct: ['classroomId'],
    });

    const classroomIdSet = new Set(classroomIds.map((e) => e.classroomId));

    return this.prisma.announcement.findMany({
      where: {
        deletedAt: null,
        OR: [
          { audience: AnnouncementAudience.ALL_STUDENTS },
          { audience: AnnouncementAudience.ALL_CLASSROOM },
          { classroomId: { in: Array.from(classroomIdSet) } },
          {
            classroomTargets: {
              some: { classroomId: { in: Array.from(classroomIdSet) } },
            },
          },
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
      where: { deletedAt: null },
      include: {
        classroomTargets: {
          include: { classroom: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  // Зохиогч эсвэл Багш+/Админ засна
  async update(
    id: string,
    data: {
      title?: string;
      body?: string;
      audience?: AnnouncementAudience;
      classroomId?: string;
      classroomIds?: string[];
      pinned?: boolean;
    },
    actorId: string,
    actorRole: Role,
  ) {
    const ann = await this.prisma.announcement.findUnique({ where: { id } });
    if (!ann || ann.deletedAt) throw new NotFoundException('Зар олдсонгүй');

    const isAuthor = ann.createdById === actorId;
    const isTeacherPlusOrAdmin =
      actorRole === Role.TEACHER_PLUS || actorRole === Role.ADMIN;
    if (!isAuthor && !isTeacherPlusOrAdmin) {
      throw new ForbiddenException(
        'Зөвхөн зохиогч эсвэл Багш+/Админ засварлах эрхтэй',
      );
    }

    const nextAudience = data.audience ?? ann.audience;
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.audience !== undefined ? { audience: data.audience } : {}),
        ...(data.pinned !== undefined ? { pinned: data.pinned } : {}),
        classroomId:
          nextAudience === AnnouncementAudience.ONE_CLASSROOM
            ? (data.classroomId ?? ann.classroomId)
            : null,
        ...(nextAudience === AnnouncementAudience.SELECTED_CLASSROOMS &&
        data.classroomIds
          ? {
              classroomTargets: {
                deleteMany: {},
                create: Array.from(new Set(data.classroomIds)).map(
                  (classroomId) => ({ classroomId }),
                ),
              },
            }
          : {}),
      },
      include: {
        classroomTargets: {
          include: { classroom: { select: { id: true, name: true } } },
        },
      },
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'UPDATE',
      entity: 'Announcement',
      entityId: id,
      before: ann,
      after: updated,
    });

    return updated;
  }

  // Зөөлөн устгал: түүхийг хадгална (hard DELETE хийхгүй)
  async remove(id: string, actorId: string, role: Role) {
    const ann = await this.prisma.announcement.findUnique({ where: { id } });
    if (!ann || ann.deletedAt) throw new NotFoundException('Зар олдсонгүй');
    const allowed: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];
    if (!allowed.includes(role)) {
      throw new ForbiddenException('Эрхгүй');
    }
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.record({
      actorId,
      actorRole: role,
      action: 'DELETE',
      entity: 'Announcement',
      entityId: id,
      before: ann,
      after: updated,
    });

    return { removed: true };
  }
}

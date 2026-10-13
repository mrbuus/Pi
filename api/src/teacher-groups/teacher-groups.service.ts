import {
  Injectable,
  Optional,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Role } from '../generated/prisma/enums';
import { activePurchaseWhere } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherGroupDto } from './dto/create-teacher-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { RegisterExternalTeacherDto } from './dto/register-external-teacher.dto';
import { VerifyExternalTeacherDto } from './dto/verify-external-teacher.dto';
import { RejectExternalTeacherDto } from './dto/reject-external-teacher.dto';

const REJECTION_REASON_PREFIX = 'ТАТГАЛЗСАН ШАЛТГААН: ';

/**
 * Join code үүсгэх функц: 6-8 тэмдэгт, үл ойлгомжтой тэмдэгтүүд хэрэглэхгүй
 * (0/O, 1/I/l, L избегаются).
 */
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

@Injectable()
export class TeacherGroupsService {
  constructor(
    private prisma: PrismaService,
    @Optional() private audit?: AuditService,
  ) {}
  private async verifiedOwner(id: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id },
      select: {
        role: true,
        archivedAt: true,
        externalTeacherProfile: { select: { verifiedAt: true } },
      },
    });
    if (
      !actor ||
      actor.archivedAt ||
      ![Role.TEACHER, Role.TEACHER_PLUS].includes(
        actor.role as typeof Role.TEACHER,
      ) ||
      !actor.externalTeacherProfile?.verifiedAt
    )
      throw new ForbiddenException(
        'Идэвхтэй баталгаажсан гадны багш шаардлагатай',
      );
  }

  /**
   * Шинэ бүртгэл хувийн бүлгээ шууд удирдана. verifiedAt нь бүлгийн
   * идэвхжил бөгөөд төвийн багшийн эрх эсвэл мэргэжлийн баталгаа биш.
   */
  async registerExternalTeacher(dto: RegisterExternalTeacherDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Энэ имэйл аль хэдийн бүртгэлтэй');
    }

    // Password hash: auth.service-т ашигласан функцыг ашигла
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: 'TEACHER',
        externalTeacherProfile: {
          create: {
            organization: dto.organization || null,
            verifiedAt: new Date(),
            verifiedById: null,
          },
        },
      },
      include: {
        externalTeacherProfile: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organization: user.externalTeacherProfile?.organization,
      verifiedAt: user.externalTeacherProfile?.verifiedAt,
    };
  }

  /**
   * Админ эсвэл TEACHER_PLUS гадны багшийг баталгаажуулна.
   * verifiedAt нь одоогийн цаг, verifiedById нь үйлдэл хийгч админ/TEACHER_PLUS.
   */
  async verifyExternalTeacher(
    userId: string,
    verifiedById: string,
    dto: VerifyExternalTeacherDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { externalTeacherProfile: true },
    });

    if (!user || !user.externalTeacherProfile) {
      throw new NotFoundException('Гадны багш олдсонгүй');
    }

    if (user.externalTeacherProfile.verifiedAt) {
      throw new BadRequestException('Энэ багш аль хэдийн баталгаажуулсан');
    }

    const updated = await this.prisma.externalTeacherProfile.update({
      where: { userId },
      data: {
        verifiedAt: new Date(),
        verifiedById,
        note: dto.note || null,
      },
    });

    return {
      userId: updated.userId,
      organization: updated.organization,
      verifiedAt: updated.verifiedAt,
      note: updated.note,
    };
  }

  /**
   * Ирээдүйн баталгаажаагүй багшийн жагсаалт (админ/TEACHER_PLUS-д).
   */
  async getUnverifiedTeachers() {
    const teachers = await this.prisma.user.findMany({
      where: {
        role: 'TEACHER',
        externalTeacherProfile: {
          verifiedAt: null,
        },
      },
      include: {
        externalTeacherProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return teachers.map((t) => ({
      id: t.id,
      email: t.email,
      firstName: t.firstName,
      lastName: t.lastName,
      organization: t.externalTeacherProfile?.organization,
      createdAt: t.createdAt,
      rejectionReason: t.externalTeacherProfile?.note?.startsWith(
        REJECTION_REASON_PREFIX,
      )
        ? t.externalTeacherProfile.note.slice(REJECTION_REASON_PREFIX.length)
        : null,
    }));
  }

  async rejectExternalTeacher(userId: string, dto: RejectExternalTeacherDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { externalTeacherProfile: true },
    });

    if (!user?.externalTeacherProfile) {
      throw new NotFoundException('Гадны багш олдсонгүй');
    }
    if (user.externalTeacherProfile.verifiedAt) {
      throw new BadRequestException(
        'Баталгаажсан багшийг хүсэлтээс татгалзаж болохгүй',
      );
    }
    if (user.externalTeacherProfile.note?.startsWith(REJECTION_REASON_PREFIX)) {
      throw new BadRequestException('Энэ хүсэлт аль хэдийн татгалзсан');
    }

    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException('Татгалзах шалтгааныг бичнэ үү');
    }

    const updated = await this.prisma.externalTeacherProfile.update({
      where: { userId },
      data: { note: `${REJECTION_REASON_PREFIX}${reason}` },
      select: { userId: true, note: true, verifiedAt: true },
    });

    return {
      userId: updated.userId,
      rejected: true,
      rejectionReason:
        updated.note?.slice(REJECTION_REASON_PREFIX.length) ?? reason,
      verifiedAt: updated.verifiedAt,
    };
  }

  async reconsiderExternalTeacher(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        externalTeacherProfile: { select: { note: true, verifiedAt: true } },
      },
    });

    if (!user?.externalTeacherProfile) {
      throw new NotFoundException('Гадны багш олдсонгүй');
    }
    if (
      user.externalTeacherProfile.verifiedAt ||
      !user.externalTeacherProfile.note?.startsWith(REJECTION_REASON_PREFIX)
    ) {
      throw new BadRequestException('Татгалзсан хүсэлт олдсонгүй');
    }

    const updated = await this.prisma.externalTeacherProfile.update({
      where: { userId },
      data: { note: null },
      select: { userId: true, note: true, verifiedAt: true },
    });

    return { userId: updated.userId, rejectionReason: null, verifiedAt: null };
  }

  /**
   * Баталгаажсан гадны багшийн жагсаалт. Нууц үг болон бусад хэрэглэгчийн
   * хувийн талбарыг сонголтоор буцаахгүй.
   */
  async getVerifiedTeachers() {
    const teachers = await this.prisma.user.findMany({
      where: {
        role: 'TEACHER',
        externalTeacherProfile: {
          verifiedAt: { not: null },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        externalTeacherProfile: {
          select: {
            organization: true,
            verifiedAt: true,
            note: true,
          },
        },
        _count: {
          select: { teacherGroups: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return teachers.map((teacher) => ({
      id: teacher.id,
      email: teacher.email,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      organization: teacher.externalTeacherProfile?.organization,
      verifiedAt: teacher.externalTeacherProfile?.verifiedAt,
      note: teacher.externalTeacherProfile?.note,
      groupCount: teacher._count.teacherGroups,
    }));
  }

  /** Баталгаажуулалтыг буцааж цуцалж, анхны тэмдэглэлийг хэвээр үлдээнэ. */
  async unverifyExternalTeacher(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        externalTeacherProfile: {
          select: {
            userId: true,
            organization: true,
            verifiedAt: true,
            note: true,
          },
        },
      },
    });

    if (!user?.externalTeacherProfile) {
      throw new NotFoundException('Гадны багш олдсонгүй');
    }
    if (!user.externalTeacherProfile.verifiedAt) {
      throw new BadRequestException('Энэ багш хараахан баталгаажаагүй');
    }

    const updated = await this.prisma.externalTeacherProfile.update({
      where: { userId },
      data: { verifiedAt: null, verifiedById: null },
      select: {
        userId: true,
        organization: true,
        verifiedAt: true,
        note: true,
      },
    });

    return {
      userId: updated.userId,
      organization: updated.organization,
      verifiedAt: updated.verifiedAt,
      note: updated.note,
    };
  }

  /**
   * Багш ангийн бүлэг үүсгэнэ. joinCode нь 6-8 тэмдэгт,
   * өнгийн үнэгүүд үл ойлгомжтой.
   */
  async createGroup(ownerId: string, dto: CreateTeacherGroupDto) {
    await this.verifiedOwner(ownerId);
    // Гадны багш байх эсэхийг шалгалт хийх
    const user = await this.prisma.user.findUnique({
      where: { id: ownerId },
      include: { externalTeacherProfile: true },
    });

    if (!user || !user.externalTeacherProfile) {
      throw new ForbiddenException('Зөвхөн гадны багш анги үүсгэх боломжтой');
    }

    if (!user.externalTeacherProfile.verifiedAt) {
      throw new ForbiddenException(
        'Админ баталгаажуулсан гадны багш л анги үүсгэх боломжтой',
      );
    }

    const joinCode = generateJoinCode();

    const group = await this.prisma.teacherGroup.create({
      data: {
        name: dto.name,
        ownerId,
        joinCode,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      id: group.id,
      name: group.name,
      joinCode: group.joinCode,
      ownerId: group.ownerId,
      createdAt: group.createdAt,
    };
  }

  /**
   * Сурагч кодоор ангид нэгдэнэ.
   * ХАЗААЛТ: Нэг сурагч олон бүлэгт байж болно.
   */
  async joinGroup(studentId: string, dto: JoinGroupDto) {
    const actor = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { role: true, archivedAt: true },
    });
    if (
      !actor ||
      actor.archivedAt ||
      ![Role.STUDENT, Role.BUYER].includes(actor.role as typeof Role.STUDENT)
    )
      throw new ForbiddenException(
        'Идэвхтэй сурагч эсвэл худалдан авагч шаардлагатай',
      );
    const group = await this.prisma.teacherGroup.findUnique({
      where: { joinCode: dto.joinCode },
      include: {
        owner: {
          select: {
            externalTeacherProfile: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Энэ кодтой ангийн бүлэг олдсонгүй');
    }

    if (group.archived) {
      throw new BadRequestException('Энэ ангийн бүлэг хаагдсан');
    }

    await this.verifiedOwner(group.ownerId);
    if (!group.owner.externalTeacherProfile?.verifiedAt) {
      throw new ForbiddenException(
        'Баталгаажаагүй багшийн бүлэгт нэгдэх боломжгүй',
      );
    }

    // Аль хэдийн нэгдсэн эсэхийг шалгалт хийх (нэг сурагч нэг бүлэгт нэгд дахин нэгдэж болохгүй)
    const existing = await this.prisma.teacherGroupMember.findUnique({
      where: {
        groupId_studentId: {
          groupId: group.id,
          studentId,
        },
      },
    });

    if (existing && !existing.leftAt) {
      throw new BadRequestException(
        'Та аль хэдийн энэ ангийн бүлэгт байгаа байна',
      );
    }

    // Хэрэв урьд нь байсан ч гарсан бол шинэ нэгдэлт үүсгэ
    const member = await this.prisma.teacherGroupMember.upsert({
      where: { groupId_studentId: { groupId: group.id, studentId } },
      create: { groupId: group.id, studentId },
      update: { leftAt: null, joinedAt: new Date() },
    });
    if (existing && this.audit)
      await this.audit.record({
        actorId: studentId,
        actorRole: actor.role,
        action: 'REJOIN',
        entity: 'TeacherGroupMember',
        entityId: member.id,
        before: { joinedAt: existing.joinedAt, leftAt: existing.leftAt },
        after: { joinedAt: member.joinedAt, leftAt: member.leftAt },
      });

    return {
      id: member.id,
      groupId: member.groupId,
      studentId: member.studentId,
      joinedAt: member.joinedAt,
    };
  }

  /**
   * Багшийн бүлгүүдийг авах (өөрийн л).
   */
  async getMyGroups(ownerId: string) {
    await this.verifiedOwner(ownerId);
    const groups = await this.prisma.teacherGroup.findMany({
      where: {
        ownerId,
        archived: false,
      },
      include: {
        members: {
          where: { leftAt: null },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      joinCode: g.joinCode,
      memberCount: g.members.length,
      createdAt: g.createdAt,
    }));
  }

  /**
   * Бүлгийн дэлгэрэнгүй (сурагч, шалгалтын дүн).
   * ХЯЗГААРЛАЛТ: Баталгаажсан гадны багш л өөрийн бүлгийг харах.
   * Дүнгүүд ЗӨВХӨН сурагч нэгдсэнээс хойшхи (joinedAt дараа) цаг хүрэх.
   */
  async getGroupDetails(groupId: string, requesterId: string) {
    await this.verifiedOwner(requesterId);
    const group = await this.prisma.teacherGroup.findUnique({
      where: { id: groupId },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        members: {
          where: { leftAt: null },
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Бүлэг олдсонгүй');
    }

    // Баталгаажуулалт: зөвхөн өөрийн бүлгүүдийг харах
    if (group.archived || group.ownerId !== requesterId) {
      throw new ForbiddenException('Энэ бүлгийн мэдээлэл харах эрхгүй');
    }

    // Сурагч тус бүрийн TestResult-үүдийг авах
    // ХЯЗГААРЛАЛТ: ЗӨВХӨН joinedAt цагаас хойш
    const membersWithResults = await Promise.all(
      group.members.map(async (member) => {
        const purchases = await this.prisma.purchase.findMany({
          where: {
            ...activePurchaseWhere(member.studentId),
            productItem: { kind: 'TEST', active: true },
          },
          select: {
            grantedAt: true,
            expiresAt: true,
            productItem: { select: { refId: true } },
          },
        });
        const results = await this.prisma.testResult.findMany({
          where: {
            studentId: member.studentId,
            createdAt: { gte: member.joinedAt },
            source: { in: ['ONLINE_TEST', 'CHAPTER_EXAM', 'OMR_IMPORT', 'MANUAL_ENTRY'] },
            test: {
              isDraft: false,
              deletedAt: null,
              access: { none: {} },
              OR: [
                { createdById: requesterId },
                { id: { in: purchases.map((p) => p.productItem.refId) } },
              ],
            },
          },
          include: {
            test: {
              select: {
                id: true,
                title: true,
                type: true,
                createdById: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10, // Хамгийн сүүлийн 10
        });

        return {
          id: member.id,
          student: member.student,
          joinedAt: member.joinedAt,
          testResults: results
            .filter(
              (r) =>
                r.test.createdById === requesterId ||
                purchases.some(
                  (p) =>
                    p.productItem.refId === r.testId &&
                    p.grantedAt &&
                    p.grantedAt <= r.createdAt &&
                    (!p.expiresAt || p.expiresAt > r.createdAt),
                ),
            )
            .map((r) => ({
              id: r.id,
              testId: r.testId,
              testTitle: r.test.title,
              testType: r.test.type,
              totalScore: r.totalScore,
              maxScore: r.maxScore,
              percentage:
                r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : null,
              createdAt: r.createdAt,
            })),
        };
      }),
    );

    return {
      id: group.id,
      name: group.name,
      joinCode: group.joinCode,
      owner: group.owner,
      members: membersWithResults,
      createdAt: group.createdAt,
    };
  }

  /**
   * Бүлгийг архив хийх (устгахгүй, зөөлөн).
   */
  async archiveGroup(groupId: string, requesterId: string) {
    await this.verifiedOwner(requesterId);
    const group = await this.prisma.teacherGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Бүлэг олдсонгүй');
    }

    if (group.archived || group.ownerId !== requesterId) {
      throw new ForbiddenException('Энэ бүлгийг архив хийх эрхгүй');
    }

    const updated = await this.prisma.teacherGroup.update({
      where: { id: groupId },
      data: { archived: true },
    });

    return {
      id: updated.id,
      archived: updated.archived,
    };
  }

  /**
   * Сурагчийг бүлгээс хасах (leftAt бөглөх).
   */
  async removeStudentFromGroup(
    groupId: string,
    studentId: string,
    requesterId: string,
  ) {
    await this.verifiedOwner(requesterId);
    const group = await this.prisma.teacherGroup.findUnique({
      where: { id: groupId },
    });

    if (!group || group.archived || group.ownerId !== requesterId) {
      throw new ForbiddenException('Энэ үйлдэл хийх эрхгүй');
    }

    const member = await this.prisma.teacherGroupMember.findUnique({
      where: {
        groupId_studentId: { groupId, studentId },
      },
    });

    if (!member) {
      throw new NotFoundException('Сурагч энэ бүлэгт байхгүй');
    }

    const updated = await this.prisma.teacherGroupMember.update({
      where: { id: member.id },
      data: { leftAt: new Date() },
    });

    return {
      id: updated.id,
      leftAt: updated.leftAt,
    };
  }
}

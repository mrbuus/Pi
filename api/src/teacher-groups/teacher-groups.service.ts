import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherGroupDto } from './dto/create-teacher-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { RegisterExternalTeacherDto } from './dto/register-external-teacher.dto';
import { VerifyExternalTeacherDto } from './dto/verify-external-teacher.dto';

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
  constructor(private prisma: PrismaService) {}

  /**
   * Гадны багш бүртгүүлэх. Анх verifiedAt = null, админ баталгаажуулах хүртэл
   * сурагчийн мэдээлэл харахгүй.
   */
  async registerExternalTeacher(
    dto: RegisterExternalTeacherDto,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Энэ имэйл аль хэдийн бүртгэлтэй');
    }

    // Password hash: auth.service-т ашигласан функцыг ашигла
    const bcrypt = require('bcrypt');
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
            verifiedAt: null,
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
    }));
  }

  /**
   * Багш ангийн бүлэг үүсгэнэ. joinCode нь 6-8 тэмдэгт,
   * өнгийн үнэгүүд үл ойлгомжтой.
   */
  async createGroup(ownerId: string, dto: CreateTeacherGroupDto) {
    // Гадны багш байх эсэхийг шалгалт хийх
    const user = await this.prisma.user.findUnique({
      where: { id: ownerId },
      include: { externalTeacherProfile: true },
    });

    if (!user || !user.externalTeacherProfile) {
      throw new ForbiddenException(
        'Зөвхөн гадны багш анги үүсгэх боломжтой',
      );
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
    const member = await this.prisma.teacherGroupMember.create({
      data: {
        groupId: group.id,
        studentId,
      },
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
                email: true,
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
    if (group.ownerId !== requesterId) {
      throw new ForbiddenException('Энэ бүлгийн мэдээлэл харах эрхгүй');
    }

    // Сурагч тус бүрийн TestResult-үүдийг авах
    // ХЯЗГААРЛАЛТ: ЗӨВХӨН joinedAt цагаас хойш
    const membersWithResults = await Promise.all(
      group.members.map(async (member) => {
        const results = await this.prisma.testResult.findMany({
          where: {
            studentId: member.studentId,
            createdAt: { gte: member.joinedAt },
          },
          include: {
            test: {
              select: {
                id: true,
                title: true,
                type: true,
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
          testResults: results.map((r) => ({
            id: r.id,
            testId: r.testId,
            testTitle: r.test.title,
            testType: r.test.type,
            totalScore: r.totalScore,
            maxScore: r.maxScore,
            percentage: (r.totalScore / r.maxScore) * 100,
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
    const group = await this.prisma.teacherGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Бүлэг олдсонгүй');
    }

    if (group.ownerId !== requesterId) {
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
    const group = await this.prisma.teacherGroup.findUnique({
      where: { id: groupId },
    });

    if (!group || group.ownerId !== requesterId) {
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

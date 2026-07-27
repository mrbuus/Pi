import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

// Сурагчийн зорилгын төлөвлөгч (StudentGoal) — багшийн жилийн төлөвлөгчтэй
// (StaffTask, tasks/ модуль) ижил санааны сурагчийн хувилбар: жижиг, өөрөө
// удирдах зорилго, зорилтот огноотой, төлөвөө өөрчилж болно.
// ⚠️ Энд БҮГД studentId-гаараа шүүгдэнэ — сурагч бусдын зорилгыг ХАРАХ Ч
// БОЛОХГҮЙ (controller эрхийн шалгалт JWT-с studentId авдгаас гадна энд ч
// давхар баталгаажуулж байна).
@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  create(studentId: string, dto: CreateGoalDto) {
    return this.prisma.studentGoal.create({
      data: {
        studentId,
        title: dto.title,
        description: dto.description,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        status: dto.status,
        subject: dto.subject,
      },
    });
  }

  findAllForStudent(studentId: string) {
    return this.prisma.studentGoal.findMany({
      where: { studentId },
      orderBy: [{ status: 'asc' }, { targetDate: 'asc' }],
    });
  }

  // Өмчлөлийг баталгаажуулаад буцаана — олдохгүй/бусдынх бол NotFoundException
  // (өөр хэрэглэгчийн зорилго байгаа эсэхийг ч илчлэхгүй байхын тулд 403 биш 404).
  private async findOwnedOrThrow(id: string, studentId: string) {
    const goal = await this.prisma.studentGoal.findUnique({ where: { id } });
    if (!goal || goal.studentId !== studentId) {
      throw new NotFoundException('Зорилго олдсонгүй');
    }
    return goal;
  }

  async update(id: string, studentId: string, dto: UpdateGoalDto) {
    await this.findOwnedOrThrow(id, studentId);
    return this.prisma.studentGoal.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        targetDate:
          dto.targetDate === undefined
            ? undefined
            : dto.targetDate === null
              ? null
              : new Date(dto.targetDate),
        status: dto.status,
        subject: dto.subject,
      },
    });
  }

  async remove(id: string, studentId: string) {
    await this.findOwnedOrThrow(id, studentId);
    await this.prisma.studentGoal.delete({ where: { id } });
    return { ok: true };
  }
}

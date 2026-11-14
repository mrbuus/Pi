import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WeeklyGoalView {
  daysPerWeek: number | null;
  updatedAt: Date | null;
}

/** Сурагчийн өөрийн 7 хоногийн зорилго. Арилгах нь зөөлөн (deletedAt) — мөр устгахгүй. */
@Injectable()
export class WeeklyGoalService {
  constructor(private readonly prisma: PrismaService) {}

  async get(studentId: string): Promise<WeeklyGoalView> {
    const row = await this.prisma.studyWeeklyGoal.findUnique({
      where: { studentId },
      select: { daysPerWeek: true, deletedAt: true, updatedAt: true },
    });
    if (!row || row.deletedAt) return { daysPerWeek: null, updatedAt: row?.updatedAt ?? null };
    return { daysPerWeek: row.daysPerWeek, updatedAt: row.updatedAt };
  }

  async set(studentId: string, daysPerWeek: number | null): Promise<WeeklyGoalView> {
    if (daysPerWeek === null) {
      await this.prisma.studyWeeklyGoal.updateMany({
        where: { studentId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return this.get(studentId);
    }
    const row = await this.prisma.studyWeeklyGoal.upsert({
      where: { studentId },
      create: { studentId, daysPerWeek },
      update: { daysPerWeek, deletedAt: null },
      select: { daysPerWeek: true, updatedAt: true },
    });
    return { daysPerWeek: row.daysPerWeek, updatedAt: row.updatedAt };
  }
}

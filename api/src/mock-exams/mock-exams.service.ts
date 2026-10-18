import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttemptSessionStatus, TestGradingMode, TestType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMockExamDto, UpdateMockExamDto } from './mock-exams.dto';

// Долоо хоног бүрийн онлайн жишиг сорил. Нийтэд: цаг, бодлогын тоо, бүртгэлийн
// тоо. Нэвтэрсэн STUDENT/BUYER бүртгүүлнэ; цонхны дотор tests.service-ийн
// assertStudentAccess бүртгэлийг эрх гэж үзнэ. Тестийн id нийтийн хариунд ОРОХГҮЙ.

export type EventPhase = 'upcoming' | 'live' | 'done';
export function phaseOf(ev: { startsAt: Date; endsAt: Date }, now = new Date()): EventPhase {
  if (now < ev.startsAt) return 'upcoming';
  if (now <= ev.endsAt) return 'live';
  return 'done';
}

/** Дүн энэ үйл явдлынх мөн эсэх: эхэлснээс хойш, цонх + шалгалтын хугацаа + 1 цаг дотор */
export function resultWindow(ev: { startsAt: Date; endsAt: Date }, timeLimitMin: number | null) {
  return { gte: ev.startsAt, lte: new Date(ev.endsAt.getTime() + ((timeLimitMin ?? 120) + 60) * 60_000) };
}

const EVENT_SELECT = {
  id: true, title: true, startsAt: true, endsAt: true, note: true, published: true, testId: true, createdAt: true,
  test: { select: { id: true, title: true, timeLimitMin: true, type: true, _count: { select: { problems: true } } } },
  _count: { select: { registrations: true } },
} as const;
type EventRow = { id: string; title: string; startsAt: Date; endsAt: Date; note: string | null; published: boolean; testId: string; createdAt: Date; test: { id: string; title: string; timeLimitMin: number | null; type: TestType; _count: { problems: number } }; _count: { registrations: number } };

const toPublic = (e: EventRow, now: Date) => ({
  id: e.id, title: e.title, startsAt: e.startsAt, endsAt: e.endsAt, note: e.note,
  timeLimitMin: e.test.timeLimitMin, problemCount: e.test._count.problems, registered: e._count.registrations,
  phase: phaseOf(e, now),
});

@Injectable()
export class MockExamsService {
  constructor(private prisma: PrismaService) {}

  async publicList() {
    const now = new Date();
    const events = (await this.prisma.mockExamEvent.findMany({
      where: { published: true, endsAt: { gte: new Date(now.getTime() - 60 * 86_400_000) } },
      select: EVENT_SELECT,
      orderBy: { startsAt: 'asc' },
    })) as EventRow[];
    const live = events.find((e) => phaseOf(e, now) === 'live') ?? null;
    const upcoming = events.filter((e) => phaseOf(e, now) === 'upcoming').slice(0, 4);
    const done = events.filter((e) => phaseOf(e, now) === 'done');
    const lastEv = done[done.length - 1] ?? null;
    let last: { title: string; startsAt: Date; participants: number; avgPct: number | null } | null = null;
    if (lastEv) {
      const agg = await this.prisma.testResult.aggregate({
        where: { testId: lastEv.testId, createdAt: resultWindow(lastEv, lastEv.test.timeLimitMin) },
        _count: { _all: true }, _avg: { totalScore: true, maxScore: true },
      });
      const avg = agg._avg.totalScore, mx = agg._avg.maxScore;
      last = { title: lastEv.title, startsAt: lastEv.startsAt, participants: agg._count._all, avgPct: avg != null && mx ? Math.round((avg / mx) * 100) : null };
    }
    return { live: live ? toPublic(live, now) : null, next: upcoming[0] ? toPublic(upcoming[0], now) : null, upcoming: upcoming.map((e) => toPublic(e, now)), last };
  }

  /** Нэвтэрсэн хэрэглэгчийн бүртгэлүүд ба явц (эндээс л testId очно) */
  async my(userId: string) {
    const regs = await this.prisma.mockExamRegistration.findMany({
      where: { userId, event: { published: true } },
      select: { eventId: true, event: { select: { testId: true, startsAt: true, endsAt: true } } },
    });
    if (!regs.length) return { registrations: [] };
    const testIds = [...new Set(regs.map((r) => r.event.testId))];
    const [sessions, results] = await Promise.all([
      this.prisma.testAttemptSession.findMany({ where: { studentId: userId, testId: { in: testIds } }, select: { testId: true, status: true } }),
      this.prisma.testResult.findMany({ where: { studentId: userId, testId: { in: testIds } }, select: { testId: true, totalScore: true, maxScore: true } }),
    ]);
    return {
      registrations: regs.map((r) => {
        const res = results.find((x) => x.testId === r.event.testId);
        const ses = sessions.find((x) => x.testId === r.event.testId);
        const status = res ? 'SUBMITTED' : ses?.status === AttemptSessionStatus.IN_PROGRESS ? 'IN_PROGRESS' : ses ? 'SUBMITTED' : 'NOT_STARTED';
        return { eventId: r.eventId, testId: r.event.testId, status, score: res?.totalScore ?? null, max: res?.maxScore ?? null };
      }),
    };
  }

  async register(eventId: string, userId: string) {
    const ev = await this.prisma.mockExamEvent.findUnique({ where: { id: eventId }, select: { published: true, endsAt: true } });
    if (!ev || !ev.published) throw new NotFoundException('Сорил олдсонгүй');
    if (ev.endsAt < new Date()) throw new GoneException('Энэ сорилын бүртгэл хаагдсан');
    await this.prisma.mockExamRegistration.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: {},
      create: { eventId, userId },
    });
    const registered = await this.prisma.mockExamRegistration.count({ where: { eventId } });
    return { registered: true, count: registered };
  }

  async unregister(eventId: string, userId: string) {
    const ev = await this.prisma.mockExamEvent.findUnique({ where: { id: eventId }, select: { startsAt: true } });
    if (!ev) throw new NotFoundException('Сорил олдсонгүй');
    if (ev.startsAt <= new Date()) throw new ConflictException('Эхэлсэн сорилын бүртгэлийг цуцлах боломжгүй');
    await this.prisma.mockExamRegistration.deleteMany({ where: { eventId, userId } });
    return { registered: false };
  }

  // ---- Удирдлага ----
  async adminList() {
    const now = new Date();
    const events = (await this.prisma.mockExamEvent.findMany({ select: EVENT_SELECT, orderBy: { startsAt: 'desc' }, take: 100 })) as EventRow[];
    const counts = await Promise.all(
      events.map((e) => this.prisma.testResult.count({ where: { testId: e.testId, createdAt: resultWindow(e, e.test.timeLimitMin) } })),
    );
    return events.map((e, i) => ({ ...toPublic(e, now), published: e.published, test: { id: e.test.id, title: e.test.title, type: e.test.type }, results: counts[i] }));
  }

  /** Сорилд тохирох тестүүд: автомат дүнтэй, ноорог биш, бодлоготой */
  async pickableTests() {
    const rows = await this.prisma.test.findMany({
      where: { deletedAt: null, isDraft: false, gradingMode: TestGradingMode.AUTO, type: { in: [TestType.EESH_MOCK, TestType.THOUSAND, TestType.CUSTOM] }, problems: { some: {} } },
      select: { id: true, title: true, type: true, timeLimitMin: true, _count: { select: { problems: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((t) => ({ id: t.id, title: t.title, type: t.type, timeLimitMin: t.timeLimitMin, problemCount: t._count.problems }));
  }

  private async assertTest(testId: string) {
    const t = await this.prisma.test.findFirst({ where: { id: testId, deletedAt: null, isDraft: false, gradingMode: TestGradingMode.AUTO }, select: { id: true, timeLimitMin: true, _count: { select: { problems: true } } } });
    if (!t) throw new BadRequestException('Тест олдсонгүй эсвэл автомат дүнгүй');
    if (!t._count.problems) throw new BadRequestException('Энэ тестэд бодлого алга');
    if (!t.timeLimitMin) throw new BadRequestException('Сорилын тест хугацаатай байх ёстой (timeLimitMin)');
    return t;
  }

  async create(dto: CreateMockExamDto, userId: string) {
    await this.assertTest(dto.testId);
    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('Огноо буруу');
    const endsAt = new Date(startsAt.getTime() + (dto.lateMin ?? 30) * 60_000);
    return this.prisma.mockExamEvent.create({
      data: { title: dto.title, testId: dto.testId, startsAt, endsAt, note: dto.note ?? null, published: dto.published ?? true, createdById: userId },
      select: { id: true },
    });
  }

  async update(id: string, dto: UpdateMockExamDto) {
    const ev = await this.prisma.mockExamEvent.findUnique({ where: { id }, select: { startsAt: true, endsAt: true } });
    if (!ev) throw new NotFoundException('Сорил олдсонгүй');
    if (dto.testId) await this.assertTest(dto.testId);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : ev.startsAt;
    if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('Огноо буруу');
    const lateMin = dto.lateMin ?? Math.round((ev.endsAt.getTime() - ev.startsAt.getTime()) / 60_000);
    return this.prisma.mockExamEvent.update({
      where: { id },
      data: { title: dto.title, testId: dto.testId, startsAt, endsAt: new Date(startsAt.getTime() + lateMin * 60_000), note: dto.note, published: dto.published },
      select: { id: true },
    });
  }

  async remove(id: string) {
    const ev = await this.prisma.mockExamEvent.findUnique({ where: { id }, select: { startsAt: true, _count: { select: { registrations: true } } } });
    if (!ev) throw new NotFoundException('Сорил олдсонгүй');
    if (ev.startsAt <= new Date() && ev._count.registrations > 0) throw new ConflictException('Эхэлсэн, бүртгэлтэй сорилыг устгахгүй — нийтлэлийг нь хаа');
    await this.prisma.mockExamEvent.delete({ where: { id } });
    return { ok: true };
  }

  async registrations(eventId: string) {
    const ev = await this.prisma.mockExamEvent.findUnique({ where: { id: eventId }, select: { testId: true } });
    if (!ev) throw new NotFoundException('Сорил олдсонгүй');
    const regs = await this.prisma.mockExamRegistration.findMany({
      where: { eventId },
      select: { createdAt: true, user: { select: { id: true, firstName: true, lastName: true, phone: true, role: true, studentCode: true, studentProfile: { select: { school: true, grade: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    const ids = regs.map((r) => r.user.id);
    const [sessions, results] = await Promise.all([
      this.prisma.testAttemptSession.findMany({ where: { testId: ev.testId, studentId: { in: ids } }, select: { studentId: true, status: true, startedAt: true } }),
      this.prisma.testResult.findMany({ where: { testId: ev.testId, studentId: { in: ids } }, select: { studentId: true, totalScore: true, maxScore: true } }),
    ]);
    return regs.map((r) => {
      const res = results.find((x) => x.studentId === r.user.id), ses = sessions.find((x) => x.studentId === r.user.id);
      return {
        ...r.user, registeredAt: r.createdAt,
        status: res ? 'SUBMITTED' : ses?.status === AttemptSessionStatus.IN_PROGRESS ? 'IN_PROGRESS' : ses ? 'SUBMITTED' : 'NOT_STARTED',
        score: res?.totalScore ?? null, max: res?.maxScore ?? null, startedAt: ses?.startedAt ?? null,
      };
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  recommend,
  buildTopicStates,
  type AttemptSignal,
  type CandidateProblem,
  type Recommendation,
} from './scheduler';

@Injectable()
export class RecommendService {
  constructor(private prisma: PrismaService) {}

  /**
   * Сурагчийн ДАРААГИЙН бодлогуудыг санал болгоно.
   *
   * ЛОГИК:
   * 1. Сурагчийн нэвтэрсэн эсэх, сургууль идэвхтэй эсэх шалгана
   * 2. Сурагчийн өмнөх оролдлогуудыг AttemptSignal болгоно
   * 3. Сурагчийн программын (класс/анги) бодлогуудыг УРЬДЧИЛЖ хязгаарлана
   *    (6125 БҮХ-г гарах биш)
   * 4. Бодлогуудыг CandidateProblem болгоно (difficulty = 1 - correctRate)
   * 5. scheduler.recommend() дуудна
   *
   * PERFORMANCE ГҮЙЦЭТГЭЛ:
   * - Бодлогуудыг урьдчилж хязгаарлана:
   *   * Сурагчийн сүүлийн үзсэн сэдвүүд (Chapter-нууд)
   *   * + шинэ, давтан сэргээх сэдвүүд
   *   * Хэром 100-200 бодлого таран хайна, БҮХ 6125 БИШ
   *
   * topicId = Problem.chapterId
   * (Tag-уудээр үзэхээ хойшлуулж байна — хөтөлбөр дотор олон сэдэв байх үед)
   */
  async getNextProblems(
    studentId: string,
    limit: number = 10,
  ): Promise<Recommendation[]> {
    // 1. Сурагч идэвхтэй ангид байгаа эсэх
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, leftAt: null },
      select: {
        id: true,
        classroomId: true,
      },
    });
    if (!enrollment) {
      throw new NotFoundException('Та идэвхтэй ангид бүртгэлгүй байна');
    }

    const now = Date.now();

    // 2. Сурагчийн өмнөх оролдлогуудыг уншина
    const attemptRows = await this.prisma.attempt.findMany({
      where: { studentId, problem: { deletedAt: null } },
      select: {
        problemId: true,
        problem: { select: { chapterId: true } },
        autoCorrect: true,
        selfState: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // AttemptSignal болгоно (correct = зөв бодсон эсэх)
    const history: AttemptSignal[] = attemptRows.map((row) => {
      const selfState = row.selfState;
      // Өөрийн тэмдэглэгээ эсвэл автоматаар үнэлэгдсэн
      const isCorrect = this.isSuccess(selfState, row.autoCorrect);
      return {
        problemId: row.problemId,
        topicId: row.problem.chapterId,
        correct: isCorrect,
        at: row.createdAt.getTime(),
      };
    });

    // 3. ГҮЙЦЭТГЭЛ ОНОВЧ: сурагчийн сүүлийн үзсэн сэдвүүдээр (Chapter) уншина
    //
    // ⚠️ ХЯЗГААРЛАЛТ: сүүлийн үзсэн Chapter ID-уудаас л бодлого авна.
    // Сурагч урд нь оролдоогүй сэдвүүдийн санал (NEW_TOPIC)-ыг l scheduler
    // үүдүүлэхгүй, оролдолгүй бүхэл бодлого үзүүлнэ.
    //
    // ТАТСАН МӨРИЙН ТООГООР:
    // - history дээр бүх Chapter-нууд + шинэ 2-3 Chapter нэмнэ
    // - дэлгүүрийн: 200-400 бодлого (Chapter 5-10-т ≈ 50 бодлого/Chapter)

    const topicIds = new Set(history.map((h) => h.topicId));
    // Сүүлийн үзсэн сэдвүүдэд нэмээд шинэ ойролцоо сэдвүүдийг давхардаггүй
    // (анги/программ хүлээхэ байхгүй учир асуудал үүсэхгүй)

    const problems = await this.prisma.problem.findMany({
      where: {
        deletedAt: null,
        chapterId: {
          in: Array.from(topicIds), // Сүүлийн үзсэн Chapter-уудын бодлогуудыг л авна
        },
      },
      select: {
        id: true,
        chapterId: true,
        attemptCount: true,
        correctRate: true,
      },
      take: 400, // ГҮЙЦЭТГЭЛ: 200-400 мөр (нормаль хүлээх)
    });

    // Санах ой хусагдалтын харьцуулалт: N бодлого, M=200 сонголт таран хайна
    const seen = new Set(history.map((h) => h.problemId));
    const candidates: CandidateProblem[] = problems
      .filter((p) => !seen.has(p.id))
      .map((p) => ({
        id: p.id,
        topicId: p.chapterId,
        // difficulty = 1 - correctRate (0 = амархан, 1 = хэцүү)
        difficulty: p.correctRate ? 1 - p.correctRate : 0.5,
        attemptCount: p.attemptCount,
      }));

    // 4. Санал болгоно
    const recommended = recommend(history, candidates, {
      now,
      limit,
      maxConsecutiveSameTopic: 1,
      sameProblemOk: false,
    });

    return recommended;
  }

  /**
   * Бодлого бодсоны дараа Attempt үүсгэх.
   *
   * ⚠️ givenAnswer-ыг ЗААВАЛ бөглөнө (шинэ талбар, ML-д үнэ цэнэтэй дохио)
   * - CHOICE: сонголтын ИНДЕКС (эсвэл TEXT нэрлэсэн сонголтыг)
   * - NUMBER: тоон хариу (число)
   * - OPEN: сурагчийн хэрхүүчээсэн бичвэр
   * - MARKDOWN: Markdown текст (орсон TeX томьёо)
   */
  async createAttempt(
    studentId: string,
    problemId: string,
    givenAnswer: any,
    autoCorrect?: boolean,
    selfState?: string,
  ) {
    // Сурагч болон бодлогыг шалгана
    const [student, problem, enrollment] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true },
      }),
      this.prisma.problem.findUnique({
        where: { id: problemId },
        select: { id: true },
      }),
      this.prisma.enrollment.findFirst({
        where: { studentId, leftAt: null },
        select: { classroomId: true },
      }),
    ]);

    if (!student) throw new NotFoundException('Сурагч олдсонгүй');
    if (!problem) throw new NotFoundException('Бодлого олдсонгүй');
    if (!enrollment) throw new NotFoundException('Та идэвхтэй ангид бүртгэлгүй');

    // Attempt үүсгэнэ (source = ONLINE_TEST — вэб дээр оролдсон)
    await this.prisma.attempt.create({
      data: {
        studentId,
        problemId,
        source: 'ONLINE_TEST',
        occurredOn: new Date(),
        autoCorrect,
        selfState: selfState as any,
        givenAnswer,
        classroomId: enrollment.classroomId,
      },
    });
  }

  /** Бодлого амжилттай эсэх (нэгдүүлэлт) */
  private isSuccess(
    selfState: string | null,
    autoCorrect: boolean | null,
  ): boolean {
    if (!selfState && autoCorrect === null) return false;
    if (selfState === 'SOLVED_CLEAN') return true;
    if (selfState === 'FIXED_AFTER_ERROR') return true;
    if (selfState === 'GUESSED') return false;
    if (selfState === 'FAILED') return false;
    return autoCorrect === true;
  }
}

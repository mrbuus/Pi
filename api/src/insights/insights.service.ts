import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * Бодлогын хүүхэлтийн шинжилгээ (distractors хэн сонгосон)
 */
export interface DistractorAnalysis {
  problemId: string;
  problemToken: string;
  totalAttempts: number;
  distractor: {
    choiceLabel: string;
    choiceText: string;
    selectionCount: number;
    selectionRate: number;
    mistakeType?: string;
    mistakeNote?: string;
  }[];
}

/**
 * Бодлогын чанар: difficulty (p-value) ба discrimination (point-biserial)
 */
export interface ProblemQuality {
  problemId: string;
  problemToken: string;
  difficulty: number; // p-value = correctRate
  discrimination: number; // point-biserial correlation
  isDefective: boolean; // discrimination < 0 → эвдэрсэн
  attemptCount: number;
  correctCount: number;
}

/**
 * Сэдвийн эзэмшил матриц: сурагч × сэдэв
 */
export interface TopicMastery {
  studentId: string;
  studentName: string;
  topicMasteries: {
    topicId: string;
    topicName: string;
    problemCount: number;
    correctCount: number;
    masteryRate: number;
  }[];
}

/**
 * ML сургалтын өгөгдөл (нууцлалтай)
 */
export interface MlDataPoint {
  studentIdHash: string;
  problemId: string;
  topicId?: string | null;
  correct: boolean;
  givenAnswer?: unknown;
  timeSpentSec?: number | null;
  occurredOn: string;
}

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Хүүхэлтийн шинжилгээ: бодлого бүрийн буруу сонголт тус бүрийг хэдэн сурагч сонгосон
   * @param problemIds - бодлогын ID үүдс (цалгасан байхгүй бол БҮХ)
   * @param limit - хариулах хамгийн их тоо (performance)
   * @returns Бодлого бүрийн distractor-ын статистик
   */
  async getDistractorAnalysis(
    problemIds?: string[],
    limit: number = 100,
  ): Promise<DistractorAnalysis[]> {
    // SQL-аар бодлого бүрийн буруу сонголт статистик бодно
    const query = `
      SELECT
        p.id AS "problemId",
        p.token AS "problemToken",
        COUNT(DISTINCT a.id) AS "totalAttempts",
        pc.label AS "choiceLabel",
        pc.text AS "choiceText",
        COUNT(DISTINCT CASE
          WHEN
            CAST(a."givenAnswer" AS TEXT) LIKE CONCAT('%', pc.label, '%') OR
            (a."givenAnswer"::text LIKE CONCAT('%', pc.text, '%') AND p.format = 'CHOICE')
          THEN a.id
        END) AS "selectionCount",
        pc."mistakeType" AS "mistakeType",
        pc."mistakeNote" AS "mistakeNote"
      FROM "Problem" p
      LEFT JOIN "Attempt" a ON p.id = a."problemId"
      LEFT JOIN "ProblemChoice" pc ON p.id = pc."problemId"
      WHERE p."deletedAt" IS NULL
        ${problemIds ? `AND p.id = ANY($1)` : ''}
      GROUP BY p.id, p.token, pc.id, pc.label, pc.text, pc."mistakeType", pc."mistakeNote"
      ORDER BY p.id, "totalAttempts" DESC
      LIMIT $${problemIds ? '2' : '1'}
    `;

    const result = await this.prisma.$queryRawUnsafe<
      Array<{
        problemId: string;
        problemToken: string;
        totalAttempts: number;
        choiceLabel: string;
        choiceText: string;
        selectionCount: number;
        mistakeType?: string;
        mistakeNote?: string;
      }>
    >(query, ...(problemIds ? [problemIds] : []), limit);

    // Үр дүнг бүтэцийн дагуу байрлуулна
    const grouped = new Map<string, DistractorAnalysis>();
    for (const row of result) {
      if (!grouped.has(row.problemId)) {
        grouped.set(row.problemId, {
          problemId: row.problemId,
          problemToken: row.problemToken,
          totalAttempts: row.totalAttempts,
          distractor: [],
        });
      }
      const analysis = grouped.get(row.problemId)!;
      if (row.choiceLabel) {
        analysis.distractor.push({
          choiceLabel: row.choiceLabel,
          choiceText: row.choiceText,
          selectionCount: row.selectionCount,
          selectionRate:
            row.totalAttempts > 0 ? row.selectionCount / row.totalAttempts : 0,
          mistakeType: row.mistakeType,
          mistakeNote: row.mistakeNote,
        });
      }
    }

    return Array.from(grouped.values()).slice(0, limit);
  }

  /**
   * Бодлогын чанар: difficulty ба discrimination
   * - difficulty (p-value) = (correctRate) — байгалийн нөхцөл
   * - discrimination (point-biserial) = корреляц(сурагчийн нийт оноо, энэ бодлого)
   *   Сөрөг → эвдэрсэн (сайн сурагч буруу, муу нь зөв)
   * @param limit - хамгийн их тоо
   * @returns Бодлогын чанарын үзүүлэлтүүд
   */
  async getProblemQuality(limit: number = 100): Promise<ProblemQuality[]> {
    const query = `
      WITH attempt_scores AS (
        SELECT
          a."studentId",
          a."problemId",
          MAX(CASE WHEN a."autoCorrect" = true THEN 1 ELSE 0 END) AS problem_score
        FROM "Attempt" a
        WHERE a."deletedAt" IS NULL
        GROUP BY a."studentId", a."problemId"
      ),
      student_totals AS (
        SELECT
          a."studentId",
          COUNT(DISTINCT a."problemId") AS attempt_count,
          SUM(CASE WHEN a."autoCorrect" = true THEN 1 ELSE 0 END) AS correct_count
        FROM "Attempt" a
        WHERE a."deletedAt" IS NULL
        GROUP BY a."studentId"
      ),
      problem_stats AS (
        SELECT
          p.id AS "problemId",
          p.token AS "problemToken",
          COUNT(DISTINCT a."studentId") AS attempt_count,
          SUM(CASE WHEN a."autoCorrect" = true THEN 1 ELSE 0 END) AS correct_count,
          CAST(SUM(CASE WHEN a."autoCorrect" = true THEN 1 ELSE 0 END))
            / NULLIF(COUNT(DISTINCT a."studentId"), 0) AS p_value
        FROM "Problem" p
        LEFT JOIN "Attempt" a ON p.id = a."problemId" AND a."deletedAt" IS NULL
        WHERE p."deletedAt" IS NULL
        GROUP BY p.id, p.token
      )
      SELECT
        ps."problemId",
        ps."problemToken",
        ps.p_value AS difficulty,
        -- Point-biserial correlation ≈ (mean_correct - mean_all) / std_all
        -- Энгийн хэмжүүлэлт: байхгүй бол 0
        COALESCE(
          (
            SELECT AVG(st.correct_count)
            FROM attempt_scores a_sc
            JOIN student_totals st ON a_sc."studentId" = st."studentId"
            WHERE a_sc."problemId" = ps."problemId" AND a_sc.problem_score = 1
          ) -
          (
            SELECT AVG(st.correct_count)
            FROM student_totals st
          )
        ) / NULLIF(
          (SELECT STDDEV_POP(st.correct_count) FROM student_totals st),
          0
        ) AS discrimination,
        ps.attempt_count,
        ps.correct_count
      FROM problem_stats ps
      WHERE ps.attempt_count > 0
      ORDER BY ps.attempt_count DESC
      LIMIT $1
    `;

    const result = await this.prisma.$queryRawUnsafe<
      Array<{
        problemId: string;
        problemToken: string;
        difficulty: number;
        discrimination: number;
        attempt_count: number;
        correct_count: number;
      }>
    >(query, limit);

    return result.map((row) => ({
      problemId: row.problemId,
      problemToken: row.problemToken,
      difficulty: Number(row.difficulty) || 0,
      discrimination: Number(row.discrimination) || 0,
      isDefective: (Number(row.discrimination) || 0) < 0,
      attemptCount: row.attempt_count,
      correctCount: row.correct_count,
    }));
  }

  /**
   * Сэдвийн эзэмшил матриц: сурагч × сэдэв
   * @param classroomId - танхимын ID (сонгоно)
   * @param limit - хамгийн их сурагч
   * @returns Сурагчийн сэдвийн эзэмшил статистик
   */
  async getTopicMastery(
    classroomId?: string,
    limit: number = 50,
  ): Promise<TopicMastery[]> {
    const query = `
      WITH student_topic_stats AS (
        SELECT
          u.id AS "studentId",
          CONCAT(u."firstName", ' ', u."lastName") AS "studentName",
          t.id AS "topicId",
          t.name AS "topicName",
          COUNT(DISTINCT p.id) AS problem_count,
          SUM(CASE WHEN a."autoCorrect" = true THEN 1 ELSE 0 END) AS correct_count
        FROM "User" u
        JOIN "StudentProfile" sp ON u.id = sp."userId"
        JOIN "Enrollment" e ON u.id = e."studentId" AND e."leftAt" IS NULL
        JOIN "Classroom" c ON e."classroomId" = c.id
        JOIN "Attempt" a ON u.id = a."studentId"
        JOIN "Problem" p ON a."problemId" = p.id
        JOIN "Chapter" ch ON p."chapterId" = ch.id
        LEFT JOIN "Topic" t ON ch."topicId" = t.id
        WHERE u.role = 'STUDENT'
          AND p."deletedAt" IS NULL
          AND a."deletedAt" IS NULL
          ${classroomId ? `AND c.id = $1` : ''}
        GROUP BY u.id, u."firstName", u."lastName", t.id, t.name
      )
      SELECT
        "studentId",
        "studentName",
        "topicId",
        "topicName",
        problem_count,
        correct_count,
        CAST(correct_count AS FLOAT) / NULLIF(problem_count, 0) AS mastery_rate
      FROM student_topic_stats
      WHERE problem_count > 0
      ORDER BY "studentId", mastery_rate DESC
      LIMIT $${classroomId ? '2' : '1'}
    `;

    const result = await this.prisma.$queryRawUnsafe<
      Array<{
        studentId: string;
        studentName: string;
        topicId: string | null;
        topicName: string | null;
        problem_count: number;
        correct_count: number;
        mastery_rate: number;
      }>
    >(query, ...(classroomId ? [classroomId] : []), limit);

    const grouped = new Map<string, TopicMastery>();
    for (const row of result) {
      if (!grouped.has(row.studentId)) {
        grouped.set(row.studentId, {
          studentId: row.studentId,
          studentName: row.studentName,
          topicMasteries: [],
        });
      }

      const mastery = grouped.get(row.studentId)!;
      if (row.topicId) {
        mastery.topicMasteries.push({
          topicId: row.topicId,
          topicName: row.topicName || 'Unknown',
          problemCount: row.problem_count,
          correctCount: row.correct_count,
          masteryRate: Math.round(row.mastery_rate * 100) / 100,
        });
      }
    }

    return Array.from(grouped.values());
  }

  /**
   * ML сургалтын өгөгдлийн экспорт (нууцлалтай)
   * Attempt-ийн дохиог JSONL хэлбэрээр буцаана:
   * - studentId-г тогтвортой хэшээр сольж (дахин холбох боломжгүй)
   * - сурагчийн нэр, утас ЭКСПОРТОД ОРОХГҮЙ
   * - 2.2M+ мөрүүд маш их уншихгүйн тулд хязгаар + хуудаслалт
   *
   * @param offset - skip мөрүүд (default 0)
   * @param limit - авах хамгийн их мөрүүд (default 10000, max 50000)
   * @param seed - хешийн seed (stability үүдс)
   * @returns JSONL төгс мөрүүдийн массив
   */
  async getMLExportData(
    offset: number = 0,
    limit: number = 10000,
    seed: string = 'ml-export-v1',
  ): Promise<MlDataPoint[]> {
    // Хязгаар хэтрүүлэхгүйсэн байх
    const safeLimit = Math.min(Math.max(limit, 1), 50000);
    const safeOffset = Math.max(offset, 0);

    const query = `
      SELECT
        a."studentId",
        a."problemId",
        p."token" as "problemToken",
        ch."topicId",
        a."autoCorrect" as correct,
        a."givenAnswer",
        a."timeSpentSec",
        a."occurredOn"
      FROM "Attempt" a
      JOIN "Problem" p ON a."problemId" = p.id
      JOIN "Chapter" ch ON p."chapterId" = ch.id
      WHERE a."deletedAt" IS NULL AND p."deletedAt" IS NULL
      ORDER BY a."createdAt" ASC
      OFFSET $1
      LIMIT $2
    `;

    const attempts = await this.prisma.$queryRawUnsafe<
      Array<{
        studentId: string;
        problemId: string;
        problemToken: string;
        topicId: string | null;
        correct: boolean;
        givenAnswer: unknown;
        timeSpentSec: number | null;
        occurredOn: Date;
      }>
    >(query, safeOffset, safeLimit);

    // studentId-г хешлэнэ (тогтвортой, дахин холбохгүй)
    const hashStudent = (studentId: string): string => {
      return crypto
        .createHmac('sha256', seed)
        .update(studentId)
        .digest('hex')
        .slice(0, 16);
    };

    return attempts.map((attempt) => ({
      studentIdHash: hashStudent(attempt.studentId),
      problemId: attempt.problemId,
      topicId: attempt.topicId,
      correct: attempt.correct,
      givenAnswer: attempt.givenAnswer,
      timeSpentSec: attempt.timeSpentSec,
      occurredOn: attempt.occurredOn.toISOString().split('T')[0],
    }));
  }

  /**
   * ML экспортын нийт мөрүүдийн тоо
   * @returns Нийт Attempt мөрүүдийн тоо (хуучин биш)
   */
  async getMLExportCount(): Promise<number> {
    const result = await this.prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*) as count FROM "Attempt" WHERE "deletedAt" IS NULL`,
    );
    return result[0]?.count || 0;
  }

  /**
   * ЦЭВЭР функц: эвдэрсэн бодлогын дискриминациог бодно
   * Unit тестээр шалгагдаж болно
   */
  calculateDiscrimination(
    correctScores: number[],
    allScores: number[],
  ): number {
    if (correctScores.length === 0 || allScores.length === 0) return 0;

    const meanCorrect =
      correctScores.reduce((a, b) => a + b, 0) / correctScores.length;
    const meanAll = allScores.reduce((a, b) => a + b, 0) / allScores.length;

    // Standard deviation
    const variance =
      allScores.reduce((sum, x) => sum + Math.pow(x - meanAll, 2), 0) /
      allScores.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;
    return (meanCorrect - meanAll) / stdDev;
  }
}

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
    /*
     * ⚠️ ГУРВАН АЛДААГ ЗАССАН (2026-08-08, smoke test-ээр илэрсэн):
     *
     * 1. `a."deletedAt" IS NULL` — Attempt хүснэгтэд ТИЙМ БАГАНА БАЙХГҮЙ
     *    (зөвхөн Problem/Chapter/Topic-д soft delete бий). Query бүхэлдээ
     *    `column a.deletedAt does not exist` алдаагаар унаж байв.
     *
     * 2. Сонголтыг `LIKE '%label%'` -ээр тааруулж байсан нь БУРУУ ТОО өгдөг:
     *    "A" гэсэн шошго нь "Абсолют утга" гэсэн ямар ч хариунд таарна.
     *    givenAnswer нь сонголтын ЖИНХЭНЭ ТЕКСТ-ийг хадгалдаг (schema.prisma
     *    дахь тайлбарыг үз) тул `#>> '{}'` -ээр задалж ЯГ тэнцүүг шалгана.
     *
     * 3. `LIMIT` нь мөрөнд (бодлого × сонголт) хэрэглэгддэг байсан тул
     *    limit=100 өгөхөд ердөө ~20 бодлого буцдаг байв. Одоо БОДЛОГЫГ
     *    дэд query дотор хязгаарлана.
     *
     * COUNT(*) нь Postgres дээр bigint буцаадаг — JSON.stringify түүнийг
     * цувуулж чаддаггүй ("Do not know how to serialize a BigInt"). Иймд
     * SQL дотор ::int болгож хөрвүүлнэ.
     */
    const query = `
      WITH target AS (
        SELECT p.id, p.token
        FROM "Problem" p
        WHERE p."deletedAt" IS NULL
          AND ($1::text[] IS NULL OR p.id = ANY($1::text[]))
        ORDER BY p.id
        LIMIT $2
      ),
      totals AS (
        SELECT a."problemId", COUNT(*)::int AS total
        FROM "Attempt" a
        JOIN target t ON t.id = a."problemId"
        GROUP BY a."problemId"
      )
      SELECT
        t.id AS "problemId",
        t.token AS "problemToken",
        COALESCE(tot.total, 0) AS "totalAttempts",
        pc.label AS "choiceLabel",
        pc.text AS "choiceText",
        COALESCE(sel.cnt, 0) AS "selectionCount",
        pc."mistakeType" AS "mistakeType",
        pc."mistakeNote" AS "mistakeNote"
      FROM target t
      JOIN "ProblemChoice" pc ON pc."problemId" = t.id
      LEFT JOIN totals tot ON tot."problemId" = t.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt
        FROM "Attempt" a
        WHERE a."problemId" = t.id
          AND a."givenAnswer" #>> '{}' = pc.text
      ) sel ON TRUE
      ORDER BY t.id, pc."order"
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
    >(query, problemIds ?? null, limit);

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
    /*
     * ⚠️ ХОЁР АЛДААГ ЗАССАН (2026-08-08, smoke test-ээр илэрсэн):
     *   1. `CAST(SUM(...))` — `AS <төрөл>` дутуу тул Postgres
     *      `syntax error at or near ")"` гэж унагааж байв.
     *   2. `a."deletedAt"` — Attempt-д байхгүй багана.
     *
     * ЗАРЧМЫН ЗАСВАР: дискриминацийг ЖИНХЭНЭ point-biserial-аар бодно.
     * Өмнөх томьёо (mean_correct − mean_ALL) / sd нь ТУУШТАЙ ЭЕРЭГ талдаа
     * хазайдаг: зөв бодсон сурагчдын дундаж нь бүх сурагчийн дунджаас
     * бараг үргэлж их байдаг тул «эвдэрсэн бодлого» (сөрөг дискриминаци)
     * бараг хэзээ ч илрэхгүй — өөрөөр хэлбэл шалгуур нь ажиллахгүй байв.
     *
     *   r_pb = (M₁ − M₀) / S · √(p·q)
     *     M₁ — зөв бодсон сурагчдын НИЙТ онооны дундаж
     *     M₀ — буруу бодсон сурагчдын НИЙТ онооны дундаж
     *     S  — нийт онооны стандарт хазайлт (популяци)
     *     p  — зөв бодсоны эзлэх хувь, q = 1 − p
     *
     * Бүх COUNT/SUM-ыг ::int / ::float болгож хөрвүүлэв — bigint нь
     * JSON.stringify-д цувихгүй.
     */
    const query = `
      WITH scored AS (
        -- Нэг сурагч × нэг бодлого = нэг оноо (дахин оролдлогыг нэгтгэнэ)
        SELECT
          a."studentId",
          a."problemId",
          MAX(CASE WHEN a."autoCorrect" THEN 1 ELSE 0 END) AS score
        FROM "Attempt" a
        WHERE a."autoCorrect" IS NOT NULL
        GROUP BY a."studentId", a."problemId"
      ),
      student_total AS (
        SELECT "studentId", SUM(score)::float AS total
        FROM scored
        GROUP BY "studentId"
      ),
      overall AS (
        SELECT STDDEV_POP(total) AS sd_total FROM student_total
      ),
      item AS (
        SELECT
          s."problemId",
          COUNT(*)::int AS attempt_count,
          SUM(s.score)::int AS correct_count,
          AVG(s.score::float) AS p_value,
          AVG(CASE WHEN s.score = 1 THEN st.total END) AS mean_right,
          AVG(CASE WHEN s.score = 0 THEN st.total END) AS mean_wrong
        FROM scored s
        JOIN student_total st ON st."studentId" = s."studentId"
        GROUP BY s."problemId"
      )
      SELECT
        p.id AS "problemId",
        p.token AS "problemToken",
        i.p_value AS difficulty,
        CASE
          WHEN o.sd_total IS NULL OR o.sd_total = 0 THEN 0
          WHEN i.p_value <= 0 OR i.p_value >= 1 THEN 0
          ELSE ((i.mean_right - i.mean_wrong) / o.sd_total)
               * sqrt(i.p_value * (1 - i.p_value))
        END AS discrimination,
        i.attempt_count,
        i.correct_count
      FROM item i
      JOIN "Problem" p ON p.id = i."problemId" AND p."deletedAt" IS NULL
      CROSS JOIN overall o
      WHERE i.attempt_count > 0
      ORDER BY i.attempt_count DESC
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
    /*
     * ⚠️ ЗАССАН (2026-08-08): `a."deletedAt"` байхгүй багана байв.
     *
     * Мөн `LIMIT` нь МӨРӨНД (сурагч × сэдэв) үйлчилдэг байсан тул limit=50
     * өгөхөд ердөө 6-8 сурагч буцдаг, үлдсэн сурагчдын мөр дундуур тасардаг
     * байв. Одоо СУРАГЧИЙГ дэд query дотор хязгаарлана — эцсийн үр дүн яг
     * `limit` сурагчийн БҮРЭН мөрүүд болно.
     *
     * COUNT/SUM → ::int (bigint нь JSON-д цувихгүй).
     */
    const query = `
      WITH base AS (
        SELECT
          u.id AS "studentId",
          CONCAT(u."firstName", ' ', u."lastName") AS "studentName",
          t.id AS "topicId",
          t.name AS "topicName",
          p.id AS "problemId",
          a."autoCorrect" AS correct
        FROM "User" u
        JOIN "Enrollment" e ON u.id = e."studentId" AND e."leftAt" IS NULL
        JOIN "Classroom" c ON e."classroomId" = c.id
        JOIN "Attempt" a ON u.id = a."studentId"
        JOIN "Problem" p ON a."problemId" = p.id AND p."deletedAt" IS NULL
        JOIN "Chapter" ch ON p."chapterId" = ch.id
        JOIN "Topic" t ON ch."topicId" = t.id AND t."deletedAt" IS NULL
        WHERE u.role = 'STUDENT'
          AND ($1::text IS NULL OR c.id = $1::text)
      ),
      students AS (
        SELECT "studentId"
        FROM base
        GROUP BY "studentId"
        ORDER BY COUNT(*) DESC
        LIMIT $2
      )
      SELECT
        b."studentId",
        b."studentName",
        b."topicId",
        b."topicName",
        COUNT(DISTINCT b."problemId")::int AS problem_count,
        COUNT(DISTINCT b."problemId") FILTER (WHERE b.correct)::int AS correct_count,
        COUNT(DISTINCT b."problemId") FILTER (WHERE b.correct)::float
          / NULLIF(COUNT(DISTINCT b."problemId"), 0) AS mastery_rate
      FROM base b
      JOIN students s ON s."studentId" = b."studentId"
      GROUP BY b."studentId", b."studentName", b."topicId", b."topicName"
      ORDER BY b."studentId", mastery_rate DESC
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
    >(query, classroomId ?? null, limit);

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
      WHERE p."deletedAt" IS NULL
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
    // ::int ЗААВАЛ — COUNT(*) нь bigint буцаадаг бөгөөд Nest түүнийг JSON
    // болгох гэж оролдоод "Do not know how to serialize a BigInt" гэж унана.
    // Attempt-д soft delete байхгүй тул `deletedAt` шүүлт ч хассан.
    const result = await this.prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count FROM "Attempt"`,
    );
    return result[0]?.count ?? 0;
  }

  /**
   * ЦЭВЭР функц: бодлогын дискриминаци (point-biserial корреляц).
   *
   * `getProblemQuality`-ийн SQL-тэй ЯГ ИЖИЛ томьёо — SQL-ийг ӨС-гүйгээр
   * тестлэх боломжгүй тул логикийн зөвийг энд бэхжүүлнэ (insights.spec.ts).
   *
   *   r_pb = (M₁ − M₀) / S · √(p·q)
   *
   * @param rightTotals зөв бодсон сурагчдын НИЙТ оноо
   * @param wrongTotals буруу бодсон сурагчдын НИЙТ оноо
   * @returns −1..1 хооронд. Сөрөг = ЭВДЭРСЭН бодлого (сайн сурагч буруу
   *          бодож, сул сурагч зөв бодож байна → томьёолол/түлхүүр эргэлзээтэй)
   */
  calculateDiscrimination(
    rightTotals: number[],
    wrongTotals: number[],
  ): number {
    const n = rightTotals.length + wrongTotals.length;
    // Бүгд зөв (эсвэл бүгд буруу) бол ялгах чадвар ХЭМЖИГДЭХГҮЙ — 0 нь
    // «муу бодлого» гэсэн үг биш, «мэдээлэл хүрэлцэхгүй» гэсэн үг.
    if (rightTotals.length === 0 || wrongTotals.length === 0) return 0;

    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const all = [...rightTotals, ...wrongTotals];
    const meanAll = mean(all);

    const variance =
      all.reduce((sum, x) => sum + (x - meanAll) ** 2, 0) / all.length;
    const sd = Math.sqrt(variance);
    if (sd === 0) return 0;

    const p = rightTotals.length / n;
    return ((mean(rightTotals) - mean(wrongTotals)) / sd) * Math.sqrt(p * (1 - p));
  }
}

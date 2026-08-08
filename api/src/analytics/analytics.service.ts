import { Injectable } from '@nestjs/common';
import {
  addDateDays,
  daysBetweenDateOnly,
  dateKey,
  parseDateOnly,
  todayUB,
} from '../common/date';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Амжилттай гэж тооцох нөхцөл: систем автоматаар зөв гэж тэмдэглэсэн
// (autoCorrect=true, онлайн тест/OMR) ЭСВЭЛ сурагч оройн тэмдэглэгээгээрээ
// эцэст нь бодож чадсан гэж тэмдэглэсэн (SOLVED_CLEAN / FIXED_AFTER_ERROR).
// Аль алиных нь утга null бол (жишээ нь CHAPTER_EXAM-ийн зарим мөр) тухайн
// оролдлогыг "мэдэгдэхгүй үр дүн" гэж тооцоод success rate-д огт оруулахгүй.
const SUCCESS_SQL_FRAGMENT = `a."autoCorrect" = true OR a."selfState" IN ('SOLVED_CLEAN', 'FIXED_AFTER_ERROR')`;
const KNOWN_OUTCOME_SQL_FRAGMENT = `a."autoCorrect" IS NOT NULL OR a."selfState" IS NOT NULL`;

// Сэдэв (бүлэг) бүрийн амжилтын хувийг найдвартай тооцоход шаардагдах хамгийн
// цөөн тооны оролдлого — үүнээс бага бол "хангалттай дата алга" гэж тэмдэглэнэ
// (2-3 оролдлогоор 0% эсвэл 100% гарсан ч утгагүй).
const MIN_TOPIC_SAMPLE = 8;

// Идэвхийн урсгал (LearningEvent) хэдэн хоногийн турш ажилласнаас доош бол
// "чиг хандлага" гэж тайлбарлахад дата хангалтгүй гэдгийг UI-д мэдэгдэнэ.
const MIN_CONFIDENT_STREAM_DAYS = 7;

const EPOCH = new Date(0);

export interface DateRange {
  start: Date;
  end: Date;
  days: number;
}

// Огнооны мужийг тайлбар мөр (from/to) байдлаар буцаана — frontend-д харуулах,
// дахин query хийхэд ашиглах хялбар хэлбэр.
function rangeMeta(range: DateRange) {
  return { from: dateKey(range.start), to: dateKey(range.end), days: range.days };
}

function safeParseDateOnly(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  try {
    return parseDateOnly(value);
  } catch {
    return undefined;
  }
}

// Огнооны мужийг тайван байдлаар шийднэ: буруу/байхгүй утга ирвэл сүүлийн 30
// хоногийг өгөгдмөл болгоно (ActivityController.resolveYear-тэй ижил зарчим).
function resolveRange(from?: string, to?: string): DateRange {
  const today = todayUB();
  const end = safeParseDateOnly(to) ?? today;
  const start = safeParseDateOnly(from) ?? addDateDays(end, -29);
  const [lo, hi] = start <= end ? [start, end] : [end, start];
  return { start: lo, end: hi, days: daysBetweenDateOnly(hi, lo) + 1 };
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // LearningEvent урсгал хэдийнээс эхэлснийг олж, "энэ чиг хандлага хэр
  // найдвартай вэ" гэдгийг frontend-д шууд илэрхийлнэ (Wave 1-д шинээр
  // нэмэгдсэн тул эхний хэдэн долоо хоногт бага дата байх нь хэвийн).
  private async eventStreamAgeDays(): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ earliest: Date | null }[]>`
      SELECT MIN("occurredAt") AS earliest FROM "LearningEvent"
    `;
    if (!row?.earliest) return 0;
    return (
      daysBetweenDateOnly(todayUB(), parseDateOnly(dateKey(new Date(row.earliest)))) + 1
    );
  }

  // KPI хавтан: DAU/WAU/MAU, дундаж session урт, идэвхтэй сурагчийн тоо,
  // нийт бодсон бодлогын тоо. Бүгд SQL түвшинд нэгтгэгдэнэ.
  async overview(from?: string, to?: string) {
    const range = resolveRange(from, to);
    const endBoundary = addDateDays(range.end, 1); // occurredAt < endBoundary (тухайн өдрийг багтаана)

    /*
     * ⚠️ ХИЛИЙГ SQL ДОТОР БИШ, ЭНД БОДНО (2026-08-08-нд зассан).
     *
     * Өмнө нь `${range.end} - interval '1 day'` гэж бичсэн байв. Prisma-гийн
     * tagged template нь `${…}`-ыг bind параметр ($1) болгодог тул Postgres-т
     * `$1 - interval '1 day'` гэж очно. Постгрес $1-ийн төрлийг МЭДЭХГҮЙ тул
     * `interval - interval` гэж таамаглаад бүхэл илэрхийллийг interval болгоно
     * → `operator does not exist: timestamp without time zone >= interval`
     * → «Аналитик самбар» хуудас БҮХЭЛДЭЭ 500 өгч байв.
     *
     * Мөн цонхнууд нэг өдрөөр урт байсныг зассан: `>= end − 7 хоног` ба
     * `< end + 1 хоног` нь 8 ХОНОГ хамардаг. WAU нь 7 хоног байх ёстой тул
     * `end − 6`-аас эхэлнэ (DAU = зөвхөн end өдөр, MAU = 30 хоног).
     */
    const dauStart = range.end; // зөвхөн эцсийн өдөр
    const wauStart = addDateDays(range.end, -6); // 7 хоног (end-ийг оруулаад)
    const mauStart = addDateDays(range.end, -29); // 30 хоног

    const [[activity], [session], [attempts], eventStreamAgeDays] = await Promise.all([
      this.prisma.$queryRaw<{ dau: number; wau: number; mau: number }[]>`
        SELECT
          COUNT(DISTINCT le."userId") FILTER (
            WHERE le."occurredAt" >= ${dauStart} AND le."occurredAt" < ${endBoundary}
          )::int AS dau,
          COUNT(DISTINCT le."userId") FILTER (
            WHERE le."occurredAt" >= ${wauStart} AND le."occurredAt" < ${endBoundary}
          )::int AS wau,
          COUNT(DISTINCT le."userId") FILTER (
            WHERE le."occurredAt" >= ${mauStart} AND le."occurredAt" < ${endBoundary}
          )::int AS mau
        FROM "LearningEvent" le
        JOIN "User" u ON u.id = le."userId" AND u.role = 'STUDENT'
      `,
      this.prisma.$queryRaw<{ avg_ms: number | null }[]>`
        SELECT AVG(duration_ms) AS avg_ms FROM (
          SELECT EXTRACT(EPOCH FROM (MAX(le."occurredAt") - MIN(le."occurredAt"))) * 1000 AS duration_ms
          FROM "LearningEvent" le
          JOIN "User" u ON u.id = le."userId" AND u.role = 'STUDENT'
          WHERE le."sessionId" IS NOT NULL
            AND le."occurredAt" >= ${range.start}
            AND le."occurredAt" < ${endBoundary}
          GROUP BY le."sessionId"
        ) sessions
      `,
      this.prisma.$queryRaw<{ active_students: number; total_attempts: number }[]>`
        SELECT
          COUNT(DISTINCT a."studentId")::int AS active_students,
          COUNT(*)::int AS total_attempts
        FROM "Attempt" a
        WHERE a."occurredOn" >= ${range.start} AND a."occurredOn" <= ${range.end}
      `,
      this.eventStreamAgeDays(),
    ]);

    return {
      range: rangeMeta(range),
      dau: activity?.dau ?? 0,
      wau: activity?.wau ?? 0,
      mau: activity?.mau ?? 0,
      avgSessionMs: Math.round(session?.avg_ms ?? 0),
      totalActiveStudents: attempts?.active_students ?? 0,
      totalProblemsAttempted: attempts?.total_attempts ?? 0,
      eventStreamAgeDays,
      lowConfidence: eventStreamAgeDays < MIN_CONFIDENT_STREAM_DAYS,
    };
  }

  // Өдөр тутмын идэвхтэй сурагчийн тоо (чиг хандлагын график) — LearningEvent
  // урсгалаас, өдөр бүрийг дүүргэж (0 идэвхтэй өдрийг ч оруулж) буцаана.
  async engagement(from?: string, to?: string) {
    const range = resolveRange(from, to);
    const endBoundary = addDateDays(range.end, 1);

    const [rows, eventStreamAgeDays] = await Promise.all([
      this.prisma.$queryRaw<{ day: Date; active: number }[]>`
        SELECT
          date_trunc('day', le."occurredAt")::date AS day,
          COUNT(DISTINCT le."userId")::int AS active
        FROM "LearningEvent" le
        JOIN "User" u ON u.id = le."userId" AND u.role = 'STUDENT'
        WHERE le."occurredAt" >= ${range.start} AND le."occurredAt" < ${endBoundary}
        GROUP BY 1
        ORDER BY 1
      `,
      this.eventStreamAgeDays(),
    ]);

    const byDate = new Map(rows.map((r) => [dateKey(new Date(r.day)), r.active]));
    const days: { date: string; activeStudents: number }[] = [];
    for (let d = range.start; d <= range.end; d = addDateDays(d, 1)) {
      const key = dateKey(d);
      days.push({ date: key, activeStudents: byDate.get(key) ?? 0 });
    }

    return {
      range: rangeMeta(range),
      eventStreamAgeDays,
      lowConfidence: eventStreamAgeDays < MIN_CONFIDENT_STREAM_DAYS,
      days,
    };
  }

  // Анги тус бүрийн оролцоо: элссэн тоо, идэвхтэй тоо, оролцооны хувь, идэвхтэй
  // сурагч тутамд ногдох дундаж бодлого. Хамгийн бага оролцоотой анги эхэндээ
  // ирнэ — "аль анги хоцорч байгааг" шууд харуулна.
  async classroomBreakdown(from?: string, to?: string) {
    const range = resolveRange(from, to);

    const rows = await this.prisma.$queryRaw<
      {
        classroomId: string;
        classroomName: string;
        enrolled: number;
        active: number;
        totalAttempts: number;
      }[]
    >`
      SELECT
        c.id AS "classroomId",
        c.name AS "classroomName",
        COUNT(DISTINCT en."studentId")::int AS enrolled,
        COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN en."studentId" END)::int AS active,
        COUNT(a.id)::int AS "totalAttempts"
      FROM "Classroom" c
      JOIN "Enrollment" en ON en."classroomId" = c.id AND en."leftAt" IS NULL
      LEFT JOIN "Attempt" a
        ON a."studentId" = en."studentId"
        AND a."occurredOn" >= ${range.start} AND a."occurredOn" <= ${range.end}
      WHERE c.archived = false
      GROUP BY c.id, c.name
      ORDER BY c.name
    `;

    const classrooms = rows
      .map((r) => ({
        classroomId: r.classroomId,
        classroomName: r.classroomName,
        enrolled: r.enrolled,
        active: r.active,
        participationRate: r.enrolled > 0 ? r.active / r.enrolled : 0,
        avgProblemsPerActiveStudent: r.active > 0 ? r.totalAttempts / r.active : 0,
      }))
      .sort((a, b) => a.participationRate - b.participationRate);

    return { range: rangeMeta(range), classrooms };
  }

  // Бүлэг (сэдэв) тус бүрийн амжилтын хувь — хамгийн сул сэдэв эхэндээ ирнэ.
  // "Мэдэгдэхгүй үр дүн"-тэй (autoCorrect/selfState хоёул null) оролдлогыг
  // тооноос гаргана — тэдгээр нь зөв/буруу мэдээлэлгүй тул хувь бодоход
  // ашиглах учиргүй.
  async topicBreakdown(from?: string, to?: string) {
    const range = resolveRange(from, to);

    const rows = await this.prisma.$queryRaw<
      {
        chapterId: string;
        chapterTitle: string;
        bookTitle: string | null;
        totalAttempts: number;
        correctAttempts: number;
      }[]
    >`
      SELECT
        ch.id AS "chapterId",
        ch.title AS "chapterTitle",
        b.title AS "bookTitle",
        COUNT(*)::int AS "totalAttempts",
        COUNT(*) FILTER (WHERE ${Prisma.raw(SUCCESS_SQL_FRAGMENT)})::int AS "correctAttempts"
      FROM "Attempt" a
      JOIN "Problem" p ON p.id = a."problemId"
      JOIN "Chapter" ch ON ch.id = p."chapterId"
      LEFT JOIN "Book" b ON b.id = ch."bookId"
      WHERE a."occurredOn" >= ${range.start} AND a."occurredOn" <= ${range.end}
        AND (${Prisma.raw(KNOWN_OUTCOME_SQL_FRAGMENT)})
        AND ch."deletedAt" IS NULL
      GROUP BY ch.id, ch.title, b.title
    `;

    const topics = rows
      .map((r) => {
        const successRate = r.totalAttempts > 0 ? r.correctAttempts / r.totalAttempts : 0;
        return {
          chapterId: r.chapterId,
          chapterTitle: r.chapterTitle,
          bookTitle: r.bookTitle,
          totalAttempts: r.totalAttempts,
          successRate,
          lowSample: r.totalAttempts < MIN_TOPIC_SAMPLE,
        };
      })
      // Хангалттай дататай сэдвүүдийг эхэлж амжилтын хувиар нь (сул нь түрүүнд),
      // дараа нь дата хомс сэдвүүдийг ард нь жагсаана — жагсаалтын толгойд
      // 1-2 оролдлогоор "0%" болсон санамсаргүй сэдэв гарч хуурамч алдаа
      // харуулахгүйн тулд.
      .sort((a, b) => {
        if (a.lowSample !== b.lowSample) return a.lowSample ? 1 : -1;
        return a.successRate - b.successRate;
      });

    return { range: rangeMeta(range), minSample: MIN_TOPIC_SAMPLE, topics };
  }

  // Эрсдэлтэй сурагчид: сүүлийн N хоногт огт идэвхгүй БОЛОН/ЭСВЭЛ амжилтын
  // хувь мэдэгдэхүйц уналттай (өмнөх N хоногтой харьцуулахад). Хадгалалт
  // (retention) эрт мэдэх нь энэ жагсаалтын гол зорилго.
  async atRisk(days?: number) {
    const windowDays = Math.min(60, Math.max(3, days ?? 14));
    const declineWindowDays = windowDays * 2;

    const rows = await this.prisma.$queryRaw<
      {
        studentId: string;
        firstName: string;
        lastName: string;
        classroomId: string;
        classroomName: string;
        lastActiveAt: Date;
        recentTotal: number;
        recentCorrect: number;
        priorTotal: number;
        priorCorrect: number;
      }[]
    >`
      WITH bounds AS (
        SELECT
          now() - make_interval(days => ${windowDays}) AS recent_start,
          now() - make_interval(days => ${declineWindowDays}) AS prior_start
      ),
      recent AS (
        SELECT a."studentId",
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE ${Prisma.raw(SUCCESS_SQL_FRAGMENT)})::int AS correct
        FROM "Attempt" a, bounds
        WHERE a."occurredOn" >= bounds.recent_start AND (${Prisma.raw(KNOWN_OUTCOME_SQL_FRAGMENT)})
        GROUP BY a."studentId"
      ),
      prior AS (
        SELECT a."studentId",
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE ${Prisma.raw(SUCCESS_SQL_FRAGMENT)})::int AS correct
        FROM "Attempt" a, bounds
        WHERE a."occurredOn" >= bounds.prior_start AND a."occurredOn" < bounds.recent_start
          AND (${Prisma.raw(KNOWN_OUTCOME_SQL_FRAGMENT)})
        GROUP BY a."studentId"
      ),
      last_event AS (
        SELECT "userId" AS "studentId", MAX("occurredAt") AS at FROM "LearningEvent" GROUP BY "userId"
      ),
      last_attempt AS (
        SELECT "studentId", MAX("createdAt") AS at FROM "Attempt" GROUP BY "studentId"
      )
      SELECT DISTINCT ON (u.id)
        u.id AS "studentId",
        u."firstName" AS "firstName",
        u."lastName" AS "lastName",
        c.id AS "classroomId",
        c.name AS "classroomName",
        GREATEST(
          COALESCE(le.at, ${EPOCH}),
          COALESCE(la.at, ${EPOCH})
        ) AS "lastActiveAt",
        COALESCE(r.total, 0) AS "recentTotal",
        COALESCE(r.correct, 0) AS "recentCorrect",
        COALESCE(p.total, 0) AS "priorTotal",
        COALESCE(p.correct, 0) AS "priorCorrect"
      FROM "User" u
      JOIN "Enrollment" en ON en."studentId" = u.id AND en."leftAt" IS NULL
      JOIN "Classroom" c ON c.id = en."classroomId" AND c.archived = false
      LEFT JOIN last_event le ON le."studentId" = u.id
      LEFT JOIN last_attempt la ON la."studentId" = u.id
      LEFT JOIN recent r ON r."studentId" = u.id
      LEFT JOIN prior p ON p."studentId" = u.id
      WHERE u.role = 'STUDENT'
      ORDER BY u.id, en."joinedAt" DESC
    `;

    const now = Date.now();
    const inactiveThresholdMs = windowDays * 24 * 60 * 60 * 1000;
    const MIN_DECLINE_SAMPLE = 5;
    const DECLINE_THRESHOLD = 0.15; // 15 нэгжийн бууралт

    const students = rows
      .map((r) => {
        const lastActiveAt = new Date(r.lastActiveAt);
        const recentRate = r.recentTotal > 0 ? r.recentCorrect / r.recentTotal : null;
        const priorRate = r.priorTotal > 0 ? r.priorCorrect / r.priorTotal : null;

        const inactive = now - lastActiveAt.getTime() >= inactiveThresholdMs;
        const declining =
          recentRate !== null &&
          priorRate !== null &&
          r.recentTotal >= MIN_DECLINE_SAMPLE &&
          r.priorTotal >= MIN_DECLINE_SAMPLE &&
          priorRate - recentRate >= DECLINE_THRESHOLD;

        const reasons: ('INACTIVE' | 'DECLINING')[] = [
          ...(inactive ? (['INACTIVE'] as const) : []),
          ...(declining ? (['DECLINING'] as const) : []),
        ];

        return {
          studentId: r.studentId,
          name: `${r.lastName} ${r.firstName}`,
          classroomId: r.classroomId,
          classroomName: r.classroomName,
          lastActiveAt: lastActiveAt.getTime() === EPOCH.getTime() ? null : lastActiveAt,
          recentSuccessRate: recentRate,
          priorSuccessRate: priorRate,
          reasons,
        };
      })
      .filter((s) => s.reasons.length > 0)
      .sort((a, b) => {
        const aTime = a.lastActiveAt?.getTime() ?? 0;
        const bTime = b.lastActiveAt?.getTime() ?? 0;
        return aTime - bTime; // хамгийн удаан идэвхгүй нь эхэндээ
      });

    return { windowDays, generatedAt: new Date(), students };
  }
}

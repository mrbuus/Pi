import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  LearningEventType,
  Role,
  StudentType,
} from '../generated/prisma/enums';
import { TEACHER_ROLES } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
// Аналитик/идэвх/дүнгийн логикийг ДАХИН БИЧИХГҮЙ — байгаа сервисүүдийг шууд
// дуудна (attempts.service.ts-ийн myStats, activity.service.ts-ийн streak/
// yearActivity, tests.service.ts-ийн myResults). Эдгээр модулиудыг (attempts/
// activity/tests) бид засварлахгүй, зөвхөн энэ модулийн provider жагсаалтад
// нэмж дахин ашиглана (PrismaService дээр л суурилдаг тул аюулгүй).
import { AttemptsService } from '../attempts/attempts.service';
import { ActivityService } from '../activity/activity.service';
import { TestsService } from '../tests/tests.service';
import { AuditService } from '../audit/audit.service';
import {
  AdjustAttemptDto,
  AssignTestDto,
  ResetChapterDto,
} from './dto/adjust-progress.dto';

// Идэвхийн флагийн босго (өдрөөр) — сүүлийн идэвхээс хойш хэдэн өдөр өнгөрсөн бэ.
// SPEC тодорхой тоо өгөөгүй тул оройн тэмдэглэгээний цонх (7 хоног)-той төстэй
// уян хатан утга сонгосон: ойрын хугацаанд идэвхтэй / сулрах / унтарсан.
const ENGAGEMENT_ACTIVE_DAYS = 3;
const ENGAGEMENT_SLOWING_DAYS = 10;

// Онлайн эрхийн ад-хок олголт (assign-test) хэрэглэдэг "Pass" бичлэгийн
// хүчинтэй хугацаа — цаасаар тест олгосонтой адилтгаж бараг "хугацаагүй" тохируулна.
const ADHOC_GRANT_DAYS = 3650;

type PassStatusFilter = 'ACTIVE' | 'EXPIRED';
type EngagementFilter = 'ACTIVE' | 'SLOWING' | 'DORMANT';

interface RosterQuery {
  search?: string;
  passStatus?: string;
  activity?: string;
  page?: string | number;
  pageSize?: string | number;
}

interface RosterRow {
  id: string;
  studentCode: string | null;
  firstName: string;
  lastName: string;
  grade: number | null;
  pass_name: string | null;
  pass_expires_at: Date | null;
  last_active_at: Date | null;
  attempts_7d: number;
  attempts_30d: number;
  success_30d: number;
  tests_taken: number;
  engagement: EngagementFilter;
  dormant_with_pass: boolean;
}

function fullName(u: { firstName: string; lastName: string }) {
  return `${u.lastName} ${u.firstName}`.trim();
}

@Injectable()
export class ProgressService {
  constructor(
    private prisma: PrismaService,
    private attempts: AttemptsService,
    private activity: ActivityService,
    private tests: TestsService,
    private audit: AuditService,
  ) {}

  // ============ Хандалтын дүрэм (SPEC: "ACCESS MODEL") ============
  // ADMIN, TEACHER_PLUS: онлайн сурагчийн мэдээллийг бүрэн харах + засварлах.
  // Энгийн TEACHER: зөвхөн харах (READ-ONLY) — онлайн сурагч ангигүй тул багш
  // "миний анги" гэсэн claim-гүй, тиймээс засварлах эрхгүй.
  private assertReadAccess(role: Role) {
    if (!TEACHER_ROLES.includes(role)) {
      throw new ForbiddenException(
        'Зөвхөн багш, административ ажилтан харах эрхтэй',
      );
    }
  }

  private assertWriteAccess(role: Role) {
    if (role !== Role.ADMIN && role !== Role.TEACHER_PLUS) {
      throw new ForbiddenException(
        'Зөвхөн Админ/Багш+ энэ үйлдлийг хийж чадна',
      );
    }
  }

  private async assertOnlineStudent(studentId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { studentProfile: true },
    });
    if (!student || student.role !== Role.STUDENT || !student.studentProfile) {
      throw new NotFoundException('Сурагч олдсонгүй');
    }
    if (student.studentProfile.type !== StudentType.ONLINE) {
      throw new BadRequestException(
        'Энэ сурагч ОНЛАЙН төрлийн бүртгэлгүй байна',
      );
    }
    return student;
  }

  // ============ 1. Онлайн сурагчдын жагсаалт ============
  // 🚨 ГҮЙЦЭТГЭЛ: Attempt сая мөр хүрэх тул JS дотор ачаалж тоолохгүй — бүх
  // нэгтгэл (сүүлийн идэвх, 7/30 хоногийн оролдлого, амжилтын хувь, идэвхийн
  // флаг) SQL түвшинд нэг query-ээр бодогдоно (activity.service.ts-ийн
  // groupBy загвартай ижил зарчим, гэхдээ энд олон эх сурвалж нэгтгэх шаардлагатай
  // тул raw SQL ашиглав).
  async onlineStudentsRoster(query: RosterQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 50));
    const offset = (page - 1) * pageSize;

    const passStatus =
      query.passStatus === 'ACTIVE' || query.passStatus === 'EXPIRED'
        ? (query.passStatus as PassStatusFilter)
        : undefined;
    const activity =
      query.activity === 'ACTIVE' ||
      query.activity === 'SLOWING' ||
      query.activity === 'DORMANT'
        ? (query.activity as EngagementFilter)
        : undefined;
    const search = query.search?.trim() || undefined;

    const base = this.rosterBaseQuery(search);

    const filters: Prisma.Sql[] = [];
    if (passStatus === 'ACTIVE') {
      filters.push(Prisma.sql`pass_expires_at IS NOT NULL`);
    } else if (passStatus === 'EXPIRED') {
      filters.push(Prisma.sql`pass_expires_at IS NULL`);
    }
    if (activity) {
      filters.push(Prisma.sql`engagement = ${activity}`);
    }
    const whereClause = filters.length
      ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`
      : Prisma.empty;

    const [rows, totalRows] = await Promise.all([
      this.prisma.$queryRaw<RosterRow[]>(Prisma.sql`
        SELECT * FROM (${base}) t
        ${whereClause}
        ORDER BY
          dormant_with_pass DESC,
          CASE engagement
            WHEN 'DORMANT' THEN 2
            WHEN 'SLOWING' THEN 1
            ELSE 0
          END DESC,
          last_active_at ASC NULLS FIRST,
          "lastName" ASC,
          "firstName" ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `),
      this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count FROM (${base}) t ${whereClause}
      `),
    ]);

    const total = Number(totalRows[0]?.count ?? 0);

    return {
      page,
      pageSize,
      total,
      items: rows.map((r) => ({
        studentId: r.id,
        studentCode: r.studentCode,
        name: fullName(r),
        grade: r.grade,
        activePass: r.pass_name
          ? { name: r.pass_name, expiresAt: r.pass_expires_at }
          : null,
        lastActiveAt: r.last_active_at,
        problemsAttempted: {
          last7d: Number(r.attempts_7d),
          last30d: Number(r.attempts_30d),
        },
        successRate:
          Number(r.attempts_30d) > 0
            ? Math.round((Number(r.success_30d) / Number(r.attempts_30d)) * 100)
            : null,
        testsTaken: Number(r.tests_taken),
        engagement: r.engagement,
      })),
    };
  }

  private rosterBaseQuery(search?: string): Prisma.Sql {
    const searchFilter = search
      ? Prisma.sql`AND (
          u."studentCode" ILIKE ${'%' + search + '%'}
          OR u."firstName" ILIKE ${'%' + search + '%'}
          OR u."lastName" ILIKE ${'%' + search + '%'}
        )`
      : Prisma.empty;

    return Prisma.sql`
      WITH online_students AS (
        SELECT u.id, u."studentCode", u."firstName", u."lastName", sp.grade
        FROM "User" u
        JOIN "StudentProfile" sp ON sp."userId" = u.id
        WHERE u.role = 'STUDENT' AND sp.type = 'ONLINE'
        ${searchFilter}
      ),
      pass_info AS (
        SELECT DISTINCT ON (up."userId")
          up."userId" AS student_id,
          p.name AS pass_name,
          up."expiresAt" AS pass_expires_at
        FROM "UserPass" up
        JOIN "Pass" p ON p.id = up."passId"
        WHERE up."expiresAt" > now()
          AND up."userId" IN (SELECT id FROM online_students)
        ORDER BY up."userId", up."expiresAt" DESC
      ),
      attempt_activity AS (
        SELECT
          a."studentId" AS student_id,
          MAX(a."occurredOn") AS last_attempt_date,
          COUNT(*) FILTER (
            WHERE a."occurredOn" >= (now()::date - INTERVAL '7 days')
          ) AS attempts_7d,
          COUNT(*) FILTER (
            WHERE a."occurredOn" >= (now()::date - INTERVAL '30 days')
          ) AS attempts_30d,
          COUNT(*) FILTER (
            WHERE a."occurredOn" >= (now()::date - INTERVAL '30 days')
              AND (
                a."selfState" IN ('SOLVED_CLEAN', 'FIXED_AFTER_ERROR')
                OR a."autoCorrect" = true
              )
          ) AS success_30d
        FROM "Attempt" a
        WHERE a."studentId" IN (SELECT id FROM online_students)
        GROUP BY a."studentId"
      ),
      event_activity AS (
        SELECT le."userId" AS student_id, MAX(le."occurredAt") AS last_event_at
        FROM "LearningEvent" le
        WHERE le."userId" IN (SELECT id FROM online_students)
        GROUP BY le."userId"
      ),
      test_activity AS (
        SELECT tr."studentId" AS student_id, COUNT(*) AS tests_taken
        FROM "TestResult" tr
        WHERE tr."studentId" IN (SELECT id FROM online_students)
        GROUP BY tr."studentId"
      ),
      merged AS (
        SELECT
          os.id,
          os."studentCode",
          os."firstName",
          os."lastName",
          os.grade,
          pi.pass_name,
          pi.pass_expires_at,
          GREATEST(aa.last_attempt_date::timestamp, ea.last_event_at) AS last_active_at,
          COALESCE(aa.attempts_7d, 0)::int AS attempts_7d,
          COALESCE(aa.attempts_30d, 0)::int AS attempts_30d,
          COALESCE(aa.success_30d, 0)::int AS success_30d,
          COALESCE(ta.tests_taken, 0)::int AS tests_taken
        FROM online_students os
        LEFT JOIN pass_info pi ON pi.student_id = os.id
        LEFT JOIN attempt_activity aa ON aa.student_id = os.id
        LEFT JOIN event_activity ea ON ea.student_id = os.id
        LEFT JOIN test_activity ta ON ta.student_id = os.id
      ),
      flagged AS (
        SELECT
          *,
          EXTRACT(EPOCH FROM (now() - last_active_at)) / 86400 AS days_inactive
        FROM merged
      )
      SELECT
        *,
        CASE
          WHEN days_inactive IS NULL THEN 'DORMANT'
          WHEN days_inactive <= ${ENGAGEMENT_ACTIVE_DAYS} THEN 'ACTIVE'
          WHEN days_inactive <= ${ENGAGEMENT_SLOWING_DAYS} THEN 'SLOWING'
          ELSE 'DORMANT'
        END AS engagement,
        (
          (
            CASE
              WHEN days_inactive IS NULL THEN 'DORMANT'
              WHEN days_inactive <= ${ENGAGEMENT_ACTIVE_DAYS} THEN 'ACTIVE'
              WHEN days_inactive <= ${ENGAGEMENT_SLOWING_DAYS} THEN 'SLOWING'
              ELSE 'DORMANT'
            END
          ) = 'DORMANT' AND pass_expires_at IS NOT NULL
        ) AS dormant_with_pass
      FROM flagged
    `;
  }

  // ============ 2. Нэг онлайн сурагчийн гүнзгий дэлгэц ============
  async getStudentDepth(
    studentId: string,
    actorRole: Role,
    year?: number,
  ) {
    this.assertReadAccess(actorRole);
    const student = await this.assertOnlineStudent(studentId);
    const targetYear = year ?? new Date().getUTCFullYear();

    const [stats, streak, dailyActivity, passes, testResults, chapterEvents, videoEvents] =
      await Promise.all([
        this.attempts.myStats(studentId),
        this.activity.streak(studentId),
        this.activity.yearActivity(studentId, targetYear),
        this.prisma.userPass.findMany({
          where: { userId: studentId },
          include: { pass: { select: { name: true } } },
          orderBy: { startsAt: 'desc' },
        }),
        this.tests.myResults(studentId),
        this.prisma.learningEvent.groupBy({
          by: ['chapterId'],
          where: {
            userId: studentId,
            type: LearningEventType.CHAPTER_OPENED,
            chapterId: { not: null },
          },
          _count: { _all: true },
        }),
        this.prisma.learningEvent.findMany({
          where: {
            userId: studentId,
            type: {
              in: [
                LearningEventType.VIDEO_STARTED,
                LearningEventType.VIDEO_COMPLETED,
              ],
            },
            videoId: { not: null },
          },
          select: { videoId: true, type: true },
        }),
      ]);

    // Бичлэг үзсэн эсэхийг тодорхойлохын тулд videoId -> chapterId харгалзааг
    // Video хүснэгтээс уншина (LearningEvent.videoId бол FK биш, чөлөөт лог тул).
    const videoIds = [...new Set(videoEvents.map((e) => e.videoId!))];
    const videos = videoIds.length
      ? await this.prisma.video.findMany({
          where: { id: { in: videoIds } },
          select: { id: true, chapterId: true },
        })
      : [];
    const videoChapterMap = new Map(videos.map((v) => [v.id, v.chapterId]));
    const completedVideoIds = new Set(
      videoEvents
        .filter((e) => e.type === LearningEventType.VIDEO_COMPLETED)
        .map((e) => e.videoId!),
    );
    const videosWatchedByChapter = new Map<string, Set<string>>();
    for (const vid of completedVideoIds) {
      const chId = videoChapterMap.get(vid);
      if (!chId) continue;
      if (!videosWatchedByChapter.has(chId)) {
        videosWatchedByChapter.set(chId, new Set());
      }
      videosWatchedByChapter.get(chId)!.add(vid);
    }
    const theoryReadChapterIds = new Set(
      chapterEvents.map((c) => c.chapterId!).filter(Boolean),
    );

    const statsByChapter = new Map(stats.chapters.map((c) => [c.chapterId, c]));
    const chapterIds = new Set<string>([
      ...stats.chapters.map((c) => c.chapterId),
      ...theoryReadChapterIds,
      ...videosWatchedByChapter.keys(),
    ]);
    const missingIds = [...chapterIds].filter((id) => !statsByChapter.has(id));
    const missingChapters = missingIds.length
      ? await this.prisma.chapter.findMany({
          where: { id: { in: missingIds } },
          select: { id: true, title: true },
        })
      : [];
    const titleById = new Map<string, string>([
      ...stats.chapters.map((c) => [c.chapterId, c.title] as [string, string]),
      ...missingChapters.map((c) => [c.id, c.title] as [string, string]),
    ]);

    const chapters = [...chapterIds]
      .map((id) => {
        const s = statsByChapter.get(id);
        return {
          chapterId: id,
          title: titleById.get(id) ?? '—',
          theoryRead: theoryReadChapterIds.has(id),
          videosWatched: videosWatchedByChapter.get(id)?.size ?? 0,
          problemsAttempted: s?.attempts ?? 0,
          problemsCorrect: s
            ? Math.round((s.successRate / 100) * s.attempts)
            : 0,
          successRate: s?.successRate ?? null,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'mn'));

    const now = new Date();
    const activePass = passes.find((p) => p.expiresAt > now) ?? null;

    return {
      student: {
        id: student.id,
        studentCode: student.studentCode,
        name: fullName(student),
        grade: student.studentProfile!.grade,
        school: student.studentProfile!.school,
      },
      activePass: activePass
        ? { name: activePass.pass.name, expiresAt: activePass.expiresAt }
        : null,
      passHistory: passes.map((p) => ({
        name: p.pass.name,
        startsAt: p.startsAt,
        expiresAt: p.expiresAt,
      })),
      streak,
      dailyActivity,
      chapters,
      // Сул тал — амжилтын хувиар нь сулаас нь эхлүүлж эрэмбэлсэн (attempts.service.ts-тэй ижил)
      weakestTopics: stats.weakestTags,
      tests: testResults.map((t) => ({
        testId: t.test.id,
        title: t.test.title,
        type: t.test.type,
        totalScore: t.totalScore,
        maxScore: t.maxScore,
        createdAt: t.createdAt,
      })),
    };
  }

  // ============ 3. Хугацааны тэнхлэг (LearningEvent + Attempt нэгтгэл) ============
  async getTimeline(
    studentId: string,
    actorRole: Role,
    from?: string,
    to?: string,
  ) {
    this.assertReadAccess(actorRole);
    await this.assertOnlineStudent(studentId);

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const hasRange = !!(fromDate || toDate);

    const [events, attempts] = await Promise.all([
      this.prisma.learningEvent.findMany({
        where: {
          userId: studentId,
          ...(hasRange
            ? {
                occurredAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              }
            : {}),
        },
        orderBy: { occurredAt: 'desc' },
        take: 300,
      }),
      this.prisma.attempt.findMany({
        where: {
          studentId,
          ...(hasRange
            ? {
                occurredOn: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              }
            : {}),
        },
        include: {
          problem: {
            select: { token: true, chapter: { select: { title: true } } },
          },
        },
        orderBy: { occurredOn: 'desc' },
        take: 300,
      }),
    ]);

    const merged = [
      ...events.map((e) => ({
        kind: 'EVENT' as const,
        at: e.occurredAt,
        type: e.type,
        sessionId: e.sessionId,
        problemId: e.problemId,
        chapterId: e.chapterId,
        videoId: e.videoId,
        testId: e.testId,
        durationMs: e.durationMs,
        meta: e.meta,
      })),
      ...attempts.map((a) => ({
        kind: 'ATTEMPT' as const,
        at: a.occurredOn,
        source: a.source,
        problemToken: a.problem.token,
        chapterTitle: a.problem.chapter.title,
        selfState: a.selfState,
        autoCorrect: a.autoCorrect,
        testId: a.testId,
      })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());

    return { items: merged.slice(0, 300) };
  }

  // ============ 4. Онлайн сурагчид тест олгох ============
  // TestAccess нь Classroom-р түлхүүрлэгддэг тул онлайн сурагчид хүрэхгүй.
  // tests.service.ts-ийн assertStudentAccess яг адилхан "Enrollment+TestAccess
  // ЭСВЭЛ Pass.scope хамрах хүрээ" гэсэн загвараар шийддэг тул бид ЗӨВХӨН
  // хоёр дахь замыг (Pass/UserPass.scope) ашиглана: тухайн тестэд зориулсан
  // dedicated Pass үүсгэж (эсвэл байгааг нь дахин ашиглаж), сурагчид UserPass
  // олгоно. Ингэснээр hasCoveringPass/collectPassScope (common/access.ts) —
  // өөрөөр хэлбэл тестийн бүх байгаа хандалтын логик — шинэ бичлэг нэмэлтгүйгээр
  // онлайн сурагчийг шууд танина.
  async assignTest(
    studentId: string,
    dto: AssignTestDto,
    actorId: string,
    actorRole: Role,
  ) {
    this.assertWriteAccess(actorRole);
    await this.assertOnlineStudent(studentId);

    const test = await this.prisma.test.findUnique({
      where: { id: dto.testId },
      select: { id: true, title: true, deletedAt: true },
    });
    if (!test || test.deletedAt) {
      throw new NotFoundException('Тест олдсонгүй');
    }

    const passName = `ONLINE_TEST_GRANT:${dto.testId}`;
    const pass = await this.prisma.pass.upsert({
      where: { name: passName },
      create: {
        name: passName,
        durationDays: ADHOC_GRANT_DAYS,
        scope: { testIds: [dto.testId] } as Prisma.InputJsonValue,
        active: true,
      },
      update: {},
    });

    const expiresAt = new Date(
      Date.now() + ADHOC_GRANT_DAYS * 24 * 60 * 60 * 1000,
    );
    const existing = await this.prisma.userPass.findFirst({
      where: { userId: studentId, passId: pass.id, expiresAt: { gt: new Date() } },
    });
    const userPass = existing
      ? await this.prisma.userPass.update({
          where: { id: existing.id },
          data: { expiresAt },
        })
      : await this.prisma.userPass.create({
          data: { userId: studentId, passId: pass.id, expiresAt },
        });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'ASSIGN_TEST',
      entity: 'UserPass',
      entityId: userPass.id,
      before: existing ? { expiresAt: existing.expiresAt } : null,
      after: { studentId, testId: dto.testId, testTitle: test.title, expiresAt },
      reason: dto.note,
    });

    return { granted: true, testId: dto.testId, expiresAt };
  }

  // ============ 5. Оролдлого засах ============
  async adjustAttempt(
    studentId: string,
    attemptId: string,
    dto: AdjustAttemptDto,
    actorId: string,
    actorRole: Role,
  ) {
    this.assertWriteAccess(actorRole);
    await this.assertOnlineStudent(studentId);

    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt || attempt.studentId !== studentId) {
      throw new NotFoundException('Оролдлого олдсонгүй');
    }

    const before = {
      selfState: attempt.selfState,
      autoCorrect: attempt.autoCorrect,
    };
    const updated = await this.prisma.attempt.update({
      where: { id: attemptId },
      data: {
        ...(dto.selfState !== undefined ? { selfState: dto.selfState } : {}),
        ...(dto.autoCorrect !== undefined
          ? { autoCorrect: dto.autoCorrect }
          : {}),
      },
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'UPDATE',
      entity: 'Attempt',
      entityId: attemptId,
      before,
      after: { selfState: updated.selfState, autoCorrect: updated.autoCorrect },
    });

    return updated;
  }

  // ============ 6. Оролдлого устгах ============
  // 🚨 АНХААР: Attempt устгах нь аналитикийн түүхийг бодитоор өөрчилнэ —
  // жилийн идэвхийн зураг, стрийк, сэдвийн амжилтын хувь бүгд ДАХИН тооцогдоно.
  // Зөвхөн туршилтын/давхардсан бичлэгийг арилгахад ашиглана, "буруу дүн"
  // гэдэг шалтгаанаар бодит оролдлогыг бүү устга — үүнд PATCH endpoint-ыг ашигла.
  async deleteAttempt(
    studentId: string,
    attemptId: string,
    actorId: string,
    actorRole: Role,
  ) {
    this.assertWriteAccess(actorRole);
    await this.assertOnlineStudent(studentId);

    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt || attempt.studentId !== studentId) {
      throw new NotFoundException('Оролдлого олдсонгүй');
    }

    await this.prisma.attempt.delete({ where: { id: attemptId } });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'DELETE',
      entity: 'Attempt',
      entityId: attemptId,
      before: {
        studentId: attempt.studentId,
        problemId: attempt.problemId,
        source: attempt.source,
        occurredOn: attempt.occurredOn,
        selfState: attempt.selfState,
        autoCorrect: attempt.autoCorrect,
      },
      after: null,
    });

    return { deleted: true };
  }

  // ============ 7. Бүлгийн явцыг цэвэрлэх ============
  // Attempt (аналитикийн түүх) огт хөндөхгүй — зөвхөн LearningEvent-ийн явцын
  // тэмдэглэгээг (онол нээсэн, бичлэг үзсэн, бодлого нээсэн гэх мэт) устгана,
  // ингэснээр сурагч тухайн бүлгийг "шинээр" дахин үзэх боломжтой болно.
  async resetChapter(
    studentId: string,
    dto: ResetChapterDto,
    actorId: string,
    actorRole: Role,
  ) {
    this.assertWriteAccess(actorRole);
    await this.assertOnlineStudent(studentId);

    const chapter = await this.prisma.chapter.findUnique({
      where: { id: dto.chapterId },
      select: { id: true, title: true },
    });
    if (!chapter) throw new NotFoundException('Бүлэг олдсонгүй');

    const [problems, videos] = await Promise.all([
      this.prisma.problem.findMany({
        where: { chapterId: dto.chapterId },
        select: { id: true },
      }),
      this.prisma.video.findMany({
        where: { chapterId: dto.chapterId },
        select: { id: true },
      }),
    ]);
    const problemIds = problems.map((p) => p.id);
    const videoIds = videos.map((v) => v.id);

    const where: Prisma.LearningEventWhereInput = {
      userId: studentId,
      OR: [
        { chapterId: dto.chapterId },
        ...(problemIds.length ? [{ problemId: { in: problemIds } }] : []),
        ...(videoIds.length ? [{ videoId: { in: videoIds } }] : []),
      ],
    };

    const toDelete = await this.prisma.learningEvent.findMany({
      where,
      select: { id: true, type: true },
    });
    if (toDelete.length > 0) {
      await this.prisma.learningEvent.deleteMany({
        where: { id: { in: toDelete.map((e) => e.id) } },
      });
    }

    // Устгах зүйл байхгүй байсан ч (0 event) үйлдлийг аудитлана — багш/админ
    // "цэвэрлэсэн" гэдгээ бүртгүүлж байгаа нь чухал баримт.
    await this.audit.record({
      actorId,
      actorRole,
      action: 'RESET_CHAPTER',
      entity: 'LearningEvent',
      entityId: dto.chapterId,
      before: {
        chapterTitle: chapter.title,
        eventsDeleted: toDelete.length,
        eventTypes: [...new Set(toDelete.map((e) => e.type))],
        studentId,
      },
      after: null,
      reason: dto.reason,
    });

    return { chapterId: dto.chapterId, eventsDeleted: toDelete.length };
  }
}

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ProgressService } from '../progress/progress.service';
import { AttemptsService } from '../attempts/attempts.service';
import { Role, SelfState, StudentType } from '../generated/prisma/enums';
import { todayUB } from '../common/date';

/**
 * Зөөлөн устгал (2-р үе) — эх кодын регрессийн хамгаалалт. Эзний дүрэм
 * (2026-10-23): прод өгөгдлийг ХЭЗЭЭ Ч устгахгүй, «устгах» = deletedAt.
 *
 * Загварууд: ScheduleException, LessonTopic, LessonStaffing,
 * AcademicCalendarDayClassroom, StaffTaskAssignee, ClassTestStatus, TestDraft,
 * Attempt, LearningEvent. Уншилт бүр (findMany/findUnique/count/groupBy…)
 * дуудлагаас хойших 12 мөрөнд deletedAt шүүлттэй, түүхий SQL дахь хүснэгт бүр
 * "deletedAt" IS NULL-тэй, хатуу delete/deleteMany үлдээгүй байх ёстой.
 *
 * Зориуд устсан мөрийг уншдаг газар (UNIQUE/PK-г эзэлсэн мөрийг СЭРГЭЭХ) нь
 * `stored` хувьсагчаар эсвэл «soft-delete: revive» тайлбартай байна.
 */
const root = join(__dirname, '..');
const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== 'generated') walk(p);
    } else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) files.push(p);
  }
};
walk(root);
const sources = files.map((f) => ({
  f: relative(root, f),
  lines: readFileSync(f, 'utf8').split('\n'),
}));

const MODELS =
  'scheduleException|lessonTopic|lessonStaffing|academicCalendarDayClassroom|staffTaskAssignee|classTestStatus|testDraft|attempt|learningEvent';
const TABLES =
  'ScheduleException|LessonTopic|LessonStaffing|AcademicCalendarDayClassroom|StaffTaskAssignee|ClassTestStatus|TestDraft|Attempt|LearningEvent';

describe('Зөөлөн устгал (2-р үе) — эх кодын хамгаалалт', () => {
  it('Prisma уншилт бүр deletedAt-ээр шүүнэ', () => {
    const READ = new RegExp(
      `\\.(${MODELS})\\.(findMany|findUnique|findUniqueOrThrow|findFirst|findFirstOrThrow|count|groupBy|aggregate)\\(`,
    );
    const OK = /deletedAt|soft-delete: revive/;
    const offenders: string[] = [];
    let reads = 0;
    for (const { f, lines } of sources) {
      lines.forEach((line, i) => {
        if (!READ.test(line)) return;
        reads += 1;
        // `const stored = ...findUnique` — устсан мөрийг сэргээхийн тулд зориуд уншина
        if (/\bstored\s*=/.test(line)) return;
        const window = lines.slice(i, i + 12).join('\n');
        // `where` хувьсагчаар дамжуулсан бол тэр хувьсагчийн тодорхойлолтыг шалгана
        const named = /where:\s*(\w+)\b(?!\s*:)/.exec(window) ?? /\(\{\s*where\s*[,}]/.exec(window);
        if (OK.test(window)) return;
        if (named) {
          const v = named[1] ?? 'where';
          const def = lines
            .slice(Math.max(0, i - 40), i)
            .join('\n')
            .split(new RegExp(`\\b(?:const|let)\\s+${v}\\b`))
            .pop()!;
          if (OK.test(def)) return;
        }
        offenders.push(`${f}:${i + 1}`);
      });
    }
    expect(reads).toBeGreaterThan(80);
    expect(offenders).toEqual([]);
  });

  it('холбоосын include/some/none нь устсан мөрийг хасна', () => {
    // Эдгээр загвар руу заасан холбоосын нэрс (schema.prisma)
    const REL =
      /\b(exceptions|topics|staffing|assignees|calendarDayLinks|staffTaskAssignments|testDrafts|learningEvents)\s*:\s*(\{|true)|\battempts\s*:\s*\{\s*(some|none|every|where)/;
    const offenders: string[] = [];
    for (const { f, lines } of sources) {
      lines.forEach((line, i) => {
        if (!REL.test(line)) return;
        const window = lines.slice(i, i + 4).join('\n');
        // бичих үйлдэл (create/connect) эсвэл төрлийн тодорхойлолт биш, уншилт л
        if (/create|connect|increment/.test(window)) return;
        // Prisma-гийн аргумент (select/include/where/some/none) биш бол (TS төрөл, JSON хариу) алгасна
        if (!/:\s*true|\b(select|include|where|some|none|every|orderBy)\b/.test(window)) return;
        if (!/deletedAt|LIVE_ASSIGNEES/.test(window)) offenders.push(`${f}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('түүхий SQL дахь эдгээр хүснэгт "deletedAt" IS NULL-тэй', () => {
    const SQL = new RegExp(`(FROM|JOIN)\\s+"(${TABLES})"`);
    const offenders: string[] = [];
    let hits = 0;
    for (const { f, lines } of sources) {
      lines.forEach((line, i) => {
        if (!SQL.test(line)) return;
        hits += 1;
        if (!/"deletedAt" IS NULL/.test(lines.slice(i, i + 8).join('\n')))
          offenders.push(`${f}:${i + 1}`);
      });
    }
    expect(hits).toBeGreaterThan(25);
    expect(offenders).toEqual([]);
  });

  it('эдгээр загварт хатуу устгал (delete/deleteMany) үлдээгүй', () => {
    const HARD = new RegExp(`\\.(${MODELS})\\.(delete|deleteMany)\\(`);
    const offenders: string[] = [];
    for (const { f, lines } of sources) {
      lines.forEach((line, i) => {
        if (HARD.test(line)) offenders.push(`${f}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe('Attempt / LearningEvent — «устгах» = deletedAt', () => {
  const onlineStudent = {
    id: 's1',
    role: Role.STUDENT,
    studentProfile: { type: StudentType.ONLINE },
  };
  const progress = (prisma: any, audit = { record: jest.fn(async () => undefined) }) =>
    new ProgressService(prisma, {} as any, {} as any, {} as any, audit as any);

  it('DELETE оролдлого: мөр deletedAt-тай үлдэж аудит бичнэ; устсаныг дахин устгахад 404', async () => {
    const prisma: any = {
      user: { findUnique: jest.fn(async () => onlineStudent) },
      attempt: {
        findUnique: jest.fn(async () => ({ id: 'a1', studentId: 's1', problemId: 'p1' })),
        update: jest.fn(async () => ({})),
      },
    };
    const audit = { record: jest.fn(async () => undefined) };
    await progress(prisma, audit).deleteAttempt('s1', 'a1', 'tp', Role.TEACHER_PLUS);
    expect(prisma.attempt.findUnique).toHaveBeenCalledWith({ where: { id: 'a1', deletedAt: null } });
    expect(prisma.attempt.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { deletedAt: expect.any(Date), deletedById: 'tp' },
    });
    expect(prisma.attempt.delete).toBeUndefined();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE', entity: 'Attempt' }));
    prisma.attempt.findUnique.mockResolvedValueOnce(null);
    await expect(
      progress(prisma).deleteAttempt('s1', 'a1', 'tp', Role.TEACHER_PLUS),
    ).rejects.toThrow('Оролдлого');
  });

  it('бүлгийн явц цэвэрлэх: зөвхөн идэвхтэй үйл явдлыг deletedAt-аар хасна', async () => {
    const prisma: any = {
      user: { findUnique: jest.fn(async () => onlineStudent) },
      chapter: { findUnique: jest.fn(async () => ({ id: 'ch1', title: 'Бүлэг' })) },
      problem: { findMany: jest.fn(async () => [{ id: 'p1' }]) },
      video: { findMany: jest.fn(async () => []) },
      learningEvent: {
        findMany: jest.fn(async () => [{ id: 'e1', type: 'CHAPTER_OPENED' }]),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
    };
    const out = await progress(prisma).resetChapter(
      's1',
      { chapterId: 'ch1', reason: 'дахин үзэх' } as any,
      'tp',
      Role.TEACHER_PLUS,
    );
    expect(out).toEqual({ chapterId: 'ch1', eventsDeleted: 1 });
    expect(prisma.learningEvent.findMany.mock.calls[0][0].where).toMatchObject({ userId: 's1', deletedAt: null });
    expect(prisma.learningEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['e1'] }, deletedAt: null },
      data: { deletedAt: expect.any(Date), deletedById: 'tp' },
    });
    expect(prisma.learningEvent.deleteMany).toBeUndefined();
  });

  it('оройн тэмдэглэгээг дахин илгээхэд өмнөхийг ЗӨӨЛӨН сольно', async () => {
    const tx: any = {
      attempt: {
        updateMany: jest.fn(async () => ({ count: 1 })),
        createManyAndReturn: jest.fn(async () => [{ id: 'new', mistakeCollectedAt: new Date() }]),
      },
    };
    const prisma: any = {
      enrollment: {
        findMany: jest.fn(async () => [
          { classroomId: 'c1', joinedAt: new Date(), classroom: { id: 'c1', name: '12-1', subject: null, grade: 12 } },
        ]),
      },
      problem: { findMany: jest.fn(async () => []) },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    };
    const mistakes: any = { collectAttemptsInBackground: jest.fn() };
    const svc = new AttemptsService(prisma, mistakes);
    await svc.eveningReport(
      { entries: [{ problemId: 'p1', selfState: SelfState.SOLVED_CLEAN }] } as any,
      's1',
    );
    expect(tx.attempt.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        studentId: 's1',
        classroomId: 'c1',
        occurredOn: todayUB(),
        problemId: { in: ['p1'] },
        deletedAt: null,
      }),
      data: { deletedAt: expect.any(Date), deletedById: 's1' },
    });
    expect(tx.attempt.deleteMany).toBeUndefined();
  });
});

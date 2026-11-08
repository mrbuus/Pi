import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { HomeworkQuizService } from './homework-quiz.service';

/**
 * Шалгалтаар даалгавар шалгах (эзэн 2026-11-08) — бизнесийн дүрэм. Prisma-г санах ойн жижиг
 * хуурамчаар орлуулна (зөвхөн энэ сервисийн дуудлагууд).
 */
type Quiz = {
  id: string;
  classroomId: string;
  date: Date;
  problemCount: number;
  createdById: string;
  updatedById: string;
  updatedAt: Date;
  deletedAt: Date | null;
};
type Score = {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  updatedById: string;
  updatedAt: Date;
  deletedAt: Date | null;
};

function makeFake(enrolled = ['s1', 's2', 's3']) {
  const quizzes: Quiz[] = [];
  const scores: Score[] = [];
  const audits: any[] = [];
  let seq = 0;
  const key = (w: any) => w.classroomId_date;
  const findQuiz = (w: any) =>
    quizzes.find((q) => q.classroomId === key(w).classroomId && q.date.getTime() === key(w).date.getTime()) ?? null;
  const findScore = (w: any) =>
    w.id
      ? (scores.find((s) => s.id === w.id) ?? null)
      : (scores.find((s) => s.quizId === w.quizId_studentId.quizId && s.studentId === w.quizId_studentId.studentId) ?? null);
  const prisma: any = {
    classroom: { findUnique: async () => ({ id: 'c1', archived: false }) },
    user: { findUnique: async () => ({ firstName: 'Болор', lastName: 'Дорж', role: 'TEACHER' }) },
    enrollment: {
      findFirst: async ({ where }: any) => (enrolled.includes(where.studentId) ? { id: 'e' } : null),
    },
    homeworkQuiz: {
      findUnique: async ({ where, include }: any) => {
        const q = findQuiz(where);
        if (!q) return null;
        return include ? { ...q, scores: scores.filter((s) => s.quizId === q.id && !s.deletedAt) } : { ...q };
      },
      upsert: async ({ where, create, update }: any) => {
        const q = findQuiz(where);
        if (q) {
          Object.assign(q, update, { updatedAt: new Date() });
          return { ...q };
        }
        const row = { id: `q${++seq}`, ...create, ...key(where), updatedAt: new Date(), deletedAt: null };
        quizzes.push(row);
        return { ...row };
      },
      update: async ({ where, data }: any) => {
        const q = quizzes.find((x) => x.id === where.id)!;
        Object.assign(q, data);
        return { ...q };
      },
    },
    homeworkQuizScore: {
      count: async ({ where }: any) =>
        scores.filter((s) => s.quizId === where.quizId && !s.deletedAt && s.score > where.score.gt).length,
      findUnique: async ({ where }: any) => {
        const s = findScore(where);
        return s ? { ...s } : null;
      },
      update: async ({ where, data }: any) => {
        const s = findScore(where)!;
        Object.assign(s, data, { updatedAt: new Date() });
        return { ...s };
      },
      upsert: async ({ where, create, update }: any) => {
        const s = findScore(where);
        if (s) {
          Object.assign(s, update, { updatedAt: new Date() });
          return { ...s };
        }
        const row = { id: `sc${++seq}`, ...create, updatedAt: new Date(), deletedAt: null };
        scores.push(row);
        return { ...row };
      },
      updateMany: async ({ where, data }: any) => {
        const hit = scores.filter((s) => s.quizId === where.quizId && !s.deletedAt);
        hit.forEach((s) => Object.assign(s, data));
        return { count: hit.length };
      },
      findMany: async ({ where }: any) =>
        scores
          .filter((s) => s.studentId === where.studentId && !s.deletedAt)
          .map((s) => ({ s, q: quizzes.find((q) => q.id === s.quizId)! }))
          .filter(
            ({ q }) =>
              q.classroomId === where.quiz.classroomId &&
              !q.deletedAt &&
              q.date >= where.quiz.date.gte &&
              q.date <= where.quiz.date.lte,
          )
          .map(({ s, q }) => ({ score: s.score, quiz: { date: q.date, problemCount: q.problemCount } })),
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  const audit = {
    record: async (a: any) => {
      audits.push(a);
    },
  };
  const service = new HomeworkQuizService(prisma, audit as any);
  return { service, quizzes, scores, audits };
}

const T = Role.TEACHER;
const D = '2026-11-08';

describe('HomeworkQuizService', () => {
  it('эхлүүлэх → харах → оноо → дундажгүй ч жагсаалтад', async () => {
    const { service, audits } = makeFake();
    const v = await service.set('c1', { date: D, problemCount: 10 }, 'u1', T);
    expect(v.quiz?.problemCount).toBe(10);
    expect(v.quiz?.updatedBy).toBe('Д. Болор');
    await service.setScore('c1', 's1', { date: D, score: 8 }, 'u1', T);
    await service.setScore('c1', 's2', { date: D, score: 0 }, 'u1', T);
    const got = await service.get('c1', D, 'u1', T);
    expect(got.scores.map((s) => [s.studentId, s.score]).sort()).toEqual([
      ['s1', 8],
      ['s2', 0],
    ]);
    expect(audits.map((a) => `${a.entity}:${a.action}`)).toEqual([
      'HomeworkQuiz:CREATE',
      'HomeworkQuizScore:CREATE',
      'HomeworkQuizScore:CREATE',
    ]);
  });

  it('шалгалтгүй өдөр оноо бичихгүй', async () => {
    const { service } = makeFake();
    await expect(service.setScore('c1', 's1', { date: D, score: 3 }, 'u1', T)).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([11, -1, 2.5])('оноо %p — 0..бодлогын тоо бүхэл биш бол татгалзана', async (score) => {
    const { service } = makeFake();
    await service.set('c1', { date: D, problemCount: 10 }, 'u1', T);
    await expect(service.setScore('c1', 's1', { date: D, score }, 'u1', T)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('оноо дутуу (undefined) бол 400, ангид байхгүй сурагч 404', async () => {
    const { service } = makeFake();
    await service.set('c1', { date: D, problemCount: 10 }, 'u1', T);
    await expect(service.setScore('c1', 's1', { date: D }, 'u1', T)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.setScore('c1', 'gone', { date: D, score: 1 }, 'u1', T)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('цэвэрлэх = deletedAt (мөр үлдэнэ), дахин бичвэл сэргэнэ', async () => {
    const { service, scores, audits } = makeFake();
    await service.set('c1', { date: D, problemCount: 10 }, 'u1', T);
    await service.setScore('c1', 's1', { date: D, score: 7 }, 'u1', T);
    const cleared = await service.setScore('c1', 's1', { date: D, score: null }, 'u2', T);
    expect(cleared.score).toBeNull();
    expect(scores).toHaveLength(1);
    expect(scores[0].deletedAt).not.toBeNull();
    expect((await service.get('c1', D, 'u1', T)).scores).toEqual([]);
    await service.setScore('c1', 's1', { date: D, score: 9 }, 'u1', T);
    expect(scores).toHaveLength(1);
    expect(scores[0]).toMatchObject({ score: 9, deletedAt: null });
    expect(audits.slice(-2).map((a) => a.action)).toEqual(['DELETE', 'RESTORE']);
  });

  it('ижил оноог дахин илгээхэд аудит нэмэхгүй', async () => {
    const { service, audits } = makeFake();
    await service.set('c1', { date: D, problemCount: 10 }, 'u1', T);
    await service.setScore('c1', 's1', { date: D, score: 7 }, 'u1', T);
    const n = audits.length;
    await service.setScore('c1', 's1', { date: D, score: 7 }, 'u1', T);
    expect(audits).toHaveLength(n);
  });

  it('бодлогын тоог онооноос бага болгохгүй, их болгож болно', async () => {
    const { service } = makeFake();
    await service.set('c1', { date: D, problemCount: 10 }, 'u1', T);
    await service.setScore('c1', 's1', { date: D, score: 9 }, 'u1', T);
    await service.setScore('c1', 's2', { date: D, score: 4 }, 'u1', T);
    await expect(service.set('c1', { date: D, problemCount: 8 }, 'u1', T)).rejects.toThrow('1 сурагчийн оноо 8 бодлогоос давж байна');
    expect((await service.set('c1', { date: D, problemCount: 9 }, 'u1', T)).quiz?.problemCount).toBe(9);
    expect((await service.set('c1', { date: D, problemCount: 12 }, 'u1', T)).quiz?.problemCount).toBe(12);
  });

  it.each([0, 201, 3.5])('бодлогын тоо %p — татгалзана', async (n) => {
    const { service } = makeFake();
    await expect(service.set('c1', { date: D, problemCount: n }, 'u1', T)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('устгах = шалгалт, оноо хоёул deletedAt; дахин эхлүүлэхэд ижил мөр, оноо хоосон', async () => {
    const { service, quizzes, scores, audits } = makeFake();
    await service.set('c1', { date: D, problemCount: 10 }, 'u1', T);
    await service.setScore('c1', 's1', { date: D, score: 9 }, 'u1', T);
    const v = await service.remove('c1', D, 'u1', T);
    expect(v.quiz).toBeNull();
    expect(quizzes[0].deletedAt).not.toBeNull();
    expect(scores[0].deletedAt).not.toBeNull();
    expect(audits.at(-1)).toMatchObject({ action: 'DELETE', entity: 'HomeworkQuiz' });
    // Устгасан шалгалтад оноо бичихгүй
    await expect(service.setScore('c1', 's1', { date: D, score: 1 }, 'u1', T)).rejects.toBeInstanceOf(NotFoundException);
    const again = await service.set('c1', { date: D, problemCount: 5 }, 'u1', T);
    expect(quizzes).toHaveLength(1);
    expect(again.quiz).toMatchObject({ id: quizzes[0].id, problemCount: 5 });
    expect(again.scores).toEqual([]);
    expect(audits.at(-1)).toMatchObject({ action: 'RESTORE' });
    // Сэргээхэд хуучин 9 оноо (5-аас их) саад болохгүй — тэр нь нуугдсан
    expect(scores[0].deletedAt).not.toBeNull();
  });

  it('сурагчийн сар: зөвхөн энэ ангийн, устгаагүй, тэр сарын', async () => {
    const { service } = makeFake();
    await service.set('c1', { date: '2026-11-03', problemCount: 10 }, 'u1', T);
    await service.setScore('c1', 's1', { date: '2026-11-03', score: 8 }, 'u1', T);
    await service.set('c1', { date: '2026-10-30', problemCount: 4 }, 'u1', T);
    await service.setScore('c1', 's1', { date: '2026-10-30', score: 1 }, 'u1', T);
    await service.set('c1', { date: D, problemCount: 6 }, 'u1', T);
    await service.setScore('c1', 's1', { date: D, score: 6 }, 'u1', T);
    await service.remove('c1', D, 'u1', T);
    expect(await service.studentMonth('c1', 's1', '2026-11', 'u1', T)).toEqual([
      { date: '2026-11-03', score: 8, problemCount: 10 },
    ]);
    await expect(service.studentMonth('c1', 's1', '2026-13', 'u1', T)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('сурагч, эцэг эх хандахгүй (эрх = самбарт тэмдэглэх эрх)', async () => {
    const { service } = makeFake();
    await expect(service.get('c1', D, 'u1', Role.STUDENT)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.get('c1', D, 'u1', Role.PARENT)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('буруу огноо — 400', async () => {
    const { service } = makeFake();
    await expect(service.get('c1', '2026-11-xx', 'u1', T)).rejects.toBeInstanceOf(BadRequestException);
  });
});

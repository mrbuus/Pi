import { homeworkFor } from '../student-hub/student-hub.logic';
import { loadStudentQuizzes } from './student-quizzes';

/** Сурагч, эцэг эхэд шалгалтын оноо харуулах (эзэн 2026-11-08 19:08) */
describe('loadStudentQuizzes', () => {
  const rows = [
    { score: '7.50', quiz: { classroomId: 'c1', date: new Date('2026-11-06T00:00:00Z'), problemCount: 10 } },
    { score: '3.00', quiz: { classroomId: 'c2', date: new Date('2026-11-04T00:00:00Z'), problemCount: 4 } },
  ];
  function fake() {
    const calls: any[] = [];
    const prisma: any = {
      homeworkQuizScore: {
        findMany: async (args: any) => {
          calls.push(args);
          return rows;
        },
      },
      classroom: {
        findMany: async () => [
          { id: 'c1', name: '12-3' },
          { id: 'c2', name: '11-1' },
        ],
      },
    };
    return { prisma, calls };
  }

  it('зөвхөн тухайн сурагчийн, устгаагүй шалгалт/оноо; Decimal → тоо; ангийн нэртэй', async () => {
    const { prisma, calls } = fake();
    const out = await loadStudentQuizzes(prisma, 'stu', { take: 14 });
    expect(calls[0].where).toEqual({ studentId: 'stu', deletedAt: null, quiz: { deletedAt: null } });
    expect(calls[0].take).toBe(14);
    expect(calls[0].orderBy).toEqual({ quiz: { date: 'desc' } });
    expect(out).toEqual([
      { classroomId: 'c1', classroom: '12-3', date: '2026-11-06', score: 7.5, problemCount: 10 },
      { classroomId: 'c2', classroom: '11-1', date: '2026-11-04', score: 3, problemCount: 4 },
    ]);
  });

  it('хугацаа ба ангиар шүүнэ (долоо хоногийн тайлан)', async () => {
    const { prisma, calls } = fake();
    const from = new Date('2026-11-02T00:00:00Z');
    const to = new Date('2026-11-08T00:00:00Z');
    await loadStudentQuizzes(prisma, 'stu', { from, to, classroomIds: ['c1'] });
    expect(calls[0].where.quiz).toEqual({ deletedAt: null, date: { gte: from, lte: to }, classroomId: { in: ['c1'] } });
  });
});

describe('homeworkFor — D өдрийн даалгаврыг D′ өдөр шалгалтаар шалгасан', () => {
  const days = ['2026-11-02', '2026-11-04', '2026-11-06'];
  it('D′ өдрийн оноо хавсарна, байхгүй бол талбаргүй', () => {
    const quizzes = new Map([['c1|2026-11-04', { score: 7.5, problemCount: 10 }]]);
    expect(homeworkFor('c1', '2026-11-02', days, new Map(), quizzes)).toEqual({
      status: null,
      comment: null,
      checkedOn: '2026-11-04',
      quiz: { score: 7.5, problemCount: 10 },
    });
    expect(homeworkFor('c1', '2026-11-04', days, new Map(), quizzes)).not.toHaveProperty('quiz');
    // Өөр ангийн оноо холилдохгүй
    expect(homeworkFor('c2', '2026-11-02', ['2026-11-02', '2026-11-04'], new Map(), quizzes)).not.toHaveProperty('quiz');
  });
});

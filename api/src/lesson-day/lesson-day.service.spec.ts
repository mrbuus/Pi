import { LessonDayService } from './lesson-day.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';

const D = (k: string) => new Date(`${k}T00:00:00.000Z`);

function model() {
  return {
    findUnique: jest.fn(async (): Promise<any> => null),
    findFirst: jest.fn(async (): Promise<any> => null),
    findMany: jest.fn(async (): Promise<any[]> => []),
    count: jest.fn(async () => 0),
    upsert: jest.fn(async (): Promise<any> => ({ imageKeys: [] })),
    updateMany: jest.fn(async () => ({ count: 0 })),
    create: jest.fn(async () => ({})),
    update: jest.fn(async () => ({})),
    delete: jest.fn(async () => ({})),
  };
}

describe('LessonDayService — нөхөх хичээл, онолын зураг', () => {
  let db: any;
  let service: LessonDayService;
  beforeEach(() => {
    db = {};
    for (const m of [
      'classroom',
      'classSchedule',
      'lessonStaffing',
      'attendance',
      'enrollment',
      'classTestSession',
      'test',
      'testResult',
      'lessonMakeup',
      'user',
      'testAccess',
      'lessonTopic',
      'lessonPhoto',
      'storedFile',
    ])
      db[m] = model();
    db.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) => fn(db));
    db.$queryRaw = jest.fn(async () => []);
    db.classroom.findUnique.mockResolvedValue({ id: 'c1', name: 'QA', teacherId: 'owner', assistantTeacherId: 'helper' });
    db.attendance.findMany.mockResolvedValue([
      { classroomId: 'c1', studentId: 's1', date: D('2026-10-10'), status: 'LATE', student: { firstName: 'Бат', lastName: 'Дорж' }, classroom: { name: 'QA' } },
      { classroomId: 'c1', studentId: 's2', date: D('2026-10-12'), status: 'ABSENT', student: { firstName: 'Сараа', lastName: 'Болд' }, classroom: { name: 'QA' } },
    ]);
    db.enrollment.findMany.mockResolvedValue([
      { classroomId: 'c1', studentId: 's1' },
      { classroomId: 'c1', studentId: 's2' },
    ]);
    db.classTestSession.findMany.mockResolvedValue([
      { classroomId: 'c1', date: D('2026-10-10'), testId: 'tA' },
      { classroomId: 'c1', date: D('2026-10-12'), testId: 'tA' },
    ]);
    const tests = [
      { id: 'tA', title: 'Тест 1', groupKey: 'g1', variantLabel: 'A', gradingMode: 'AUTO', _count: { problems: 5 } },
      { id: 'tB', title: 'Тест 1', groupKey: 'g1', variantLabel: 'B', gradingMode: 'AUTO', _count: { problems: 5 } },
    ];
    db.test.findMany.mockImplementation(async (args: any) =>
      args.where.groupKey ? tests : tests.filter((t) => args.where.id.in.includes(t.id)),
    );
    db.lessonMakeup.findMany.mockResolvedValue([
      { classroomId: 'c1', studentId: 's2', date: D('2026-10-12'), imageKeys: ['n.jpg'], submittedAt: new Date(), confirmedById: 'owner', confirmedAt: new Date(), note: 'WAIVED\nӨвчтэй' },
    ]);
    service = new LessonDayService(db as PrismaService);
  });

  const staff = (userId: string, role: Role) => ({ userId, role });

  it('хоцорсон сурагчид зөвхөн B, тасалсанд A+B; шийдвэр ба тэмдэглэл ажилтанд', async () => {
    const rows = await service.classroomMakeups(staff('x', Role.TEACHER_PLUS), 'c1', { from: '2026-10-01', to: '2026-10-31' });
    const late = rows.find((r) => r.studentId === 's1')!;
    expect(late.reason).toBe('LATE');
    expect(late.tests.map((t) => [t.testId, t.done])).toEqual([
      ['tA', true],
      ['tB', false],
    ]);
    expect(late.status).toBe('PENDING');
    const absent = rows.find((r) => r.studentId === 's2')!;
    expect(absent.tests.map((t) => t.testId)).toEqual(['tA', 'tB']);
    expect(absent.status).toBe('WAIVED');
    expect(absent.note).toBe('Өвчтэй');
  });

  it('энгийн Багш: ангийн багш/туслах — бүх өдөр; бусад — 403', async () => {
    await expect(service.classroomMakeups(staff('helper', Role.TEACHER), 'c1', { date: '2026-10-10' })).resolves.toBeInstanceOf(Array);
    await expect(service.classroomMakeups(staff('random', Role.TEACHER), 'c1', { date: '2026-10-10' })).rejects.toMatchObject({ status: 403 });
  });

  it('тухайн өдрийн ахлах/туслах багш зөвхөн тэр өдрийнхийг харна', async () => {
    db.lessonStaffing.findMany.mockResolvedValue([{ date: D('2026-10-12') }]);
    const rows = await service.classroomMakeups(staff('sub', Role.TEACHER), 'c1', { from: '2026-10-01', to: '2026-10-31' });
    expect(rows.map((r) => r.date)).toEqual(['2026-10-12']);
    await expect(
      service.decide(staff('sub', Role.TEACHER), 'c1', 's1', '2026-10-10', 'CONFIRM'),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('огноо/хүрээгүй хүсэлт 400', async () => {
    await expect(service.classroomMakeups(staff('x', Role.ADMIN), 'c1', {})).rejects.toMatchObject({ status: 400 });
    await expect(service.classroomMakeups(staff('x', Role.ADMIN), 'c1', { date: '2026-02-30' })).rejects.toMatchObject({ status: 400 });
  });

  it('батлах нь шийдвэрийг note-д кодлож хадгална', async () => {
    db.attendance.findMany.mockImplementation(async (args: any) =>
      [
        { classroomId: 'c1', studentId: 's1', date: D('2026-10-10'), status: 'LATE', student: { firstName: 'Бат', lastName: 'Дорж' }, classroom: { name: 'QA' } },
      ].filter((a) => !args.where.studentId || a.studentId === args.where.studentId),
    );
    await service.decide(staff('owner', Role.TEACHER), 'c1', 's1', '2026-10-10', 'CONFIRM', 'Цаасаар хийсэн');
    expect(db.lessonMakeup.upsert.mock.calls[0][0].update).toMatchObject({
      confirmedById: 'owner',
      note: 'CONFIRMED\nЦаасаар хийсэн',
    });
  });

  it('батлахад нөхөх зураг 14 хоногийн дараа устахаар, дахин нээхэд хугацаагүй болно', async () => {
    db.attendance.findMany.mockImplementation(async (args: any) =>
      [
        { classroomId: 'c1', studentId: 's1', date: D('2026-10-10'), status: 'LATE', student: { firstName: 'Бат', lastName: 'Дорж' }, classroom: { name: 'QA' } },
      ].filter((a) => !args.where.studentId || a.studentId === args.where.studentId),
    );
    db.lessonMakeup.upsert.mockResolvedValue({ imageKeys: ['n.pdf'] });
    const before = Date.now();
    await service.decide(staff('owner', Role.TEACHER), 'c1', 's1', '2026-10-10', 'CONFIRM');
    const set = db.storedFile.updateMany.mock.calls[0][0];
    expect(set.where).toEqual({ key: { in: ['n.pdf'] }, ownerId: 's1' });
    const days = (set.data.expiresAt.getTime() - before) / 86400000;
    expect(days).toBeGreaterThan(13.99);
    expect(days).toBeLessThan(14.01);
    await service.decide(staff('owner', Role.TEACHER), 'c1', 's1', '2026-10-10', 'REOPEN');
    expect(db.storedFile.updateMany.mock.calls[1][0].data).toEqual({ expiresAt: null });
  });

  it('сурагчид ажилтны тэмдэглэл, шийдвэр гаргагч очихгүй; зөвхөн өөрийнх нь асуулга', async () => {
    const mine = await service.myMakeups('s2');
    expect(db.attendance.findMany.mock.calls[0][0].where.studentId).toBe('s2');
    const json = JSON.stringify(mine);
    expect(json).not.toContain('Өвчтэй');
    expect(json).not.toContain('owner');
    expect(mine[0]).not.toHaveProperty('note');
  });

  it('нөхөх зураг: бусдын файлыг хавсаргахгүй', async () => {
    db.attendance.findMany.mockResolvedValue([
      { classroomId: 'c1', studentId: 's1', date: D('2026-10-10'), status: 'LATE', student: { firstName: 'Бат', lastName: 'Дорж' }, classroom: { name: 'QA' } },
    ]);
    db.lessonMakeup.findMany.mockResolvedValue([]);
    db.storedFile.findMany.mockResolvedValue([]);
    await expect(service.submitMakeupPhotos('s1', 'c1', '2026-10-10', ['foreign.jpg'])).rejects.toMatchObject({ status: 403 });
    db.storedFile.findMany.mockResolvedValue([{ key: 'mine.jpg', mime: 'image/jpeg' }]);
    await service.submitMakeupPhotos('s1', 'c1', '2026-10-10', ['mine.jpg']);
    expect(db.storedFile.findMany.mock.calls[1][0].where).toEqual({ key: { in: ['mine.jpg'] }, ownerId: 's1' });
    expect(db.lessonMakeup.upsert.mock.calls[0][0].create).toMatchObject({ imageKeys: ['mine.jpg'] });
  });

  it('нөхөх хичээлгүй өдөр сурагч зураг илгээж чадахгүй (404)', async () => {
    db.attendance.findMany.mockResolvedValue([]);
    await expect(service.submitMakeupPhotos('s9', 'c1', '2026-10-10', [])).rejects.toMatchObject({ status: 404 });
  });

  it('онолын зураг: томилогдоогүй сурагч илгээхгүй, томилогдсон нь илгээнэ', async () => {
    db.enrollment.findFirst.mockResolvedValue({ id: 'e' });
    db.lessonTopic.findMany.mockResolvedValue([{ testIds: ['tA'], photoStudentId: 's1' }]);
    await expect(
      service.uploadDayPhotos(staff('s2', Role.STUDENT), 'c1', '2026-10-10', ['x.jpg']),
    ).rejects.toMatchObject({ status: 403 });
    db.storedFile.findMany.mockResolvedValue([{ key: 'p.jpg', mime: 'image/png' }]);
    await service.uploadDayPhotos(staff('s1', Role.STUDENT), 'c1', '2026-10-10', ['p.jpg']);
    expect(db.lessonPhoto.create.mock.calls[0][0].data).toMatchObject({
      classroomId: 'c1',
      studentId: 's1',
      imageKeys: ['p.jpg'],
      testIds: ['tA'],
    });
    expect(db.lessonTopic.findMany.mock.calls[0][0].select).not.toHaveProperty('dismissMode');
  });

  it('онолын зураг: ангид хамааралгүй сурагч харахгүй', async () => {
    db.enrollment.findFirst.mockResolvedValue(null);
    await expect(service.dayPhotos(staff('s7', Role.STUDENT), 'c1', '2026-10-10')).rejects.toMatchObject({ status: 403 });
  });
});

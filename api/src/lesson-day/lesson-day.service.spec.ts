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
      'lessonRecord',
      'chapter',
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

  it('шинээр илгээхэд солигдсон хуучин тэмдэглэл 14 хоногийн дараа устахаар тэмдэглэгдэнэ', async () => {
    db.attendance.findMany.mockResolvedValue([
      { classroomId: 'c1', studentId: 's1', date: D('2026-10-10'), status: 'LATE', student: { firstName: 'Бат', lastName: 'Дорж' }, classroom: { name: 'QA' } },
    ]);
    db.lessonMakeup.findUnique.mockResolvedValue({ imageKeys: ['old.pdf'] });
    db.storedFile.findMany.mockResolvedValue([{ key: 'new.pdf', mime: 'application/pdf', pages: 2 }]);
    await service.submitMakeupPhotos('s1', 'c1', '2026-10-10', ['new.pdf']).catch(() => undefined);
    const call = db.storedFile.updateMany.mock.calls.find((c: any) => c[0].where.key.in.includes('old.pdf'));
    expect(call?.[0].where).toEqual({ key: { in: ['old.pdf'] }, ownerId: 's1', expiresAt: null });
    expect(call?.[0].data.expiresAt).toBeInstanceOf(Date);
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

  describe('онолын зураг илгээх (СУРАГЧ V2, эзэн 2026-10-31)', () => {
    // УБ 2026-10-24 18:00
    beforeEach(() => jest.useFakeTimers({ now: new Date('2026-10-24T10:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] }));
    afterEach(() => jest.useRealTimers());

    it('томилогдоогүй ч ангийн гишүүн сурагч илгээнэ; томилолт зөвхөн тэмдэг', async () => {
      db.enrollment.findFirst.mockResolvedValue({ id: 'e' });
      db.lessonTopic.findMany.mockResolvedValue([{ testIds: ['tA'], photoStudentId: 's1' }]);
      db.storedFile.findMany.mockResolvedValue([{ key: 'x.jpg', mime: 'image/jpeg' }]);
      const res = await service.uploadDayPhotos(staff('s2', Role.STUDENT), 'c1', '2026-10-20', ['x.jpg']);
      expect(db.lessonPhoto.create.mock.calls[0][0].data).toMatchObject({
        classroomId: 'c1',
        studentId: 's2',
        imageKeys: ['x.jpg'],
        testIds: ['tA'],
      });
      expect(res.canUpload).toBe(true);
      expect(res.assignedToMe).toBe(false);
      expect(res.uploader).toMatchObject({ isMe: false });
      expect(res.uploader).not.toHaveProperty('studentId');
      expect(db.lessonTopic.findMany.mock.calls[0][0].select).not.toHaveProperty('dismissMode');
    });

    it('өдрийн сэдэв, зураг бүрийн isAssigned; сурагчид id очихгүй', async () => {
      db.enrollment.findFirst.mockResolvedValue({ id: 'e' });
      db.lessonTopic.findMany.mockResolvedValue([
        { testIds: [], photoStudentId: 's1', title: 'Сэдэв', chapterId: null },
      ]);
      db.lessonPhoto.findMany.mockResolvedValue([
        { id: 'p1', studentId: 's1', imageKeys: ['a.jpg'], createdAt: new Date() },
        { id: 'p2', studentId: 's2', imageKeys: ['b.jpg'], createdAt: new Date() },
      ]);
      const res = await service.dayPhotos(staff('s2', Role.STUDENT), 'c1', '2026-10-24');
      expect(res.topic).toBe('Сэдэв');
      expect(res.assignedToMe).toBe(false);
      expect(res.photos.map((p) => [p.id, p.isAssigned, p.isMine])).toEqual([
        ['p1', true, false],
        ['p2', false, true],
      ]);
      expect(JSON.stringify(res)).not.toMatch(/"s1"|"s2"|studentId/);
      // Батлагдсан бүртгэлийн сэдэв давамгайлна; description сонгогдохгүй
      db.lessonRecord.findMany.mockResolvedValue([{ topic: 'Батлагдсан' }]);
      expect((await service.dayPhotos(staff('s2', Role.STUDENT), 'c1', '2026-10-24')).topic).toBe('Батлагдсан');
      expect(db.lessonRecord.findMany.mock.calls[0][0].select).toEqual({ topic: true });
    });

    it('сэдвийн гарчиг хоосон бол бүлгийн нэр, юу ч үгүй бол null', async () => {
      db.enrollment.findFirst.mockResolvedValue({ id: 'e' });
      db.lessonTopic.findMany.mockResolvedValue([{ testIds: [], photoStudentId: null, title: ' ', chapterId: 'ch1' }]);
      db.chapter.findMany.mockResolvedValue([{ title: 'Вектор' }]);
      expect((await service.dayPhotos(staff('s2', Role.STUDENT), 'c1', '2026-10-24')).topic).toBe('Вектор');
      db.lessonTopic.findMany.mockResolvedValue([]);
      expect((await service.dayPhotos(staff('s2', Role.STUDENT), 'c1', '2026-10-24')).topic).toBeNull();
    });

    it('томилогдсон сурагчид assignedToMe = true', async () => {
      db.enrollment.findFirst.mockResolvedValue({ id: 'e' });
      db.lessonTopic.findMany.mockResolvedValue([{ testIds: [], photoStudentId: 's1' }]);
      const res = await service.dayPhotos(staff('s1', Role.STUDENT), 'c1', '2026-10-24');
      expect(res).toMatchObject({ canUpload: true, assignedToMe: true, uploader: { isMe: true } });
    });

    it('14 хоногоос өмнөх өдөр сурагч илгээхгүй (403), харах нь хэвээр', async () => {
      db.enrollment.findFirst.mockResolvedValue({ id: 'e' });
      await expect(
        service.uploadDayPhotos(staff('s2', Role.STUDENT), 'c1', '2026-10-10', ['x.jpg']),
      ).rejects.toMatchObject({ status: 403 });
      expect(db.lessonPhoto.create).not.toHaveBeenCalled();
      const view = await service.dayPhotos(staff('s2', Role.STUDENT), 'c1', '2026-10-10');
      expect(view.canUpload).toBe(false);
      // 13 хоногийн өмнөх өдөр — цонхны эхлэл
      const edge = await service.dayPhotos(staff('s2', Role.STUDENT), 'c1', '2026-10-11');
      expect(edge.canUpload).toBe(true);
    });

    it('ирээдүйн өдөр 400, ангид хамааралгүй сурагч 403', async () => {
      await expect(
        service.uploadDayPhotos(staff('s2', Role.STUDENT), 'c1', '2026-10-25', ['x.jpg']),
      ).rejects.toMatchObject({ status: 400 });
      db.enrollment.findFirst.mockResolvedValue(null);
      await expect(
        service.uploadDayPhotos(staff('s9', Role.STUDENT), 'c1', '2026-10-24', ['x.jpg']),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('ажилтны дүрэм хэвээр: 14 хоногоос өмнөх өдөр ч илгээнэ', async () => {
      db.storedFile.findMany.mockResolvedValue([{ key: 't.jpg', mime: 'image/jpeg' }]);
      const res = await service.uploadDayPhotos(staff('x', Role.ADMIN), 'c1', '2026-10-01', ['t.jpg']);
      expect(res.canUpload).toBe(true);
      expect(db.lessonPhoto.create.mock.calls[0][0].data).toMatchObject({ studentId: 'x' });
    });

    it('myPhotos: canUpload цонхоор, assignedToMe томилолтоор', async () => {
      db.enrollment.findMany.mockResolvedValue([{ classroomId: 'c1', classroom: { name: 'QA' } }]);
      db.lessonTopic.findMany.mockResolvedValue([
        { date: D('2026-10-22'), testIds: [], photoStudentId: 's1', schedule: { classroomId: 'c1' } },
        { date: D('2026-10-01'), testIds: [], photoStudentId: 's2', schedule: { classroomId: 'c1' } },
      ]);
      const rows = await service.myPhotos('s2');
      expect(rows.map((r) => [r.date, r.canUpload, r.assignedToMe])).toEqual([
        ['2026-10-22', true, false],
        ['2026-10-01', false, true],
      ]);
    });
  });

  it('онолын зураг: ангид хамааралгүй сурагч харахгүй', async () => {
    db.enrollment.findFirst.mockResolvedValue(null);
    await expect(service.dayPhotos(staff('s7', Role.STUDENT), 'c1', '2026-10-10')).rejects.toMatchObject({ status: 403 });
  });
});

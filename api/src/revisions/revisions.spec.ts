import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemoryDb } from '../../test/fakes/memory-db';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClassificationService } from '../classification/classification.service';
import { ContentService } from '../content/content.service';
import { ExamsService } from '../exams/exams.service';
import { Role } from '../generated/prisma/enums';
import { TestsService } from '../tests/tests.service';
import { ThousandService } from '../thousand/thousand.service';
import { buildYoutubeWorkbook } from '../thousand/youtube-sheet';
import { beginRevision, commitRevision, recordCreated } from './revision-store';
import { RevisionsController } from './revisions.controller';
import { RevisionsService } from './revisions.service';

const ADMIN = 'admin-1';
const TPLUS = 'tplus-1';
const TEACHER = 'teacher-1';
const OTHER = 'teacher-2';

function seed() {
  const db = new MemoryDb();
  db.addUser({ id: ADMIN, role: 'ADMIN', firstName: 'Өсөхбаяр', lastName: 'Бат' });
  db.addUser({ id: TPLUS, role: 'TEACHER_PLUS', firstName: 'Эмүжин', lastName: 'Улам' });
  db.addUser({ id: TEACHER, role: 'TEACHER', firstName: 'Баасанжав', lastName: 'Болд' });
  db.addUser({ id: OTHER, role: 'TEACHER', firstName: 'Дорж', lastName: 'Сүх' });
  db.addUser({ id: 'creator', role: 'ADMIN', firstName: 'Импорт', lastName: 'Систем' });
  db.classrooms.push(
    { id: 'c1', name: '10А', teacherId: TEACHER, archived: false },
    { id: 'c2', name: '10Б', teacherId: OTHER, archived: false },
  );
  db.addProblem(
    { id: 'p1', statementText: '$x^2=4$', correctAnswer: '2' },
    [
      { label: 'A', text: '1', isCorrect: false },
      { label: 'B', text: '2', isCorrect: true },
      { label: 'C', text: '3', isCorrect: false, mistakeType: 'SIGN_ERROR', mistakeNote: 'тэмдэг' },
    ],
    [{ type: 'SUBTOPIC', name: 'Квадрат тэгшитгэл' }],
  );
  db.addProblem({ id: 'p2', format: 'FILL_NUMBER', statementText: '[a][b] = ?', correctAnswer: '12', points: 4 });
  db.addTest(
    { id: 't1', title: 'Сорил 1', createdById: TEACHER },
    [
      { problemId: 'p1', order: 1, points: 1 },
      { problemId: 'p2', order: 2, points: 4 },
    ],
    ['c1'],
  );
  db.addTest({ id: 'k1', title: '1000 бодлого 1-A', type: 'THOUSAND', createdById: 'creator' }, [
    { problemId: 'p1', order: 1, points: 1 },
  ]);
  return db;
}

const last = (db: MemoryDb, entity: string, id: string) => db.revisionsOf(entity, id).at(-1)!;
const tx = (db: MemoryDb) => db as never;

describe('revision-store — засварын transaction дотор хувилбар бичнэ', () => {
  it('хуучин бодлогын анхны засвар: хувилбар 0 (өмнөх төлөв) + 1, version +1', async () => {
    const db = seed();
    const rev = await beginRevision(tx(db), 'PROBLEM', 'p1');
    await db.problem.update({ where: { id: 'p1' }, data: { statementText: '$x^2=9$' } });
    const res = await commitRevision(tx(db), rev, { actor: { id: TPLUS, role: 'TEACHER_PLUS' }, action: 'UPDATE' });
    expect(res).toEqual({ version: 1, changed: true, summary: 'Бодлогын текст засварласан', mergedWith: null });
    const revs = db.revisionsOf('PROBLEM', 'p1');
    expect(revs.map((r) => [r.version, r.action, r.actorId, r.summary])).toEqual([
      [0, 'CREATE', 'creator', 'Анхны хувилбар'],
      [1, 'UPDATE', TPLUS, 'Бодлогын текст засварласан'],
    ]);
    expect(revs[0].snapshot.statementText).toBe('$x^2=4$');
    expect(revs[1].snapshot.statementText).toBe('$x^2=9$');
    expect(db.problems.find((p) => p.id === 'p1')).toMatchObject({ version: 1, updatedById: TPLUS });
  });

  it('өөрчлөлтгүй бол юу ч бичихгүй', async () => {
    const db = seed();
    const rev = await beginRevision(tx(db), 'PROBLEM', 'p1');
    const res = await commitRevision(tx(db), rev, { actor: { id: TPLUS, role: 'TEACHER_PLUS' }, action: 'UPDATE' });
    expect(res).toEqual({ version: 0, changed: false, summary: null, mergedWith: null });
    expect(db.revisions).toEqual([]);
  });

  it('хуучирсан expectedVersion: суурийг түүхээс уншина; сэргээх/түүхгүй/ирээдүйн → 409 (хэн гэдэгтэй)', async () => {
    const db = seed();
    await new ContentService(db as never).updateProblem('p1', { statementText: 'y' }, TPLUS, Role.TEACHER_PLUS);
    const rev = await beginRevision(tx(db), 'PROBLEM', 'p1', { expectedVersion: 0 });
    expect(rev).toMatchObject({ version: 1, base: { version: 0 } });
    expect((rev.base!.snapshot as { statementText: string }).statementText).toBe('$x^2=4$');
    const conflict = {
      status: 409,
      response: {
        code: 'VERSION_CONFLICT',
        currentVersion: 1,
        changedBy: 'У. Эмүжин',
        message: 'Таныг засаж байх хооронд У. Эмүжин өөрчилсөн',
      },
    };
    await expect(beginRevision(tx(db), 'PROBLEM', 'p1', { expectedVersion: 0, merge: false })).rejects.toMatchObject(conflict);
    await expect(beginRevision(tx(db), 'PROBLEM', 'p1', { expectedVersion: 5 })).rejects.toMatchObject(conflict);
    db.revisions = db.revisions.filter((r) => r.version !== 0); // түүх цэвэрлэгдсэн
    await expect(beginRevision(tx(db), 'PROBLEM', 'p1', { expectedVersion: 0 })).rejects.toMatchObject(conflict);
    const fresh = await beginRevision(tx(db), 'PROBLEM', 'p1', { expectedVersion: 1 });
    expect(fresh.version).toBe(1);
    expect(fresh.base).toBeUndefined();
  });

  it('шинэ мөр: хувилбар 0 (CREATE), version 0 хэвээр', async () => {
    const db = seed();
    db.addProblem({ id: 'p9' });
    const res = await recordCreated(tx(db), 'PROBLEM', 'p9', { actor: { id: TPLUS, role: 'TEACHER_PLUS' }, action: 'CREATE' });
    expect(res).toMatchObject({ version: 0, changed: true, summary: 'Бодлого нэмсэн' });
    expect(db.problems.find((p) => p.id === 'p9')!.version).toBe(0);
  });
});

describe('Засварын зам бүр өөрчлөлтийн түүх бичнэ', () => {
  it('Ангилал: сонголт + ангилал НЭГ хувилбар (PUT /classification/problems/:id)', async () => {
    const db = seed();
    const vieta = db.ensureTag('SOLUTION_TYPE', 'Виетээр бодох');
    const subtopic = db.problemTags.find((pt) => pt.problemId === 'p1')!.tagId;
    const res = await new ClassificationService(db as never).saveProblem(
      'p1',
      {
        choices: [
          { label: 'A', text: '1', isCorrect: false },
          { label: 'B', text: '2', isCorrect: false },
          { label: 'C', text: '3', isCorrect: true },
        ],
        tagIds: [subtopic, vieta.id],
        expectedVersion: 0,
      },
      TEACHER,
      Role.TEACHER,
    );
    expect(res.version).toBe(1);
    expect(last(db, 'PROBLEM', 'p1')).toMatchObject({
      version: 1,
      action: 'UPDATE',
      actorId: TEACHER,
      actorRole: 'TEACHER',
      summary: 'C сонголтыг зөв болгосон, «Виетээр бодох» ангилал нэмсэн',
    });
  });

  it('Ангилал: тусдаа сонголт, ангиллын замууд (expectedVersion-тэй)', async () => {
    const db = seed();
    const svc = new ClassificationService(db as never);
    await svc.setChoices(
      'p1',
      [
        { label: 'A', text: '1', isCorrect: true },
        { label: 'B', text: '2', isCorrect: false },
      ],
      TEACHER,
      Role.TEACHER,
      0,
    );
    await svc.setProblemTags('p1', [], TEACHER, Role.TEACHER, 1);
    expect(db.revisionsOf('PROBLEM', 'p1').map((r) => r.summary)).toEqual([
      'Анхны хувилбар',
      'A сонголтыг зөв болгосон, C сонголтыг хассан',
      '«Квадрат тэгшитгэл» ангиллыг хассан',
    ]);
    // Хуучирсан (v1) цонхноос ижил утга — бусдынхыг дарахгүй, шинэ хувилбаргүй
    await expect(svc.setProblemTags('p1', [], TEACHER, Role.TEACHER, 1)).resolves.toEqual([]);
    expect(db.revisionsOf('PROBLEM', 'p1')).toHaveLength(3);
  });

  it('Агуулга (PATCH /problems/:id): хувилбар; алдааны шалтгаан арчигдахгүй', async () => {
    const db = seed();
    const res = await new ContentService(db as never).updateProblem(
      'p1',
      {
        statementText: '$x^2=4$, $x>0$',
        choiceOptions: [
          { text: '1', isCorrect: false },
          { text: '2', isCorrect: true },
          { text: '3', isCorrect: false },
        ],
        expectedVersion: 0,
      },
      TPLUS,
      Role.TEACHER_PLUS,
    );
    expect(res.version).toBe(1);
    expect(db.choices.find((c) => c.problemId === 'p1' && c.text === '3')).toMatchObject({
      mistakeType: 'SIGN_ERROR',
      mistakeNote: 'тэмдэг',
    });
    expect(last(db, 'PROBLEM', 'p1').summary).toBe('Бодлогын текст засварласан');
    await expect(
      new ContentService(db as never).updateProblem('p1', { statementText: 'хуучин', expectedVersion: 0 }, ADMIN, Role.ADMIN),
    ).rejects.toMatchObject({ status: 409, response: { code: 'VERSION_CONFLICT' } });
    expect(db.problems.find((p) => p.id === 'p1')!.statementText).toBe('$x^2=4$, $x>0$');
  });

  it('Бодлого нэмэх ба Word импорт → хувилбар 0', async () => {
    const db = seed();
    const content = new ContentService(db as never);
    const created = await content.createProblem(
      { chapterId: 'ch', token: 'N-1', format: 'OPEN' as never, correctAnswer: '5' },
      TPLUS,
    );
    expect(last(db, 'PROBLEM', created.id)).toMatchObject({ version: 0, action: 'CREATE', summary: 'Бодлого нэмсэн' });
    const imported = await content.createProblem(
      { chapterId: 'ch', token: 'docx-1', format: 'OPEN' as never, correctAnswer: '7' },
      TPLUS,
      { action: 'IMPORT', summary: 'Word файлаас импортоор нэмсэн' },
    );
    expect(last(db, 'PROBLEM', imported.id)).toMatchObject({ action: 'IMPORT', summary: 'Word файлаас импортоор нэмсэн' });
  });

  it('Алхмын багц (PATCH /exams/:id/scoring-groups)', async () => {
    const db = seed();
    const exams = new ExamsService(db as never, { record: jest.fn() } as never);
    jest.spyOn(exams, 'settings').mockResolvedValue({} as never);
    await exams.setScoringGroups('t1', TPLUS, {
      problemId: 'p2',
      groups: [
        { label: '2-1', boxes: ['a'], points: 2 },
        { label: '2-2', boxes: ['b'], points: 2 },
      ],
      expectedVersion: 0,
    });
    expect(last(db, 'PROBLEM', 'p2')).toMatchObject({ version: 1, summary: 'Алхмын багц тохируулсан' });
    // Хуучирсан (v0) цонх өөрчлөөгүй утгаа (null) илгээвэл бусдын багцыг дарахгүй
    await exams.setScoringGroups('t1', TPLUS, { problemId: 'p2', groups: null, expectedVersion: 0 });
    expect(db.problems.find((p) => p.id === 'p2')!.scoringGroups).toHaveLength(2);
    expect(db.revisionsOf('PROBLEM', 'p2')).toHaveLength(2);
    // Өөр багц — ижил талбар → 409, юу ч бичигдэхгүй
    await expect(
      exams.setScoringGroups('t1', TPLUS, {
        problemId: 'p2',
        groups: [{ label: '2', boxes: ['a', 'b'], points: 4 }],
        expectedVersion: 0,
      }),
    ).rejects.toMatchObject({ status: 409, response: { fields: ['Алхмын багц'] } });
    expect(db.problems.find((p) => p.id === 'p2')!.scoringGroups).toHaveLength(2);
  });

  it('YouTube холбоос ба Excel импорт', async () => {
    const db = seed();
    const th = new ThousandService(db as never);
    const res = await th.setYoutube('p1', 'https://youtu.be/dQw4w9WgXcQ', TPLUS, 0);
    expect(res.version).toBe(1);
    expect(last(db, 'PROBLEM', 'p1').summary).toBe('YouTube холбоос нэмсэн');
    const buf = await buildYoutubeWorkbook([
      { testTitle: '1000 бодлого 1-A', number: 1, url: 'https://youtu.be/abcdefghijk' },
    ]);
    const imported = await th.importYoutube(buf, TPLUS);
    expect(imported.applied).toBe(true);
    expect(last(db, 'PROBLEM', 'p1')).toMatchObject({
      version: 2,
      action: 'IMPORT',
      summary: 'YouTube холбоосыг сольсон (Excel)',
    });
  });

  it('1000 бодлого: анги оноох/хасах → тестийн хувилбар', async () => {
    const db = seed();
    const th = new ThousandService(db as never);
    await th.assign('c1', 'k1', TEACHER);
    expect(last(db, 'TEST', 'k1')).toMatchObject({ version: 1, summary: '10А ангид оноосон', actorId: TEACHER });
    await th.unassign('c1', 'k1', TEACHER);
    expect(last(db, 'TEST', 'k1')).toMatchObject({ version: 2, summary: '10А ангиас хассан' });
  });

  it('«Шалгалт» тохиргоо: анги оноох/хасах', async () => {
    const db = seed();
    const exams = new ExamsService(db as never, { record: jest.fn() } as never);
    jest.spyOn(exams, 'settings').mockResolvedValue({} as never);
    await exams.assignClass('t1', 'c2', TPLUS, {});
    expect(last(db, 'TEST', 't1').summary).toBe('10Б ангид оноосон');
    await exams.unassignClass('t1', 'c2', TPLUS);
    expect(last(db, 'TEST', 't1').summary).toBe('10Б ангиас хассан');
  });

  it('Тест засах (PATCH /tests/:id): хувилбар, хуучин хувилбар → 409', async () => {
    const db = seed();
    const tests = new TestsService(db as never, { retryPending: jest.fn() } as never);
    const res = await tests.updateTest('t1', { title: 'Сорил 1 (засвар)', timeLimitMin: 60, expectedVersion: 0 }, TEACHER, Role.TEACHER);
    expect(res.version).toBe(1);
    expect(last(db, 'TEST', 't1').summary).toBe('Нэрийг өөрчилсөн, хугацааг 60 минут болгосон');
    await expect(
      tests.updateTest('t1', { title: 'Хуучин цонхноос', expectedVersion: 0 }, TEACHER, Role.TEACHER),
    ).rejects.toMatchObject({ status: 409, response: { changedBy: 'Б. Баасанжав' } });
    // Эрхгүй багшид хэн зассаныг (409) биш, 403 хэлнэ
    await expect(
      tests.updateTest('t1', { title: 'Бусдынх', expectedVersion: 0 }, OTHER, Role.TEACHER),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('Тест үүсгэх, хуулах → хувилбар 0', async () => {
    const db = seed();
    const tests = new TestsService(db as never, { retryPending: jest.fn() } as never);
    const created = await tests.create({ title: 'Шинэ', type: 'DAILY' as never, problems: [{ problemId: 'p1', order: 1 }] }, TEACHER);
    expect(last(db, 'TEST', created.id)).toMatchObject({ version: 0, action: 'CREATE', summary: 'Тест үүсгэсэн' });
    const copy = await tests.duplicateTest('t1', TEACHER, Role.TEACHER);
    expect(last(db, 'TEST', copy.id)).toMatchObject({ version: 0, summary: 'Хуулбараар үүсгэсэн' });
  });
});

describe('Зэрэг засвар — хуучирсан хадгалалтыг автоматаар нэгтгэнэ', () => {
  const choices = (db: MemoryDb) =>
    db.choices
      .filter((c) => c.problemId === 'p1')
      .sort((a, b) => a.order - b.order)
      .map((c) => `${c.label}${c.isCorrect ? '*' : ''}:${c.mistakeNote ?? ''}`);
  const staleSave = (
    db: MemoryDb,
    correct: string,
    extra: { tagIds?: string[]; overwrite?: boolean } = {},
  ) =>
    new ClassificationService(db as never).saveProblem(
      'p1',
      {
        choices: ['A', 'B', 'C'].map((label, i) => ({
          label,
          text: String(i + 1),
          isCorrect: label === correct,
          ...(label === 'C' ? { mistakeType: 'SIGN_ERROR' as never, mistakeNote: 'тэмдэг' } : {}),
        })),
        tagIds: extra.tagIds ?? db.problemTags.filter((pt) => pt.problemId === 'p1').map((pt) => pt.tagId),
        expectedVersion: 0,
        ...(extra.overwrite ? { overwrite: true } : {}),
      },
      TEACHER,
      Role.TEACHER,
    );

  it('өөр өөр талбар: Багш+ текст засаж байхад багш хариуг солино → хоёулаа хадгалагдана', async () => {
    const db = seed();
    const tags = db.problemTags.filter((pt) => pt.problemId === 'p1').map((pt) => pt.tagId);
    await new ContentService(db as never).updateProblem('p1', { statementText: '$x^2=16$' }, TPLUS, Role.TEACHER_PLUS);
    const res = await staleSave(db, 'C', { tagIds: tags });
    expect(res).toMatchObject({ version: 2, changed: true, mergedWith: ['У. Эмүжин'] });
    expect(db.problems.find((p) => p.id === 'p1')!.statementText).toBe('$x^2=16$');
    expect(choices(db)).toEqual(['A:', 'B:', 'C*:тэмдэг']);
    // Түүхийн тайлбарт зөвхөн энэ багшийн өөрчлөлт
    expect(last(db, 'PROBLEM', 'p1')).toMatchObject({ version: 2, summary: 'C сонголтыг зөв болгосон', actorId: TEACHER });
  });

  it('ижил талбар: хоёулаа өөр хариуг зөв болговол 409 (талбарын нэртэй), юу ч бичигдэхгүй', async () => {
    const db = seed();
    const cls = new ClassificationService(db as never);
    await cls.setChoices(
      'p1',
      [
        { label: 'A', text: '1', isCorrect: true },
        { label: 'B', text: '2', isCorrect: false },
        { label: 'C', text: '3', isCorrect: false, mistakeType: 'SIGN_ERROR' as never, mistakeNote: 'тэмдэг' },
      ],
      TPLUS,
      Role.TEACHER_PLUS,
      0,
    );
    await expect(staleSave(db, 'C')).rejects.toMatchObject({
      status: 409,
      response: {
        code: 'VERSION_CONFLICT',
        fields: ['Зөв хариу'],
        message: 'Таныг засаж байх хооронд У. Эмүжин ижил хэсгийг өөрчилсөн: Зөв хариу',
      },
    });
    expect(choices(db)).toEqual(['A*:', 'B:', 'C:тэмдэг']);
    expect(db.problems.find((p) => p.id === 'p1')!.version).toBe(1);
    expect(db.revisionsOf('PROBLEM', 'p1')).toHaveLength(2);
  });

  it('«Миний хувилбарыг хадгалах»: зөрчилтэй талбарт миний утга, бусдын бусад засвар хэвээр', async () => {
    const db = seed();
    await new ClassificationService(db as never).setChoices(
      'p1',
      [
        { label: 'A', text: '1', isCorrect: true },
        { label: 'B', text: '2', isCorrect: false },
        { label: 'C', text: '3', isCorrect: false, mistakeType: 'SIGN_ERROR' as never, mistakeNote: 'тэмдэг' },
      ],
      TPLUS,
      Role.TEACHER_PLUS,
      0,
    );
    await new ContentService(db as never).updateProblem('p1', { statementText: '$x^2=25$' }, TPLUS, Role.TEACHER_PLUS);
    await expect(staleSave(db, 'C')).rejects.toMatchObject({ status: 409, response: { fields: ['Зөв хариу'] } });
    const res = await staleSave(db, 'C', { overwrite: true });
    expect(res).toMatchObject({ version: 3, changed: true, mergedWith: ['У. Эмүжин'] });
    expect(choices(db)).toEqual(['A:', 'B:', 'C*:тэмдэг']);
    expect(db.problems.find((p) => p.id === 'p1')!.statementText).toBe('$x^2=25$');
  });

  it('нэг сонголтын өөр шинж: Багш+ C-ийн тайлбарыг, багш зөв хариуг → хоёулаа', async () => {
    const db = seed();
    await new ClassificationService(db as never).setChoices(
      'p1',
      [
        { label: 'A', text: '1', isCorrect: false },
        { label: 'B', text: '2', isCorrect: true },
        { label: 'C', text: '3', isCorrect: false, mistakeType: 'SIGN_ERROR' as never, mistakeNote: 'хасах тэмдэг мартсан' },
      ],
      TPLUS,
      Role.TEACHER_PLUS,
      0,
    );
    await staleSave(db, 'A');
    expect(choices(db)).toEqual(['A*:', 'B:', 'C:хасах тэмдэг мартсан']);
  });

  it('ангилал олонлогоор: хоёр багш өөр ангилал нэмбэл хоёулаа үлдэнэ', async () => {
    const db = seed();
    const base = db.problemTags.filter((pt) => pt.problemId === 'p1').map((pt) => pt.tagId);
    const x = db.ensureTag('SOLUTION_TYPE', 'Виетээр бодох');
    const y = db.ensureTag('SOLUTION_TYPE', 'Задлах');
    await new ClassificationService(db as never).setProblemTags('p1', [...base, x.id], TPLUS, Role.TEACHER_PLUS, 0);
    await staleSave(db, 'B', { tagIds: [...base, y.id] });
    expect(db.problemTags.filter((pt) => pt.problemId === 'p1').map((pt) => pt.tagId).sort()).toEqual(
      [...base, x.id, y.id].sort(),
    );
  });

  it('тест: Багш+ онооноос, багш хугацаа (бүх талбар илгээдэг хуучин цонх) → хоёулаа', async () => {
    const db = seed();
    const tests = new TestsService(db as never, { retryPending: jest.fn() } as never);
    await tests.updateTest(
      't1',
      { problems: [{ problemId: 'p1', order: 1, points: 2 }, { problemId: 'p2', order: 2, points: 4 }], expectedVersion: 0 },
      TPLUS,
      Role.TEACHER_PLUS,
    );
    const res = await tests.updateTest(
      't1',
      {
        title: 'Сорил 1',
        timeLimitMin: 50,
        problems: [{ problemId: 'p1', order: 1, points: 1 }, { problemId: 'p2', order: 2, points: 4 }],
        classroomIds: ['c1'],
        expectedVersion: 0,
      },
      TEACHER,
      Role.TEACHER,
    );
    expect(res).toMatchObject({ version: 2, timeLimitMin: 50, mergedWith: ['У. Эмүжин'] });
    expect(db.testProblems.filter((tp) => tp.testId === 't1').map((tp) => [tp.problemId, tp.points])).toEqual([
      ['p1', 2],
      ['p2', 4],
    ]);
    expect(last(db, 'TEST', 't1').summary).toBe('Хугацааг 50 минут болгосон');
  });

  it('түүхийн хязгаар: «Анхны хувилбар» + сүүлийн 30', async () => {
    const db = seed();
    const content = new ContentService(db as never);
    for (let i = 1; i <= 41; i += 1)
      await content.updateProblem('p1', { statementText: `$x=${i}$` }, TPLUS, Role.TEACHER_PLUS);
    const versions = db.revisionsOf('PROBLEM', 'p1').map((r) => r.version);
    expect(versions[0]).toBe(0);
    expect(versions[1]).toBe(11);
    expect(versions.at(-1)).toBe(41);
    expect(versions).toHaveLength(32);
  });
});

describe('RevisionsService — эрх, ялгаа, сэргээх', () => {
  async function editedProblem() {
    const db = seed();
    await new ContentService(db as never).updateProblem('p1', { statementText: '$x^2=9$' }, TPLUS, Role.TEACHER_PLUS);
    return { db, svc: new RevisionsService(db as never) };
  }

  it('Багш+: бүгдийг харна; нэр «У. Эмүжин», хэрэглэгчийн ID хариунд алга', async () => {
    const { svc } = await editedProblem();
    const list = await svc.list('problem', 'p1', TPLUS);
    expect(list.items.map((i) => [i.version, i.actorName, i.summary, i.current])).toEqual([
      [1, 'У. Эмүжин', 'Бодлогын текст засварласан', true],
      [0, 'С. Импорт', 'Анхны хувилбар', false],
    ]);
    expect(JSON.stringify(list)).not.toMatch(new RegExp(`${TPLUS}|creator`));
  });

  it('Багш: зөвхөн өөрийн үүсгэсэн эсвэл зассан бодлого/тест', async () => {
    const { db, svc } = await editedProblem();
    await expect(svc.list('PROBLEM', 'p1', TEACHER)).rejects.toMatchObject({ status: 403 });
    await new ClassificationService(db as never).setProblemTags('p1', [], TEACHER, Role.TEACHER);
    await expect(svc.list('PROBLEM', 'p1', TEACHER)).resolves.toMatchObject({ total: 3 });
    await expect(svc.list('TEST', 't1', TEACHER)).resolves.toMatchObject({ total: 0, canRestore: true });
    await expect(svc.list('TEST', 't1', OTHER)).rejects.toMatchObject({ status: 403 });
    await expect(svc.detail('PROBLEM', 'p1', 1, OTHER)).rejects.toMatchObject({ status: 403 });
  });

  it('ялгаа: өмнөх хувилбартай харьцуулна', async () => {
    const { svc } = await editedProblem();
    const detail = await svc.detail('PROBLEM', 'p1', 1, ADMIN);
    expect(detail.changes).toEqual([
      { field: 'statementText', label: 'Бодлогын текст', kind: 'math', before: '$x^2=4$', after: '$x^2=9$' },
    ]);
    expect((await svc.detail('PROBLEM', 'p1', 0, ADMIN)).changes).toEqual([]);
  });

  it('сэргээх: RESTORE шинэ хувилбар болно, түүх устахгүй; хуучин expectedVersion → 409', async () => {
    const { db, svc } = await editedProblem();
    const res = await svc.restore('PROBLEM', 'p1', 0, TPLUS, { expectedVersion: 1 });
    expect(res).toMatchObject({ version: 2, restoredFrom: 0, skipped: [] });
    expect(db.problems.find((p) => p.id === 'p1')!.statementText).toBe('$x^2=4$');
    expect(db.revisionsOf('PROBLEM', 'p1').map((r) => [r.version, r.action, r.summary])).toEqual([
      [0, 'CREATE', 'Анхны хувилбар'],
      [1, 'UPDATE', 'Бодлогын текст засварласан'],
      [2, 'RESTORE', '0-р хувилбар руу буцаасан'],
    ]);
    expect(db.audits.at(-1)).toMatchObject({ action: 'RESTORE', entity: 'Problem', entityId: 'p1' });
    await expect(svc.restore('PROBLEM', 'p1', 1, TPLUS, { expectedVersion: 1 })).rejects.toMatchObject({
      status: 409,
      response: { code: 'VERSION_CONFLICT' },
    });
  });

  it('сурагч өгсөн тест: хариу сэргээхэд confirm; алхмын багц түгжээтэй', async () => {
    const db = seed();
    await new ClassificationService(db as never).setChoices(
      'p1',
      [
        { label: 'A', text: '1', isCorrect: false },
        { label: 'B', text: '2', isCorrect: false },
        { label: 'C', text: '3', isCorrect: true },
      ],
      TPLUS,
      Role.TEACHER_PLUS,
    );
    const exams = new ExamsService(db as never, { record: jest.fn() } as never);
    jest.spyOn(exams, 'settings').mockResolvedValue({} as never);
    await exams.setScoringGroups('t1', TPLUS, { problemId: 'p2', groups: [{ label: '2-1', boxes: ['a', 'b'], points: 4 }] });
    db.sessions.push({ testId: 't1', studentId: 'student-1', status: 'SUBMITTED' });

    const svc = new RevisionsService(db as never);
    await expect(svc.restore('PROBLEM', 'p1', 0, TPLUS, {})).rejects.toMatchObject({
      status: 409,
      response: {
        code: 'CONFIRM_REQUIRED',
        message: 'Энэ бодлоготой шалгалтыг сурагч өгсөн. Хариуг сэргээвэл өмнөх дүн дахин бодогдохгүй.',
      },
    });
    const ok = await svc.restore('PROBLEM', 'p1', 0, TPLUS, { confirm: true });
    expect(ok.version).toBe(2);
    expect(db.choices.filter((c) => c.problemId === 'p1' && c.isCorrect).map((c) => c.label)).toEqual(['B']);

    await expect(svc.restore('PROBLEM', 'p2', 0, TPLUS, {})).rejects.toMatchObject({
      status: 400,
      response: { message: 'Сэргээх боломжтой өөрчлөлт алга: Алхмын багц түгжээтэй' },
    });
  });

  it('багш агуулгыг сэргээхгүй (403), өөрийн сонголтын засварыг сэргээнэ', async () => {
    const db = seed();
    const cls = new ClassificationService(db as never);
    const choices = (correct: string) =>
      ['A', 'B', 'C'].map((label, i) => ({ label, text: String(i + 1), isCorrect: label === correct }));
    await cls.setChoices('p1', choices('A'), TEACHER, Role.TEACHER); // v1
    await cls.setChoices('p1', choices('C'), TEACHER, Role.TEACHER); // v2
    const svc = new RevisionsService(db as never);
    // v1 рүү: зөвхөн сонголт ялгаатай — багш сэргээнэ
    await expect(svc.restore('PROBLEM', 'p1', 1, TEACHER, {})).resolves.toMatchObject({ version: 3 });
    expect(db.choices.filter((c) => c.problemId === 'p1' && c.isCorrect).map((c) => c.label)).toEqual(['A']);
    await new ContentService(db as never).updateProblem('p1', { statementText: 'Өөр' }, TPLUS, Role.TEACHER_PLUS); // v4
    // v0 рүү: бодлогын текст ч өөрчлөгдөнө — Багш+ эрх хэрэгтэй
    await expect(svc.restore('PROBLEM', 'p1', 0, TEACHER, {})).rejects.toMatchObject({
      status: 403,
      response: { message: 'Энэ хувилбарыг сэргээхэд Багш+ эрх хэрэгтэй (Бодлогын агуулга)' },
    });
  });

  it('өгсөн тест: зөвхөн нэр, хугацааг сэргээнэ', async () => {
    const db = seed();
    const tests = new TestsService(db as never, { retryPending: jest.fn() } as never);
    await tests.updateTest(
      't1',
      { title: 'Шинэ нэр', timeLimitMin: 50, problems: [{ problemId: 'p1', order: 1, points: 2 }] },
      TEACHER,
      Role.TEACHER,
    );
    db.sessions.push({ testId: 't1', studentId: 'student-1', status: 'SUBMITTED' });
    const res = await new RevisionsService(db as never).restore('TEST', 't1', 0, TEACHER, { expectedVersion: 1 });
    expect(res).toMatchObject({ version: 2, skipped: ['Бодлого'] });
    expect(db.tests.find((t) => t.id === 't1')).toMatchObject({ title: 'Сорил 1', timeLimitMin: 40 });
    expect(db.testProblems.filter((tp) => tp.testId === 't1').map((tp) => [tp.problemId, tp.points])).toEqual([['p1', 2]]);
    expect(last(db, 'TEST', 't1').summary).toBe('0-р хувилбар руу буцаасан (Бодлого түгжээтэй тул хэвээр)');
    await expect(new RevisionsService(db as never).restore('TEST', 't1', 0, OTHER, {})).rejects.toMatchObject({ status: 403 });
  });

  it('өгөөгүй тест: бодлого, анги хүртэл сэргээнэ (үлдэх ангийн тохиргоо хэвээр)', async () => {
    const db = seed();
    const exams = new ExamsService(db as never, { record: jest.fn() } as never);
    jest.spyOn(exams, 'settings').mockResolvedValue({} as never);
    await exams.assignClass('t1', 'c2', TPLUS, {}); // v1
    db.accessRows.find((a) => a.testId === 't1' && a.classroomId === 'c1')!.reviewLevel = 'FULL';
    await exams.unassignClass('t1', 'c1', TPLUS); // v2
    const res = await new RevisionsService(db as never).restore('TEST', 't1', 1, ADMIN, {});
    expect(res).toMatchObject({ version: 3, skipped: [] });
    expect(db.accessRows.filter((a) => a.testId === 't1').map((a) => a.classroomId).sort()).toEqual(['c1', 'c2']);
    expect(last(db, 'TEST', 't1').action).toBe('RESTORE');
  });
});

describe('Сурагч, эцэг эх түүхэнд хүрэхгүй', () => {
  it('RevisionsController — зөвхөн ажилтан', () => {
    expect(Reflect.getMetadata(ROLES_KEY, RevisionsController)).toEqual(['ADMIN', 'TEACHER_PLUS', 'TEACHER']);
    const guard = new RolesGuard(new Reflector());
    const handler = RevisionsController.prototype.list;
    const can = (role: Role) =>
      guard.canActivate({
        getHandler: () => handler,
        getClass: () => RevisionsController,
        switchToHttp: () => ({ getRequest: () => ({ user: { userId: 'u', role } }) }),
      } as unknown as ExecutionContext);
    expect([Role.STUDENT, Role.PARENT, Role.BUYER].map(can)).toEqual([false, false, false]);
    expect([Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER].map(can)).toEqual([true, true, true]);
  });
});

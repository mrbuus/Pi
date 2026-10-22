import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateNoteDto } from './dto/note.dto';
import { NOTE_BODY_MAX, NotesService, cleanNoteBody } from './notes.service';
import { Role, StudentNoteType } from '../generated/prisma/enums';

/**
 * Самбарын drawer-ийн «Тэмдэглэл» (эзэн 2026-10-22): ЯМАР Ч идэвхтэй багш (Багш, Багш+,
 * Админ) ямар ч сурагчид огноотой блок нэмнэ, зохиогч «Б. Нэр». Урт 1–4000.
 */
function setup(actor: { role: Role; archivedAt?: Date | null; firstName?: string; lastName?: string }) {
  const created: unknown[] = [];
  const db: any = {
    user: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === 'pupil'
            ? { id: 'pupil', role: Role.STUDENT }
            : {
                id: where.id,
                role: actor.role,
                archivedAt: actor.archivedAt ?? null,
                externalTeacherProfile: null,
                firstName: actor.firstName ?? 'Марал-Эрдэнэ',
                lastName: actor.lastName ?? 'батаа',
              },
        ),
      ),
      findMany: jest.fn().mockResolvedValue([]),
    },
    // Багш энэ сурагчийн ангийн багш БИШ — эрх ангиас хамаарахгүй
    enrollment: { findFirst: jest.fn().mockResolvedValue(null) },
    teacherGroupMember: { findFirst: jest.fn().mockResolvedValue(null) },
    studentNote: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const note = { id: 'n1', createdAt: new Date('2026-10-22T07:32:00Z'), ...data };
        created.push(note);
        return Promise.resolve(note);
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const caps: any = { has: jest.fn().mockResolvedValue(false), assert: jest.fn() };
  const audit = { record: jest.fn() };
  return { db, created, audit, service: new NotesService(db, audit as never, caps) };
}

describe('Сурагчийн тэмдэглэл — drawer-ийн блок', () => {
  it('энгийн Багш өөр ангийн сурагчид бичнэ; захын зайг хасна, зохиогч «Б. Нэр», засах эрхтэй', async () => {
    const { service, db, audit } = setup({ role: Role.TEACHER });
    const note = await service.create(
      'pupil',
      { type: StudentNoteType.GENERAL, body: '  Гэрийн даалгавраа\nдахин шалгах  ' },
      'teacher',
      Role.TEACHER,
    );
    expect(db.studentNote.create.mock.calls[0][0].data).toMatchObject({
      studentId: 'pupil',
      type: StudentNoteType.GENERAL,
      body: 'Гэрийн даалгавраа\nдахин шалгах',
      createdById: 'teacher',
    });
    expect(note).toMatchObject({ authorName: 'Б. Марал-Эрдэнэ', canEdit: true });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', entity: 'StudentNote' }));
  });

  it.each([Role.TEACHER_PLUS, Role.ADMIN])('%s мөн бичнэ', async (role) => {
    const { service, db } = setup({ role });
    await service.create('pupil', { type: StudentNoteType.GENERAL, body: 'x' }, 'staff', role);
    expect(db.studentNote.create).toHaveBeenCalled();
  });

  it('эцэг эх, сурагч, архивласан ажилтан — хориотой', async () => {
    for (const actor of [{ role: Role.PARENT }, { role: Role.STUDENT }, { role: Role.TEACHER, archivedAt: new Date() }]) {
      const { service, db } = setup(actor);
      await expect(
        service.create('pupil', { type: StudentNoteType.GENERAL, body: 'x' }, 'someone', actor.role),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.studentNote.create).not.toHaveBeenCalled();
    }
  });

  it('хоосон/зөвхөн зай эсвэл 4000-аас урт бол 400; яг 4000 зөвшөөрнө', async () => {
    const { service, db } = setup({ role: Role.TEACHER });
    for (const body of ['', '   \n  ', 'а'.repeat(NOTE_BODY_MAX + 1)]) {
      await expect(
        service.create('pupil', { type: StudentNoteType.GENERAL, body }, 'teacher', Role.TEACHER),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(db.studentNote.create).not.toHaveBeenCalled();
    await service.create('pupil', { type: StudentNoteType.GENERAL, body: 'а'.repeat(NOTE_BODY_MAX) }, 'teacher', Role.TEACHER);
    expect(db.studentNote.create).toHaveBeenCalledTimes(1);
    expect(cleanNoteBody(' $\\frac{1}{2}$ <b>https://x.mn</b> ')).toBe('$\\frac{1}{2}$ <b>https://x.mn</b>');
  });

  it('DTO: 1–4000 тэмдэгт, төрөл заавал', async () => {
    const errs = async (body: unknown) =>
      (await validate(plainToInstance(CreateNoteDto, { type: 'GENERAL', body }))).map((e) => e.property);
    expect(await errs('Тэмдэглэл')).toEqual([]);
    expect(await errs('')).toEqual(['body']);
    expect(await errs('x'.repeat(4001))).toEqual(['body']);
    expect((await validate(plainToInstance(CreateNoteDto, { body: 'x' }))).map((e) => e.property)).toEqual(['type']);
  });

  it('жагсаалт: шинэ нь дээр (createdAt буурах), ерөнхий төрөл, зохиогчийн нэртэй', async () => {
    const { service, db } = setup({ role: Role.TEACHER });
    db.studentNote.findMany.mockResolvedValue([
      { id: 'b', createdById: 'other', type: StudentNoteType.GENERAL, createdAt: new Date('2026-10-22T08:00:00Z') },
      { id: 'a', createdById: 'teacher', type: StudentNoteType.GENERAL, createdAt: new Date('2026-10-20T08:00:00Z') },
    ]);
    db.user.findMany.mockResolvedValue([
      { id: 'other', firstName: 'Болд', lastName: 'Дорж' },
      { id: 'teacher', firstName: 'Марал-Эрдэнэ', lastName: 'Батаа' },
    ]);
    const list = await service.list('pupil', StudentNoteType.GENERAL, 'teacher', Role.TEACHER);
    expect(db.studentNote.findMany.mock.calls[0][0]).toMatchObject({
      where: { studentId: 'pupil', type: StudentNoteType.GENERAL },
      orderBy: { createdAt: 'desc' },
    });
    expect(list.map((n) => [n.id, n.authorName, n.canEdit])).toEqual([
      ['b', 'Д. Болд', false],
      ['a', 'Б. Марал-Эрдэнэ', true],
    ]);
  });
});

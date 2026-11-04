import { NotFoundException } from '@nestjs/common';
import { NotesService } from './notes.service';
import { Role, StudentNoteType } from '../generated/prisma/enums';

/** Эзний хатуу дүрэм (2026-10-23): багшийн тэмдэглэл устгахад deletedAt — мөр үлдэнэ. */
function setup(note: Record<string, unknown> | null) {
  const db: any = {
    user: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === 'pupil'
            ? { id: 'pupil', role: Role.STUDENT }
            : { id: where.id, role: Role.TEACHER, archivedAt: null, externalTeacherProfile: null, firstName: 'Нэр', lastName: 'Овог' },
        ),
      ),
      findMany: jest.fn().mockResolvedValue([]),
    },
    enrollment: { findFirst: jest.fn().mockResolvedValue(null) },
    teacherGroupMember: { findFirst: jest.fn().mockResolvedValue(null) },
    studentNote: {
      findUnique: jest.fn().mockResolvedValue(note),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(({ data }: { data: object }) => Promise.resolve({ ...note, ...data })),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const caps: any = { has: jest.fn().mockResolvedValue(false), assert: jest.fn() };
  const audit = { record: jest.fn() };
  return { db, audit, service: new NotesService(db, audit as never, caps) };
}

const NOTE = { id: 'n1', studentId: 'pupil', type: StudentNoteType.GENERAL, createdById: 'teacher', body: 'x', deletedAt: null };

describe('Багшийн тэмдэглэл — зөөлөн устгал', () => {
  it('remove нь deletedAt + deletedById тавина, hard delete хийхгүй, аудит бичнэ', async () => {
    const { db, audit, service } = setup(NOTE);
    await expect(service.remove('n1', 'teacher', Role.TEACHER)).resolves.toEqual({ deleted: true });
    expect(db.studentNote.delete).not.toHaveBeenCalled();
    expect(db.studentNote.deleteMany).not.toHaveBeenCalled();
    expect(db.studentNote.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { deletedAt: expect.any(Date), deletedById: 'teacher' },
    });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE', entity: 'StudentNote' }));
  });

  it('жагсаалт deletedAt: null-оор шүүнэ', async () => {
    const { db, service } = setup(null);
    await service.list('pupil', undefined, 'teacher', Role.TEACHER);
    expect(db.studentNote.findMany.mock.calls[0][0].where).toMatchObject({ studentId: 'pupil', deletedAt: null });
  });

  it('устгасан тэмдэглэлийг засах/дахин устгах — 404', async () => {
    const { db, service } = setup({ ...NOTE, deletedAt: new Date() });
    await expect(service.remove('n1', 'teacher', Role.TEACHER)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update('n1', { body: 'y' } as never, 'teacher', Role.TEACHER)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.studentNote.update).not.toHaveBeenCalled();
  });
});

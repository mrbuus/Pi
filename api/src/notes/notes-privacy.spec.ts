import { NotesService } from './notes.service';
import { Role, StudentNoteType } from '../generated/prisma/enums';
describe('private pupil notes', () => {
  function setup(external = false, member = true) {
    const db: any = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve(
            where.id === 'pupil'
              ? { id: 'pupil', role: Role.STUDENT }
              : {
                  role: Role.TEACHER_PLUS,
                  archivedAt: null,
                  externalTeacherProfile: external
                    ? { verifiedAt: new Date() }
                    : null,
                },
          ),
        ),
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'private-staff', firstName: 'Болд', lastName: 'Бат' },
          ]),
      },
      enrollment: {
        findFirst: jest
          .fn()
          .mockResolvedValue(member ? { id: 'enrollment' } : null),
      },
      teacherGroupMember: {
        findFirst: jest
          .fn()
          .mockResolvedValue(member ? { id: 'member' } : null),
      },
      studentNote: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'note',
          studentId: 'pupil',
          type: StudentNoteType.GENERAL,
          createdById: 'private-staff',
        }),
        update: jest.fn(),
      },
    };
    const caps: any = {
      has: jest.fn().mockResolvedValue(false),
      assert: jest.fn().mockRejectedValue(new Error('no-finance')),
    };
    return {
      db,
      caps,
      service: new NotesService(db, { record: jest.fn() } as any, caps),
    };
  }
  it('эзний шийдвэр: төвийн ямар ч багш өөр ангийн сурагчийн тэмдэглэлийг уншина, зохиогчийн нэртэй', async () => {
    const { db, service } = setup(false, false);
    db.studentNote.findMany.mockResolvedValue([
      { id: 'n1', createdById: 'private-staff', type: StudentNoteType.GENERAL },
    ]);
    await expect(
      service.list('pupil', undefined, 'plus', Role.TEACHER_PLUS),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'n1',
        authorName: 'Б. Болд',
        canEdit: false,
      }),
    ]);
  });
  it('бусдын тэмдэглэлийг засах/устгах — зөвхөн зохиогч эсвэл админ', async () => {
    const { db, service } = setup(false, false);
    await expect(
      service.update('note', { body: 'x' }, 'plus', Role.TEACHER_PLUS),
    ).rejects.toThrow('Зөвхөн өөрийн');
    expect(db.studentNote.update).not.toHaveBeenCalled();
  });
  it('ordinary own-class staff never receive payment notes in an untyped list', async () => {
    const { db, service } = setup();
    await service.list('pupil', undefined, 'plus', Role.TEACHER_PLUS);
    expect(db.studentNote.findMany.mock.calls[0][0].where).toEqual({
      studentId: 'pupil',
      type: StudentNoteType.GENERAL,
    });
    await expect(
      service.list('pupil', StudentNoteType.PAYMENT, 'plus', Role.TEACHER_PLUS),
    ).rejects.toThrow('no-finance');
  });
  it('external group sees own general notes only and cannot modify private staff notes', async () => {
    const { db, service } = setup(true);
    await service.list('pupil', undefined, 'plus', Role.TEACHER_PLUS);
    expect(db.studentNote.findMany.mock.calls[0][0].where.createdById).toBe(
      'plus',
    );
    await expect(
      service.update('note', { body: 'edited' }, 'plus', Role.TEACHER_PLUS),
    ).rejects.toThrow();
    expect(db.studentNote.update).not.toHaveBeenCalled();
  });
  it('explicit global finance grant enables payment-note reads', async () => {
    const { db, caps, service } = setup(false, false);
    caps.assert.mockResolvedValue(undefined);
    caps.has.mockResolvedValue(true);
    await service.list(
      'pupil',
      StudentNoteType.PAYMENT,
      'plus',
      Role.TEACHER_PLUS,
    );
    expect(caps.assert).toHaveBeenCalledWith('plus', 'finance.manage');
    expect(db.studentNote.findMany).toHaveBeenCalled();
  });
});

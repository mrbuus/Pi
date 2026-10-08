import JSZip from 'jszip';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DocumentImportService } from './document-import.service';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmDocumentDto } from './confirm-document.dto';
async function fixture(figure = false) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types/>');
  zip.file(
    'word/document.xml',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
      ['Question', 'Right', 'Wrong']
        .map(
          (s, i) =>
            `<w:p><w:r><w:t>${s}</w:t></w:r>${figure && i === 0 ? '<w:drawing/>' : ''}</w:p>`,
        )
        .join('') +
      '</w:body></w:document>',
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}
interface ProblemData {
  token: string;
  statementText: string;
  createdById: string;
  choiceOptions: { create: { isCorrect: boolean }[] };
}
interface StoredProblem extends ProblemData {
  id: string;
  deletedAt: Date | null;
}
function setup() {
  const stored = new Map<string, StoredProblem>();
  const tx = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'teacher',
        role: Role.TEACHER_PLUS,
        archivedAt: null,
        externalTeacherProfile: null,
      }),
    },
    chapter: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'chapter', deletedAt: null, book: null }),
    },
    problem: {
      findUnique: jest.fn(({ where }: { where: { token: string } }) =>
        Promise.resolve(stored.get(where.token) ?? null),
      ),
      create: jest.fn(({ data }: { data: ProblemData }) => {
        const p = { ...data, id: 'problem', deletedAt: null };
        stored.set(data.token, p);
        return Promise.resolve(p);
      }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn(
      (callback: (transaction: typeof tx) => Promise<StoredProblem>) =>
        callback(tx),
    ),
  };
  return {
    service: new DocumentImportService(prisma as unknown as PrismaService),
    prisma,
    tx,
  };
}
const dto = (previewToken: string): ConfirmDocumentDto => ({
  previewToken,
  chapterId: 'chapter',
  confirmed: true,
  warningsAcknowledged: true,
  mapping: {
    promptId: 'block-1',
    choiceIds: ['block-2', 'block-3'],
    correctChoiceId: 'block-2',
  },
});
describe('reviewed persistent DOCX import', () => {
  it('cannot turn an external group-teacher profile into centre bank curation', async () => {
    const { service, tx } = setup();
    tx.user.findUnique.mockResolvedValue({
      id: 'teacher',
      role: Role.TEACHER_PLUS,
      archivedAt: null,
      externalTeacherProfile: { userId: 'teacher' },
    });
    const preview = await service.preview(
      await fixture(),
      'test.docx',
      'teacher',
      Role.TEACHER_PLUS,
    );
    await expect(
      service.confirm(dto(preview.previewToken), 'teacher', Role.TEACHER_PLUS),
    ).rejects.toThrow(ForbiddenException);
    expect(tx.problem.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('creates through ContentService with choice flags and an audit; returns no key', async () => {
    const { service, tx } = setup();
    const preview = await service.preview(
      await fixture(),
      'test.docx',
      'teacher',
      Role.TEACHER_PLUS,
    );
    const result = await service.confirm(
      dto(preview.previewToken),
      'teacher',
      Role.TEACHER_PLUS,
    );
    expect(result).toEqual({ problemId: 'problem', duplicate: false });
    const data = tx.problem.create.mock.calls[0][0].data;
    expect(data.statementText).toBe('Question');
    expect(data.choiceOptions.create.map((o) => o.isCorrect)).toEqual([
      true,
      false,
    ]);
    expect(data.createdById).toBe('teacher');
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toMatch(
      /Right|isCorrect|correctAnswer|sourceHash|previewToken/,
    );
  });
  it('replays the same confirmation and fresh source previews without a second create', async () => {
    const { service, tx } = setup();
    const bytes = await fixture();
    const first = await service.preview(
      bytes,
      'test.docx',
      'teacher',
      Role.TEACHER_PLUS,
    );
    await service.confirm(
      dto(first.previewToken),
      'teacher',
      Role.TEACHER_PLUS,
    );
    expect(
      await service.confirm(
        dto(first.previewToken),
        'teacher',
        Role.TEACHER_PLUS,
      ),
    ).toEqual({ problemId: 'problem', duplicate: true });
    const fresh = await service.preview(
      bytes,
      'renamed.docx',
      'teacher',
      Role.TEACHER_PLUS,
    );
    const reordered = dto(fresh.previewToken);
    reordered.mapping = {
      correctChoiceId: 'block-2',
      choiceIds: ['block-2', 'block-3'],
      promptId: 'block-1',
    };
    expect(
      (await service.confirm(reordered, 'teacher', Role.TEACHER_PLUS))
        .duplicate,
    ).toBe(true);
    expect(tx.problem.create).toHaveBeenCalledTimes(1);
  });
  it('rejects student, ordinary teacher, stolen or modified preview tokens', async () => {
    const { service, tx } = setup();
    const p = await service.preview(
      await fixture(),
      'test.docx',
      'teacher',
      Role.ADMIN,
    );
    for (const role of [Role.STUDENT, Role.TEACHER, Role.PARENT])
      await expect(
        service.confirm(dto(p.previewToken), 'teacher', role),
      ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.confirm(dto(p.previewToken), 'other', Role.ADMIN),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.confirm(dto(p.previewToken + 'x'), 'teacher', Role.ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.problem.create).not.toHaveBeenCalled();
  });
  it('rejects missing confirmation, malformed/duplicate/unknown mappings and figures', async () => {
    const { service, tx } = setup();
    const p = await service.preview(
      await fixture(),
      'test.docx',
      'teacher',
      Role.ADMIN,
    );
    const cases = [
      { confirmed: false },
      { warningsAcknowledged: false },
      {
        mapping: {
          promptId: 'block-1',
          choiceIds: ['block-2', 'block-2'],
          correctChoiceId: 'block-2',
        },
      },
      {
        mapping: {
          promptId: 'missing',
          choiceIds: ['block-2', 'block-3'],
          correctChoiceId: 'block-2',
        },
      },
      {
        mapping: {
          promptId: 'block-1',
          choiceIds: ['block-2'],
          correctChoiceId: 'block-2',
        },
      },
      {
        mapping: {
          promptId: 'block-1',
          choiceIds: ['block-2', 'block-3'],
          correctChoiceId: 'block-1',
        },
      },
    ];
    for (const patch of cases)
      await expect(
        service.confirm(
          { ...dto(p.previewToken), ...patch },
          'teacher',
          Role.ADMIN,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    const image = await service.preview(
      await fixture(true),
      'image.docx',
      'teacher',
      Role.ADMIN,
    );
    await expect(
      service.confirm(dto(image.previewToken), 'teacher', Role.ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.problem.create).not.toHaveBeenCalled();
  });
  it('rejects expired previews and rolls transaction failures back through Prisma', async () => {
    const { service, prisma } = setup();
    const p = await service.preview(
      await fixture(),
      'test.docx',
      'teacher',
      Role.ADMIN,
    );
    const clock = jest
      .spyOn(Date, 'now')
      .mockReturnValue(Date.now() + 31 * 60 * 1000);
    await expect(
      service.confirm(dto(p.previewToken), 'teacher', Role.ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
    clock.mockRestore();
    const fresh = await service.preview(
      await fixture(),
      'test.docx',
      'teacher',
      Role.ADMIN,
    );
    prisma.$transaction.mockRejectedValueOnce(new Error('transaction failed'));
    await expect(
      service.confirm(dto(fresh.previewToken), 'teacher', Role.ADMIN),
    ).rejects.toThrow('transaction failed');
  });
});

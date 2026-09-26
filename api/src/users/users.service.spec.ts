/* Jest's generated mock-call tuples are `any`; assertions below inspect synthetic test doubles only. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as bcrypt from 'bcryptjs';
import * as ExcelJS from 'exceljs';
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('synthetic-hash'),
}));
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

type ImportRow = {
  rowNumber: number;
  lastName: string;
  firstName: string;
  phone: string;
  guardianPhone: string;
  classroomLabel: string;
  status: 'NEW' | 'UPDATE' | 'ERROR';
  reason: string | null;
  grade: number | null;
  section: string | null;
  targetUserId: string | null;
};
type Preview = {
  ownerId: string;
  expiresAt: number;
  rows: ImportRow[];
};

const previewId = 'ad13e5a8-8dd3-4efb-a5cf-a7b4df8b0414';
const ownerId = 'admin-1';
const studentId = 'student-1';
const row = (changes: Partial<ImportRow> = {}): ImportRow => ({
  rowNumber: 2,
  lastName: 'Test',
  firstName: 'Student',
  phone: '99112233',
  guardianPhone: '',
  classroomLabel: '',
  status: 'NEW',
  reason: null,
  grade: null,
  section: null,
  targetUserId: null,
  ...changes,
});

function setup(initialRow = row()) {
  const tx = {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'new-student' }),
      update: jest.fn().mockResolvedValue({}),
    },
    studentProfile: { upsert: jest.fn().mockResolvedValue({}) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const transaction = jest.fn(
    (callback: (client: unknown) => Promise<unknown>, options: unknown) => {
      void options;
      return callback(tx);
    },
  );
  const archiveFindUnique = jest.fn();
  const archiveUpdate = jest.fn();
  const auditRecord = jest.fn();
  const prisma = {
    $transaction: transaction,
    user: { findUnique: archiveFindUnique, update: archiveUpdate },
  } as unknown as PrismaService;
  const audit = { record: auditRecord } as unknown as AuditService;
  const service = new UsersService(prisma, audit);
  const previews = Reflect.get(service, 'importPreviews') as Map<
    string,
    Preview
  >;
  previews.set(previewId, {
    ownerId,
    expiresAt: Date.now() + 60_000,
    rows: [initialRow],
  });
  return {
    service,
    prisma,
    audit,
    tx,
    previews,
    transaction,
    archiveFindUnique,
    archiveUpdate,
    auditRecord,
  };
}

describe('student import service', () => {
  it('rejects malformed optional guardian phone numbers during preview', async () => {
    const { service } = setup();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Synthetic');
    sheet.addRow(['Овог', 'Нэр', 'Утас', 'Эцэг эхийн утас', 'Анги/Түвшин']);
    sheet.addRow(['Тест', 'Жишээ', '99112233', 'bad-number', '12-2']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const preview = await service.previewStudentImport(buffer, ownerId);
    expect(preview.rows[0]).toEqual(
      expect.objectContaining({
        status: 'ERROR',
        reason: 'Асран хамгаалагчийн утасны дугаарыг шалгана уу.',
      }),
    );
  });

  it('rejects other owners and expired previews before opening a transaction', async () => {
    const first = setup();
    await expect(
      first.service.commitStudentImport(previewId, [2], 'other', Role.ADMIN),
    ).rejects.toThrow(BadRequestException);
    expect(first.transaction).not.toHaveBeenCalled();

    const second = setup();
    second.previews.get(previewId)!.expiresAt = Date.now() - 1;
    await expect(
      second.service.commitStudentImport(previewId, [2], ownerId, Role.ADMIN),
    ).rejects.toThrow(BadRequestException);
    expect(second.transaction).not.toHaveBeenCalled();
  });

  it('pre-hashes NEW credentials, uses a bounded transaction, and audits the actual actor role', async () => {
    const { service, tx, transaction } = setup();
    tx.user.findUnique.mockImplementation(
      (args: { where: { phone?: string } }) => (args.where.phone ? null : null),
    );
    const hashMock = bcrypt.hash as jest.Mock;
    hashMock.mockClear();
    try {
      await expect(
        service.commitStudentImport(previewId, [2], ownerId, Role.TEACHER_PLUS),
      ).resolves.toEqual({
        imported: 1,
        rows: [{ rowNumber: 2, action: 'NEW', id: 'new-student' }],
      });
      expect(hashMock).toHaveBeenCalledWith('99112233', 10);
      expect(hashMock.mock.invocationCallOrder[0]).toBeLessThan(
        transaction.mock.invocationCallOrder[0],
      );
      const options = transaction.mock.calls[0]?.[1] as {
        maxWait: number;
        timeout: number;
      };
      expect(options).toEqual({ maxWait: 10000, timeout: 120000 });
      expect(tx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: 'synthetic-hash',
            studentCode: '2027001',
          }),
        }),
      );
      expect(tx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ actorRole: Role.TEACHER_PLUS }),
        }),
      );
    } finally {
      hashMock.mockClear();
    }
  });

  it('updates only supplied profile fields and leaves the existing student code untouched', async () => {
    const { service, tx } = setup(
      row({ status: 'UPDATE', targetUserId: studentId }),
    );
    tx.user.findUnique.mockResolvedValue({
      id: studentId,
      role: Role.STUDENT,
      archivedAt: null,
    });
    await service.commitStudentImport(previewId, [2], ownerId, Role.ADMIN);
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: studentId },
      data: { firstName: 'Student', lastName: 'Test' },
    });
    expect(tx.studentProfile.upsert).toHaveBeenCalledWith({
      where: { userId: studentId },
      create: expect.any(Object),
      update: {},
    });
  });

  it('rejects a row whose previewed NEW phone became a non-student before commit', async () => {
    const { service, tx, previews } = setup();
    tx.user.findUnique.mockResolvedValue({
      id: 'teacher-1',
      role: Role.TEACHER,
      archivedAt: null,
    });
    await expect(
      service.commitStudentImport(previewId, [2], ownerId, Role.ADMIN),
    ).rejects.toThrow(ConflictException);
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(previews.has(previewId)).toBe(true);
  });

  it('keeps the preview available when transactional audit fails so the caller can retry', async () => {
    const { service, tx, previews } = setup();
    tx.user.findUnique.mockResolvedValue(null);
    tx.auditLog.create.mockRejectedValue(new Error('audit unavailable'));
    await expect(
      service.commitStudentImport(previewId, [2], ownerId, Role.ADMIN),
    ).rejects.toThrow('audit unavailable');
    expect(tx.user.create).toHaveBeenCalled();
    expect(previews.has(previewId)).toBe(true);
  });

  it('passes the actual archive actor role into the audit record', async () => {
    const { service, archiveFindUnique, archiveUpdate, auditRecord } = setup();
    archiveFindUnique.mockResolvedValue({
      id: studentId,
      role: Role.STUDENT,
      archivedAt: null,
    });
    archiveUpdate.mockResolvedValue({
      id: studentId,
      archivedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    await service.archiveStudent(
      studentId,
      ownerId,
      'duplicate registration',
      Role.TEACHER_PLUS,
    );
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({ actorRole: Role.TEACHER_PLUS }),
    );
  });
});

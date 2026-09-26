import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ArchiveStudentDto, CommitStudentImportDto } from './students.dto';

describe('student maintenance DTOs', () => {
  it('rejects an empty archive reason after trimming', async () => {
    expect(
      await validate(plainToInstance(ArchiveStudentDto, { reason: '  ' })),
    ).not.toHaveLength(0);
  });
  it('accepts a valid archive reason and preview selection', async () => {
    const archive = plainToInstance(ArchiveStudentDto, {
      reason: 'Давхардсан бүртгэл',
    });
    const commit = plainToInstance(CommitStudentImportDto, {
      previewId: 'ca43eec1-d17b-44c4-9c2e-f1fe1bc16b61',
      rowNumbers: [2, 3],
    });
    expect(await validate(archive)).toHaveLength(0);
    expect(await validate(commit)).toHaveLength(0);
  });
  it('rejects invalid IDs and duplicate or non-positive row numbers', async () => {
    const dto = plainToInstance(CommitStudentImportDto, {
      previewId: 'bad',
      rowNumbers: [1, 1, 0],
    });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});

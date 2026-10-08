import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TestType } from '../../generated/prisma/enums';
import { CreateTestDraftDto, UpdateTestDraftDto } from './test-draft.dto';

describe('Test draft DTO validation', () => {
  it('accepts incomplete, serializable builder state and rejects malformed fields', async () => {
    expect(
      await validate(
        plainToInstance(CreateTestDraftDto, {
          title: 'Ноорог',
          type: TestType.CHAPTER_EXAM,
          selectedProblems: ['problem-1'],
          pointOverrides: { 'problem-1': 2 },
          selectedClasses: ['class-1'],
        }),
      ),
    ).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(CreateTestDraftDto, {
          type: 'UNKNOWN',
          selectedProblems: [1],
          selectedClasses: 'class-1',
        }),
      ),
    ).not.toHaveLength(0);
  });

  it('requires a positive expected revision for autosave', async () => {
    expect(
      await validate(plainToInstance(UpdateTestDraftDto, { title: 'Draft' })),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(UpdateTestDraftDto, {
          title: 'Draft',
          expectedRevision: 1,
        }),
      ),
    ).toHaveLength(0);
  });
});

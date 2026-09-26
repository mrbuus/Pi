import { validate } from 'class-validator';
import { VerifyExternalTeacherDto } from './verify-external-teacher.dto';

describe('VerifyExternalTeacherDto', () => {
  it('allows an omitted note', async () => {
    const dto = Object.assign(new VerifyExternalTeacherDto(), {});
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts an optional note up to 500 characters', async () => {
    const dto = Object.assign(new VerifyExternalTeacherDto(), {
      note: 'synthetic '.repeat(50),
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects non-string and oversized notes', async () => {
    for (const note of [12, 'x'.repeat(501)]) {
      const dto = Object.assign(new VerifyExternalTeacherDto(), { note });
      await expect(validate(dto)).resolves.not.toHaveLength(0);
    }
  });
});

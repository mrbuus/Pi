import { validate } from 'class-validator';
import { RejectExternalTeacherDto } from './reject-external-teacher.dto';

describe('RejectExternalTeacherDto', () => {
  it('accepts a non-empty reason within the profile note limit', async () => {
    const dto = Object.assign(new RejectExternalTeacherDto(), {
      reason: 'Байгууллагын мэдээлэл тодорхойгүй байна.',
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an empty, non-string or oversized reason', async () => {
    for (const reason of ['', 10, 'x'.repeat(451)]) {
      const dto = Object.assign(new RejectExternalTeacherDto(), { reason });
      await expect(validate(dto)).resolves.not.toHaveLength(0);
    }
  });
});

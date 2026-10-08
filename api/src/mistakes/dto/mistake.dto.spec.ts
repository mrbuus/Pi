import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MistakeQueryDto, RetryMistakeDto, UpdateMistakeDto } from './mistake.dto';

describe('mistake DTO validation', () => {
  it('accepts only known filters and reason values', async () => {
    expect(await validate(plainToInstance(MistakeQueryDto, { status: 'RETRYING', source: 'TEST' }))).toHaveLength(0);
    expect(await validate(plainToInstance(MistakeQueryDto, { status: 'OTHER' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdateMistakeDto, { reason: 'CALC', note: 'Алдаа' }))).toHaveLength(0);
    expect(await validate(plainToInstance(UpdateMistakeDto, { reason: 'OTHER' }))).not.toHaveLength(0);
  });
  it('caps learner notes at 500 characters and requires retry answer', async () => {
    expect(await validate(plainToInstance(UpdateMistakeDto, { note: 'x'.repeat(501) }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(RetryMistakeDto, { answer: '' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(RetryMistakeDto, { answer: 'A' }))).toHaveLength(0);
  });
});

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RunJobDto } from './run-job.dto';

describe('RunJobDto', () => {
  it('allows only registered job names', async () => {
    expect(await validate(plainToInstance(RunJobDto, { name: 'homework-due' }))).toHaveLength(0);
    expect(await validate(plainToInstance(RunJobDto, { name: 'drop-database' }))).not.toHaveLength(0);
  });
});

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WeeklyReportQueryDto } from './weekly-report.dto';

describe('WeeklyReportQueryDto', () => {
  it('requires student id and a date-only week key', async () => {
    expect(await validate(plainToInstance(WeeklyReportQueryDto, { studentId: 'student-1', week: '2026-09-21' }))).toHaveLength(0);
    expect(await validate(plainToInstance(WeeklyReportQueryDto, { studentId: '', week: 'next-week' }))).not.toHaveLength(0);
  });
});

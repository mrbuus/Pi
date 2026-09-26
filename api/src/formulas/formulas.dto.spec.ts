import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FormulaDto } from './dto/formula.dto';
import { FormulaQueryDto, FormulaStudentQueryDto } from './dto/formula-query.dto';

describe('formula DTO validation', () => {
  it('validates search and optional student query fields', async () => {
    expect(await validate(plainToInstance(FormulaQueryDto, { level: 'CORE', grade: 11 }))).toHaveLength(0);
    expect(await validate(plainToInstance(FormulaStudentQueryDto, { studentId: 'student-1' }))).toHaveLength(0);
    expect((await validate(plainToInstance(FormulaQueryDto, { level: 'BAD', grade: 99 }))).length).toBeGreaterThan(0);
  });
  it('requires typed fields and rejects missing required payload fields', async () => {
    expect((await validate(plainToInstance(FormulaDto, {}))).length).toBeGreaterThan(0);
  });
});

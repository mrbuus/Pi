import * as ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';
import {
  nextSevenDigitStudentCode,
  parseGrade,
  parseStudentWorkbook,
} from './student-import';

describe('student import helpers', () => {
  it('allocates next legacy seven-digit code and detects exhaustion', () => {
    expect(nextSevenDigitStudentCode(['2027001', 'B2612001', null])).toBe(
      '2027002',
    );
    expect(() => nextSevenDigitStudentCode(['2027999'])).toThrow(
      BadRequestException,
    );
  });
  it('parses grade and section labels', () => {
    expect(parseGrade('12-2')).toEqual({ grade: 12, section: '12-2' });
    expect(parseGrade('8')).toEqual({ grade: 8, section: null });
    expect(() => parseGrade('12 / 2')).toThrow(BadRequestException);
  });
  it('reads synthetic workbook rows', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Synthetic');
    sheet.addRow(['Овог', 'Нэр', 'Утас', 'Эцэг эхийн утас', 'Анги/Түвшин']);
    sheet.addRow(['Тест', 'Жишээ', '99112233', '88112233', '12-2']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    await expect(parseStudentWorkbook(buffer)).resolves.toEqual([
      {
        rowNumber: 2,
        lastName: 'Тест',
        firstName: 'Жишээ',
        phone: '99112233',
        guardianPhone: '88112233',
        classroomLabel: '12-2',
      },
    ]);
  });
  it('rejects non-xlsx input', async () => {
    await expect(parseStudentWorkbook(Buffer.from('no'))).rejects.toThrow(
      BadRequestException,
    );
  });
});

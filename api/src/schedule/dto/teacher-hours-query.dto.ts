import { Matches } from 'class-validator';

export class TeacherHoursQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Сар YYYY-MM хэлбэртэй байх ёстой' })
  month: string;
}

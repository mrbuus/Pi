import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class TeacherWorkDayExceptionDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsDateString()
  date: string;

  @IsBoolean()
  working: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

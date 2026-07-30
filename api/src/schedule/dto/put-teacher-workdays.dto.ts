import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class PutTeacherWorkDaysDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  // Хоосон массив = багш "тогтмол ажлын өдөргүй" болгоно (бүхнийг цэвэрлэнэ)
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays: number[];
}

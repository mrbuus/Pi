import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ANSWER_LETTERS, CONTENT_AREAS } from './paper-exam-logic';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePaperExamDto {
  @IsString()
  @Transform(trim)
  @Length(2, 120)
  title: string;

  /** «YYYY-MM-DD» (УБ-ийн өдөр) */
  @Matches(DATE_RE, { message: 'Огноо YYYY-MM-DD хэлбэртэй' })
  heldOn: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  itemCount: number;
}

export class UpdatePaperExamDto {
  @IsOptional()
  @IsString()
  @Transform(trim)
  @Length(2, 120)
  title?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'Огноо YYYY-MM-DD хэлбэртэй' })
  heldOn?: string;

  /** Дүн оруулаагүй үед л өөрчилнө */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  itemCount?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class PaperItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  number: number;

  @IsOptional()
  @IsIn([...ANSWER_LETTERS, null])
  answerKey?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  points: number;

  @IsOptional()
  @IsIn([...CONTENT_AREAS, null])
  area?: string | null;

  @IsOptional()
  @IsBoolean()
  voided?: boolean;
}

export class SavePaperItemsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PaperItemDto)
  items: PaperItemDto[];
}

export class LinkSheetDto {
  /** null = холболтыг салгах */
  @IsOptional()
  @IsString()
  @Length(1, 60)
  studentId?: string | null;
}

export class StudentSearchDto {
  @IsString()
  @Transform(trim)
  @Length(1, 60)
  q: string;
}

export class ImportQueryDto {
  /** «1» = хадгална; бусад үед зөвхөн урьдчилан харна */
  @IsOptional()
  @IsIn(['0', '1'])
  confirm?: string;

  /** Сурагчийн өмнөх хуудсыг шинээр солих эсэх (анхдагч: тийм) */
  @IsOptional()
  @IsIn(['0', '1'])
  replace?: string;
}

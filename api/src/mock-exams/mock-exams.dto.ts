import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateMockExamDto {
  @IsString()
  @Transform(trim)
  @Length(2, 120)
  title: string;

  @IsString()
  @Length(5, 60)
  testId: string;

  /** ISO огноо (UTC) — вэб UB цагийг хөрвүүлж илгээнэ */
  @IsISO8601()
  startsAt: string;

  /** Хоцорч эхлүүлж болох минут (анхдагч 30) */
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  @Max(600)
  lateMin?: number;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateMockExamDto {
  @IsOptional()
  @IsString()
  @Transform(trim)
  @Length(2, 120)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(5, 60)
  testId?: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  @Max(600)
  lateMin?: number;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

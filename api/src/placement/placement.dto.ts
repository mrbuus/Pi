import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const PHONE = /^[0-9]{8}$/;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const digitsOnly = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\s+/g, '') : value;

export class StartPlacementDto {
  @IsString()
  @Transform(trim)
  @Length(2, 100, { message: 'Нэрээ бүтэн бичнэ үү' })
  name: string;

  @IsString()
  @Transform(digitsOnly)
  @Matches(PHONE, { message: 'Утасны дугаар 8 оронтой байх ёстой (жишээ: 99112233)' })
  phone: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(12)
  grade: number;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(120)
  school?: string;

  @IsOptional()
  @IsString()
  @Transform(digitsOnly)
  @Matches(PHONE, { message: 'Эцэг эхийн утас 8 оронтой байх ёстой' })
  parentPhone?: string;
}

export class PlacementSecretDto {
  @IsString()
  @Length(20, 80)
  secret: string;
}

export class SavePlacementDto extends PlacementSecretDto {
  @IsObject()
  answers: Record<string, string | Record<string, string>>;
}

export class SubmitPlacementDto extends SavePlacementDto {
  @IsOptional()
  @IsBoolean()
  auto?: boolean;
}

export class PhotoPlacementDto extends PlacementSecretDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  problem: number;
}

export class ReviewPlacementDto {
  @IsOptional()
  @IsIn(['NEW', 'REVIEWED', 'CONTACTED'])
  status?: 'NEW' | 'REVIEWED' | 'CONTACTED';

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(80)
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  teacherNote?: string;
}

export class UpdatePlacementTestDto {
  @IsString()
  @Transform(trim)
  @Length(2, 120)
  title: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(5)
  @Max(180)
  minutes: number;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  instructions?: string;

  /** Бүтцийг placement-tests.ts/parseProblems шалгана */
  @IsArray()
  problems: unknown[];
}

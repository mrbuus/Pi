import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// Нэртэй эрх: нэр + хугацаа + хамрах хүрээ (SPEC §11)
// scope жишээ: { "all": true } эсвэл { "chapterIds": [...], "bookIds": [...], "testIds": [...] }
export class CreatePassDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  durationDays: number;

  @IsDefined()
  scope: unknown;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class GrantPassDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

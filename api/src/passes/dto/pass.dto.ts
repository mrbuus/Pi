import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

// scope-д зөвшөөрөгдсөн түлхүүрүүд — api/src/common/access.ts (PassScope,
// scopeCovers, collectPassScope, hasCoveringPass) яг ЭДГЭЭРИЙГ Л уншдаг.
// Анхаарах: Prisma schema-н Pass.scope баганын коммент "videoIds"-г дурдсан ч
// access.ts үүнийг хаана ч уншдаггүй (видеонд chapterId/bookId-аар нэвтэрдэг,
// src/videos/videos.service.ts-г үз) — тиймээс энд оруулаагүй болно.
const ALLOWED_SCOPE_KEYS = ['all', 'chapterIds', 'bookIds', 'testIds'];

// Малформ бүтэц (танихгүй түлхүүртэй object) чимээгүйгээр JSON болж DB-д
// хадгалагдаж, дараа нь access.ts-ийн эрхийн шалгалтыг чимээгүй эвдэж байсныг
// засав. Зөвхөн бичихэд (create/update DTO) хэрэглэнэ — унших талд (listActive,
// myPasses гэх мэт) хуучин мөрүүд дээр энэ validate-аар дахин шалгагдахгүй.
function NoUnknownScopeKeys(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'noUnknownScopeKeys',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (
            value === null ||
            typeof value !== 'object' ||
            Array.isArray(value)
          ) {
            return true; // төрлийн шалгалтыг @IsObject хариуцна
          }
          return Object.keys(value).every((key) =>
            ALLOWED_SCOPE_KEYS.includes(key),
          );
        },
        defaultMessage() {
          return `scope талбарт зөвхөн ${ALLOWED_SCOPE_KEYS.join(', ')} түлхүүрүүд зөвшөөрөгдөнө`;
        },
      },
    });
  };
}

// Pass.scope-ийн бодит бүтэц (access.ts-тэй яг тохирно):
// { "all": true } эсвэл { "chapterIds": [...], "bookIds": [...], "testIds": [...] }
export class PassScopeDto {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  all?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chapterIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bookIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  testIds?: string[];
}

// Нэртэй эрх: нэр + хугацаа + хамрах хүрээ (SPEC §11)
// scope жишээ: { "all": true } эсвэл { "chapterIds": [...], "bookIds": [...], "testIds": [...] }
export class CreatePassDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: Number, minimum: 1 })
  @IsInt()
  @Min(1)
  durationDays: number;

  @ApiProperty({ type: () => PassScopeDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => PassScopeDto)
  @NoUnknownScopeKeys()
  scope: PassScopeDto;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class GrantPassDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  note?: string;
}

export class RevokePassGrantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  @Matches(/\S/)
  reason: string;
}

// Админ л засна — нэр/хугацаа/хамрах хүрээ/үнэ/идэвх солино
export class UpdatePassDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({ type: () => PassScopeDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PassScopeDto)
  @NoUnknownScopeKeys()
  scope?: PassScopeDto;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

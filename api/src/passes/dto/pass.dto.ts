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
  @IsOptional()
  @IsBoolean()
  all?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chapterIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bookIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  testIds?: string[];
}

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
  @IsObject()
  @ValidateNested()
  @Type(() => PassScopeDto)
  @NoUnknownScopeKeys()
  scope: PassScopeDto;

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

// Админ л засна — нэр/хугацаа/хамрах хүрээ/үнэ/идэвх солино
export class UpdatePassDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PassScopeDto)
  @NoUnknownScopeKeys()
  scope?: PassScopeDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

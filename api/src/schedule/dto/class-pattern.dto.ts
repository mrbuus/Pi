import { Transform, TransformFnParams, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Салбар — ангийн нэрийн дагавар «13-5 (Зүүн 4)» */
export const CLASS_BRANCHES = ['Баруун 4', 'Зүүн 4'] as const;
export type ClassBranch = (typeof CLASS_BRANCHES)[number];

const trimName = (p: TransformFnParams): unknown =>
  typeof p.value === 'string' ? p.value.trim().replace(/\s+/g, ' ') : p.value;

/** Ангийн 7 хоногийн нэг өдөр (нэг гарагт нэг хичээл) */
export class PatternDayDto {
  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: 6,
    description: '0=Ням … 6=Бямба',
  })
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @ApiProperty({ type: Number, minimum: 0, maximum: 1439 })
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute: number;

  @ApiProperty({ type: Number, minimum: 1, maximum: 1440 })
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  room?: string | null;

  // undefined = хэвээр (шинэ өдөрт ангийн багш), null = ангийн багш руу буцаана
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  teacherId?: string | null;
}

/**
 * PUT /schedule/classrooms/:id/pattern — ангийн 7 хоногийг `effectiveFrom`-оос
 * эхлэн шинэчилнэ. Жагсаалтад байхгүй гараг = тэр өдрийн хичээл дуусна
 * (effectiveTo = өмнөх өдөр), шинэ гараг = шинэ мөр, өөрчлөгдсөн = хуваана.
 * `name` өгвөл ангийн нэрийг (салбарын дагавартай) солино — id хэвээр.
 */
export class PutClassPatternDto {
  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({ type: [PatternDayDto] })
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => PatternDayDto)
  days: PatternDayDto[];

  @ApiPropertyOptional({ type: String, description: 'Богино нэр, ж: «13-5»' })
  @IsOptional()
  @Transform(trimName)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name?: string;

  @ApiPropertyOptional({ enum: CLASS_BRANCHES })
  @IsOptional()
  @IsIn(CLASS_BRANCHES)
  branch?: ClassBranch;
}

/** POST /schedule/classrooms — шинэ анги + түүний 7 хоног (нэг транзакц) */
export class CreateClassWithPatternDto {
  @ApiProperty({ type: String, description: 'Богино нэр, ж: «13-5»' })
  @Transform(trimName)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name: string;

  @ApiProperty({ enum: CLASS_BRANCHES })
  @IsIn(CLASS_BRANCHES)
  branch: ClassBranch;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 13 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(13)
  grade?: number;

  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({ type: [PatternDayDto] })
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => PatternDayDto)
  days: PatternDayDto[];
}

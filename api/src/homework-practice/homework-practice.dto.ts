import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class StartHomeworkDto {
  @ApiProperty() @IsString() testId!: string;
  /** Анги тестийг хийсэн өдөр (YYYY-MM-DD) */
  @ApiProperty() @IsString() date!: string;
}

export class HomeworkAnswersDto {
  // { problemId: "B" (сонголтын үсэг) | "35" | { a: "3" } }
  @ApiPropertyOptional({ type: Object, additionalProperties: true })
  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;

  // Идэвхийн тоолуур { activeSec, awaySec, leaveCount } — клиентийн хэмжилт, сервер mergeActivity-ээр шалгана
  @ApiPropertyOptional({ type: Object, additionalProperties: true })
  @IsOptional()
  @IsObject()
  activity?: Record<string, unknown>;
}

export class HomeworkPhotoDto {
  @ApiProperty() @IsString() classroomId!: string;
  @ApiProperty() @IsString() date!: string;
  @ApiProperty() @IsString() fileKey!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(6) pages!: number;
  /** Сурагчийн тайлбар (сонголттой, эзэн 2026-11-05) */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) caption?: string;
}

export class HomeworkStudentCommentDto {
  @ApiProperty() @IsString() classroomId!: string;
  @ApiProperty() @IsString() date!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(1000) body!: string;
}

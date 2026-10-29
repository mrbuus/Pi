import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

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
}

export class HomeworkPhotoDto {
  @ApiProperty() @IsString() classroomId!: string;
  @ApiProperty() @IsString() date!: string;
  @ApiProperty() @IsString() fileKey!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(6) pages!: number;
}

import { Transform, TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ArchiveStudentDto {
  @Transform((params: TransformFnParams): unknown =>
    typeof params.value === 'string' ? params.value.trim() : params.value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
/** Сэргээх: шалтгаан заавал биш; `classroomId` өгвөл тэр ангид буцаана */
export class UnarchiveStudentDto {
  @Transform((params: TransformFnParams): unknown =>
    typeof params.value === 'string' ? params.value.trim() : params.value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  classroomId?: string;
}
export class CommitStudentImportDto {
  @IsUUID() previewId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  rowNumbers!: number[];
}

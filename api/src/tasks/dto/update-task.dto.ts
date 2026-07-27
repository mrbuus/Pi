import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Subject, TaskPriority, TaskStatus } from '../../generated/prisma/enums';

// Бүх талбар сонголттой — TEACHER эрхтэй хэрэглэгч зөвхөн status илгээх ёстой
// (үлдсэн талбарыг илгээвэл service түвшинд ForbiddenException шидэгдэнэ).
export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  parentTaskId?: string;

  @IsOptional()
  @IsString()
  classroomId?: string;

  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimateHours?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  assigneeIds?: string[];
}

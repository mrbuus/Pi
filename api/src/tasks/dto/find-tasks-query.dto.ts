import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Subject, TaskStatus } from '../../generated/prisma/enums';

export class FindTasksQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  // Он-цагийн хайрцаг (ХУГАЦАА харагдац): энэ мужтай давхцах даалгаврыг л буцаана
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  classroomId?: string;

  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject;
}

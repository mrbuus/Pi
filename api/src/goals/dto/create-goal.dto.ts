import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Subject, TaskStatus } from '../../generated/prisma/enums';

// Сурагчийн зорилго үүсгэх — studentId ЭНД байхгүй: controller дотор
// JWT-с req.user.userId авч тавина, сурагч ӨӨРИЙН биш зорилго үүсгэх боломжгүй.
export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject;
}

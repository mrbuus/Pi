import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { Subject, TaskStatus } from '../../generated/prisma/enums';

// Бүх талбар сонголттой — жишээ нь зөвхөн "дуусгасан" гэж тэмдэглэхэд
// зөвхөн status-аа л илгээнэ.
export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Хоосон мөр илгээвэл (targetDate: null) зорилтот огноог арилгана.
  @IsOptional()
  @IsDateString()
  targetDate?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject;
}

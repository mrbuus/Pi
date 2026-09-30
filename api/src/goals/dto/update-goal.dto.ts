import { ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  description?: string;

  // Хоосон мөр илгээвэл (targetDate: null) зорилтот огноог арилгана.
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  targetDate?: string | null;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: Subject })
  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject;
}

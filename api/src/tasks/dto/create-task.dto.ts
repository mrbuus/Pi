import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Subject, TaskPriority, TaskStatus } from '../../generated/prisma/enums';

// Ажилтны төлөвлөгчийн даалгавар үүсгэх (эсвэл дэд даалгавар — parentTaskId
// заавал бол том ажлыг жижиг хэсэг болгон хуваасан гэсэн үг).
export class CreateTaskDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  // Заавал бол энэ ажил өөр ажлын ДЭД даалгавар (нэг л түвшин дэмжинэ)
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  parentTaskId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  classroomId?: string;

  @ApiPropertyOptional({ enum: Subject })
  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimateHours?: number;

  // Даалгавар үүсгэхийн хамт хариуцах ажилтнуудыг шууд оноож болно
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  assigneeIds?: string[];
}

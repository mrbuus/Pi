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
  @IsString()
  @IsNotEmpty()
  title: string;

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

  // Заавал бол энэ ажил өөр ажлын ДЭД даалгавар (нэг л түвшин дэмжинэ)
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

  // Даалгавар үүсгэхийн хамт хариуцах ажилтнуудыг шууд оноож болно
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  assigneeIds?: string[];
}

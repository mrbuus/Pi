import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AssignmentType } from '../../generated/prisma/enums';

// Даалгавар засах — ангийг эзэмшигч Багш эсвэл Багш+/Админ. Бүх талбар optional.
export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AssignmentType)
  type?: AssignmentType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageKeys?: string[];

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

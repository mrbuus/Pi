import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ type: Number, minimum: 0 })
  @IsInt({ message: 'Дүн нь бүхэл тоо байх ёстой' })
  @Min(0, { message: 'Дүн сөрөг биш байх ёстой' })
  amount: number;

  @ApiProperty({ type: String })
  @IsString()
  category: string; // SALARY, RENT, UTILITIES, MARKETING, MATERIALS, EQUIPMENT, OTHER

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  occurredOn: string; // ISO 8601 date format
}

export class UpdateExpenseDto {
  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt({ message: 'Дүн нь бүхэл тоо байх ёстой' })
  @Min(0, { message: 'Дүн сөрөг биш байх ёстой' })
  amount?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  occurredOn?: string;
}

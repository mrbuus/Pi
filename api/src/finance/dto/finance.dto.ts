import { IsString, IsInt, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsInt({ message: 'Дүн нь бүхэл тоо байх ёстой' })
  @Min(0, { message: 'Дүн сөрөг биш байх ёстой' })
  amount: number;

  @IsString()
  category: string; // SALARY, RENT, UTILITIES, MARKETING, MATERIALS, EQUIPMENT, OTHER

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  occurredOn: string; // ISO 8601 date format
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsInt({ message: 'Дүн нь бүхэл тоо байх ёстой' })
  @Min(0, { message: 'Дүн сөрөг биш байх ёстой' })
  amount?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  occurredOn?: string;
}

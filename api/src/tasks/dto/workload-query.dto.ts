import { IsDateString, IsOptional } from 'class-validator';

export class WorkloadQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

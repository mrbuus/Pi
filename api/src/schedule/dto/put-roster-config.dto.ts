import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, ValidateIf } from 'class-validator';

// Багшийн ажлын өдрийн хүснэгтийн горим ба хүчинтэй хугацаа (эзэн 2026-10-11).
export class PutRosterConfigDto {
  // FIXED = 7 хоног бүр ижил, ALTERNATING = сондгой/тэгш ээлж
  @ApiProperty({ enum: ['FIXED', 'ALTERNATING'] })
  @IsIn(['FIXED', 'ALTERNATING'])
  mode: 'FIXED' | 'ALTERNATING';

  // null = хязгааргүй
  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  validFrom?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  validTo?: string | null;
}

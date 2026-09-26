import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

// Сэдвийн бүлгийн шалгалтын дүнг багш гараар оруулна (SPEC §9.2 — 3-р суваг)
export class EnterResultDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ type: Number, minimum: 0 })
  @IsNumber()
  @Min(0)
  totalScore: number;

  @ApiProperty({ type: Number, minimum: 1 })
  @IsNumber()
  @Min(1)
  maxScore: number;
}

import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

// Сэдвийн бүлгийн шалгалтын дүнг багш гараар оруулна (SPEC §9.2 — 3-р суваг)
export class EnterResultDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsNumber()
  @Min(0)
  totalScore: number;

  @IsNumber()
  @Min(1)
  maxScore: number;
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SetColorTagDto {
  // Hex өнгө (ж: #34d6a8) эсвэл нэрлэсэн өнгө
  @IsString()
  color: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

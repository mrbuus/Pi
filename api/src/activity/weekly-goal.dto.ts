import { IsInt, Max, Min, ValidateIf } from 'class-validator';

/** `PUT /study/weekly-goal` — 1..7 өдөр, эсвэл null (зорилгыг арилгах = зөөлөн устгал). */
export class WeeklyGoalDto {
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek!: number | null;
}

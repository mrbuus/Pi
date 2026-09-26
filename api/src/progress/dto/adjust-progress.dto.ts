import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SelfState } from '../../generated/prisma/enums';

// POST /progress/student/:id/assign-test — онлайн сурагчид тодорхой тест олгох
export class AssignTestDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  testId: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  note?: string;
}

// PATCH /progress/student/:id/attempt/:attemptId — буруу бүртгэгдсэн оролдлогыг засах
export class AdjustAttemptDto {
  @ApiPropertyOptional({ enum: SelfState })
  @IsOptional()
  @IsEnum(SelfState)
  selfState?: SelfState;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  autoCorrect?: boolean;
}

// POST /progress/student/:id/reset-chapter — сурагчийг тухайн бүлгийг дахин
// үзэх боломжтой болгох (Attempt түүхийг хөндөхгүй, зөвхөн явцын тэмдэглэгээг цэвэрлэнэ)
export class ResetChapterDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  chapterId: string;

  // Шалтгааныг заавал бичнэ — аудитад үлдэнэ
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

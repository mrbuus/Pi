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
  @IsString()
  @IsNotEmpty()
  testId: string;

  @IsOptional()
  @IsString()
  note?: string;
}

// PATCH /progress/student/:id/attempt/:attemptId — буруу бүртгэгдсэн оролдлогыг засах
export class AdjustAttemptDto {
  @IsOptional()
  @IsEnum(SelfState)
  selfState?: SelfState;

  @IsOptional()
  @IsBoolean()
  autoCorrect?: boolean;
}

// POST /progress/student/:id/reset-chapter — сурагчийг тухайн бүлгийг дахин
// үзэх боломжтой болгох (Attempt түүхийг хөндөхгүй, зөвхөн явцын тэмдэглэгээг цэвэрлэнэ)
export class ResetChapterDto {
  @IsString()
  @IsNotEmpty()
  chapterId: string;

  // Шалтгааныг заавал бичнэ — аудитад үлдэнэ
  @IsString()
  @IsNotEmpty()
  reason: string;
}

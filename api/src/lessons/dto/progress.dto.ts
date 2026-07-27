import { IsEnum, IsOptional, IsString } from 'class-validator';

// LearningEventType enum-д (prisma/schema.prisma) яг ийм нэртэй утга байхгүй
// тул (THEORY_READ гэж байхгүй) — энэ бол ЛЭСС модулийн DTO-гийн ӨӨРИЙН action
// нэр, service нь эдгээрийг байгаа LearningEventType утгууд руу (VIDEO_STARTED,
// VIDEO_COMPLETED, онолын хувьд PAGE_VIEW + meta.theoryId) буулгана.
export enum LessonProgressAction {
  THEORY_READ = 'THEORY_READ',
  VIDEO_STARTED = 'VIDEO_STARTED',
  VIDEO_COMPLETED = 'VIDEO_COMPLETED',
}

export class RecordProgressDto {
  @IsEnum(LessonProgressAction)
  action: LessonProgressAction;

  @IsOptional()
  @IsString()
  theoryId?: string;

  @IsOptional()
  @IsString()
  videoId?: string;
}

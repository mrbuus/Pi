/**
 * "Хичээл үзэх" (lesson) урсгалын API-гийн хэлбэрүүд.
 *
 * Backend /lessons/* маршрутыг ӨӨР agent зэрэгцээ хөгжүүлж байгаа тул энд
 * ЗӨВХӨН тохиролцсон гадаад контрактыг (GET /lessons/chapters, GET
 * /lessons/:chapterId, POST /lessons/:chapterId/progress) тодорхойлно.
 *
 * `progress` талбарын дэлгэрэнгүй бүтэц (theoryIds/videoIds/...) нь энэ
 * frontend талаас таамагласан УЯН боловч ХАМГИЙН МАГАДЛАЛТАЙ хэлбэр —
 * бодит backend-ийн гаргалт өөр нэрлэсэн бол зөвхөн доорх normalize*
 * функцүүдийг тохируулах хэрэгтэй (бүх .tsx файлууд эндээс л уншина).
 * Бүх талбарыг optional-оор уншиж, байхгүй бол аюулгүй эсрэг утга руу
 * (0 / хоосон массив / false) буцаадаг тул backend-ийн бодит хариу арай
 * өөр байсан ч хуудас эвдэхгүй — зөвхөн ахиц харуулах нарийвчлал буурна.
 */

export interface LessonBookRef {
  id?: string;
  code: string;
  title: string;
}

export interface LessonChapterProgressSummary {
  percent?: number; // 0–100, backend тооцоолсон нийт ахиц
  stepsDone?: number;
  stepsTotal?: number;
  lastOpenedAt?: string | null;
}

// GET /lessons/chapters?subject=&bookId= -ийн нэг мөр
export interface LessonChapterSummary {
  id: string;
  title: string;
  order: number;
  grade?: number | null;
  freePreview: boolean;
  bookId?: string | null;
  book?: LessonBookRef | null;
  progress?: LessonChapterProgressSummary | null;
}

export interface LessonTheory {
  id: string;
  chapterId?: string;
  title: string;
  content: string; // markdown — SafeMarkdown-аар л рендерлэнэ
  imageKeys: string[];
  order: number;
  freePreview?: boolean;
}

export interface LessonVideoRow {
  id: string;
  title: string;
  s3Key: string;
  duration?: number | null;
}

export interface LessonTestRow {
  id: string;
  title: string;
  type: string;
  timeLimitMin?: number | null;
  price?: number | null;
  variantLabel?: string | null;
}

export interface LessonDetailProgress {
  theoryIds?: string[]; // үзсэн онолын блокуудын id
  videoIds?: string[]; // бүрэн үзсэн (эсвэл эхэлсэн) бичлэгийн id
  problemsOpened?: boolean; // дасгал руу дор хаяж нэг удаа орсон эсэх
  testIds?: string[]; // дуусгасан тестийн id
}

// GET /lessons/:chapterId -ийн бүтэн хариу
export interface LessonDetail {
  chapter: LessonChapterSummary;
  theories: LessonTheory[];
  videos: LessonVideoRow[];
  problemCount: number;
  tests: LessonTestRow[];
  progress?: LessonDetailProgress | null;
}

export type LessonProgressAction =
  | "THEORY_VIEWED"
  | "VIDEO_STARTED"
  | "VIDEO_COMPLETED"
  | "PROBLEMS_OPENED";

// POST /lessons/:chapterId/progress -ийн бие
export interface LessonProgressBody {
  theoryId?: string;
  videoId?: string;
  action: LessonProgressAction;
}

export function normalizeProgress(
  progress: LessonDetailProgress | null | undefined,
): Required<LessonDetailProgress> {
  return {
    theoryIds: progress?.theoryIds ?? [],
    videoIds: progress?.videoIds ?? [],
    problemsOpened: progress?.problemsOpened ?? false,
    testIds: progress?.testIds ?? [],
  };
}

export interface StepStatus {
  key: "theory" | "video" | "problems" | "test";
  label: string;
  hasContent: boolean;
  done: boolean;
  partial: boolean;
}

export function computeSteps(detail: LessonDetail): StepStatus[] {
  const progress = normalizeProgress(detail.progress);
  const theoryDone =
    detail.theories.length > 0 &&
    detail.theories.every((t) => progress.theoryIds.includes(t.id));
  const theoryPartial =
    !theoryDone &&
    detail.theories.some((t) => progress.theoryIds.includes(t.id));

  const videoDone =
    detail.videos.length > 0 &&
    detail.videos.every((v) => progress.videoIds.includes(v.id));
  const videoPartial =
    !videoDone && detail.videos.some((v) => progress.videoIds.includes(v.id));

  const problemsDone = detail.problemCount > 0 && progress.problemsOpened;

  const testDone =
    detail.tests.length > 0 &&
    detail.tests.every((t) => progress.testIds.includes(t.id));
  const testPartial =
    !testDone && detail.tests.some((t) => progress.testIds.includes(t.id));

  return [
    {
      key: "theory",
      label: "Онол",
      hasContent: detail.theories.length > 0,
      done: theoryDone,
      partial: theoryPartial,
    },
    {
      key: "video",
      label: "Видео",
      hasContent: detail.videos.length > 0,
      done: videoDone,
      partial: videoPartial,
    },
    {
      key: "problems",
      label: "Дасгал",
      hasContent: detail.problemCount > 0,
      done: problemsDone,
      partial: false,
    },
    {
      key: "test",
      label: "Шалгалт",
      hasContent: detail.tests.length > 0,
      done: testDone,
      partial: testPartial,
    },
  ];
}

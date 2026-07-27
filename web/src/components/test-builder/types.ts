// Тест зохиох дэлгэцийн (Алхам 1–4) хуваалцсан төрлүүд ба цэвэр туслах функцууд.
// Энд DOM/React алга — unit-test-style цэвэр логик, page.tsx болон
// доорх бүх test-builder/* компонентууд импортолж хэрэглэнэ.

export interface ChoiceOptionRef {
  order: number;
  text: string;
  isCorrect: boolean;
  label?: string;
}

export interface ProblemTagRef {
  tag: { id: string; type: string; name: string };
}

export interface ProblemAnalysisRef {
  status?: string;
  answerKeyStatus?: "VERIFIED" | "MISSING" | "REVIEW_REQUIRED";
  topic?: string | null;
  subtopic?: string | null;
}

export interface Problem {
  id: string;
  token: string;
  format: string; // CHOICE | FILL_NUMBER | OPEN
  statementText?: string | null;
  imageKey?: string | null;
  choices?: unknown;
  correctAnswer?: unknown;
  points: number;
  correctRate?: number | null;
  attemptCount?: number;
  tags?: ProblemTagRef[];
  analysis?: ProblemAnalysisRef | null;
  choiceOptions?: ChoiceOptionRef[];
}

export const FORMAT_LABEL: Record<string, string> = {
  CHOICE: "Сонгох",
  FILL_NUMBER: "Нөхөх",
  OPEN: "Задгай",
};

export const FORMAT_OPTIONS = [
  { value: "", label: "Бүх төрөл" },
  { value: "CHOICE", label: "Сонгох" },
  { value: "FILL_NUMBER", label: "Нөхөх" },
  { value: "OPEN", label: "Задгай" },
];

// ============================================================================
// Хариултын түлхүүр илрүүлэлт.
//
// 🚨 ЗОРИУДААР api/src/tests/grading.ts-ийн choiceModeOf/hasKnownAnswer-тэй
// ИЖИЛ логик — сервер бодит дүн бодохдоо яг үүнийг ашигладаг тул клиент
// (энэ дэлгэц) өөр дүгнэлт гаргавал багш худал баталгаа харна. Backend-ийн
// файлыг фронтенд рүү шууд импортлох боломжгүй (Nest/Prisma runtime тусдаа)
// тул логикийг хуулбарлав — grading.ts өөрчлөгдвөл ЭНД ч мөн шинэчлэх ёстой.
// ============================================================================

function isPlaceholderChoices(choices: unknown): boolean {
  if (!Array.isArray(choices) || choices.length === 0) return false;
  return choices.every(
    (c) => typeof c === "string" && /^[A-Za-zА-Яа-я]$/.test((c as string).trim()),
  );
}

type ChoiceMode = "TEXT" | "LETTER" | null;

function choiceModeOf(p: Problem): ChoiceMode {
  if (p.format !== "CHOICE") return null;
  if (p.choiceOptions && p.choiceOptions.length > 0) return "TEXT";
  if (Array.isArray(p.choices) && p.choices.length > 0) {
    return isPlaceholderChoices(p.choices) ? "LETTER" : "TEXT";
  }
  return null;
}

// Энэ бодлого зөв хариугүйгээр импортлогдсон эсэхийг илрүүлнэ (жш: эх docx-д
// хариуны түлхүүр байгаагүй). Ийм бодлого сурагчийн ямар ч хариуг "буруу" гэж
// дүгнэхгүй, харин оноо ЭСВЭЛ авахгүй тул тестэд орвол дүн шударга бус болно.
export function hasKnownAnswer(p: Problem): boolean {
  const mode = choiceModeOf(p);
  if (mode === "TEXT") {
    return (p.choiceOptions ?? []).some((o) => o.isCorrect);
  }
  const c = p.correctAnswer;
  if (c === null || c === undefined || c === "") return false;
  if (typeof c === "object" && (c as Record<string, unknown>).manualReview) {
    return false;
  }
  return true;
}

// ============================================================================
// "Түвшин" — өгөгдлөөс гарган авсан ойролцоо үзүүлэлт (гар аргаар зохиомол
// утга оноодоггүй). Хангалттай оролдлогогүй бол "unknown" — байхгүй
// мэдээллийг зохиомлоор гаргахгүй.
// ============================================================================

export type Difficulty = "easy" | "medium" | "hard" | "unknown";

const MIN_ATTEMPTS_FOR_DIFFICULTY = 5;

export function difficultyOf(p: Problem): Difficulty {
  if (p.correctRate == null || (p.attemptCount ?? 0) < MIN_ATTEMPTS_FOR_DIFFICULTY) {
    return "unknown";
  }
  if (p.correctRate >= 0.7) return "easy";
  if (p.correctRate >= 0.4) return "medium";
  return "hard";
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Хялбар",
  medium: "Дунд",
  hard: "Хэцүү",
  unknown: "Тодорхойгүй",
};

export const DIFFICULTY_OPTIONS: { value: "" | Difficulty; label: string }[] = [
  { value: "", label: "Бүх түвшин" },
  { value: "easy", label: "Хялбар" },
  { value: "medium", label: "Дунд" },
  { value: "hard", label: "Хэцүү" },
  { value: "unknown", label: "Тодорхойгүй (мэдээлэл хараахан хүрэлцэхгүй)" },
];

// ЭЕШ стандарт бүтэц (SPEC §II): I хэсэг 36 СОНГОХ (№1–12 ≈ 1 оноо,
// №13–28 ≈ 2 оноо, №29–36 ≈ 3 оноо), II хэсэг 4 НӨХӨХ, нийт 100 минут.
export const EESH_CHOICE_COUNT = 36;
export const EESH_FILL_COUNT = 4;
export const EESH_TOTAL_POINTS = 100;
export const EESH_TIME_LIMIT_MIN = 100;
export const EESH_LIKE_TYPES = new Set(["EESH_MOCK", "CHAPTER_EXAM"]);

export function eeshPointFor(choiceIndex: number): number {
  return choiceIndex < 12 ? 1 : choiceIndex < 28 ? 2 : 3;
}

// EveningMarking.tsx-тэй ижил шошго конвенц (SelfState enum-ы монгол нэрс) —
// хэрэглэгчид танил байх ёстой тул давхар зохион бүтээхгүй.
export const SELF_STATE_LABEL: Record<string, string> = {
  SOLVED_CLEAN: "Алдаагүй",
  FIXED_AFTER_ERROR: "Зассан",
  FAILED: "Алдсан",
  GUESSED: "Буудсан",
};

export const SELF_STATE_OPTIONS = [
  { value: "SOLVED_CLEAN", label: "Алдаагүй" },
  { value: "FIXED_AFTER_ERROR", label: "Зассан" },
  { value: "FAILED", label: "Алдсан" },
  { value: "GUESSED", label: "Буудсан" },
] as const;

export function selfStateLabel(state?: string | null): string {
  if (!state) return "Тэмдэглэгээгүй";
  return SELF_STATE_LABEL[state] ?? state;
}

export const ATTEMPT_SOURCE_LABEL: Record<string, string> = {
  EVENING_SELF_REPORT: "Оройн тэмдэглэгээ",
  ONLINE_TEST: "Онлайн тест",
  CHAPTER_EXAM: "Бүлгийн шалгалт",
  OMR_IMPORT: "Хариултын хуудас",
};

export function sourceLabel(source?: string | null): string {
  if (!source) return "—";
  return ATTEMPT_SOURCE_LABEL[source] ?? source;
}

// TestType enum (schema.prisma) — /progress/student/:id-ийн tests[].type
export const TEST_TYPE_LABEL: Record<string, string> = {
  DAILY: "Өдөр тутмын тест",
  CHAPTER_EXAM: "Бүлгийн шалгалт",
  EESH_MOCK: "ЭЕШ сорил",
  CUSTOM: "Бусад тест",
  THEORY: "Онолын тест",
};

export function testTypeLabel(type?: string | null): string {
  if (!type) return "—";
  return TEST_TYPE_LABEL[type] ?? type;
}

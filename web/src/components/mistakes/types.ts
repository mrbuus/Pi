export type MistakeStatus = "NEW" | "RETRYING" | "MASTERED";
export type Mistake = {
  id: string;
  problem: {
    id: string;
    statementText: string | null;
    choices: string[] | null;
    choiceMode: "TEXT" | "LETTER" | null;
    format: string;
    imageKey: string | null;
    answerFields?: string[];
  };
  givenAnswer: unknown;
  correctAnswer?: unknown;
  solutionOutline?: string | null;
  status: MistakeStatus;
  reason: string | null;
  note: string | null;
  testTitle: string | null;
  nextRetryAt?: string | null;
  formulas: { slug: string; title: string; latex: string | null }[];
};
export type NotebookPayload = {
  counts: Record<MistakeStatus, number>;
  byTopic: { topic: string; count: number }[];
  items: Mistake[];
  nextCursor?: string | null;
};
export type RetryResult = {
  correct: boolean;
  correctAnswer: unknown;
  status: MistakeStatus;
  nextRetryAt?: string | null;
  solutionOutline?: string | null;
};
export const STATUS_LABELS: Record<MistakeStatus, string> = {
  NEW: "Шинэ", RETRYING: "Давтаж байна", MASTERED: "Эзэмшсэн",
};

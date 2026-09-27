export type ReviewResult = "AGAIN" | "HARD" | "GOOD" | "EASY";
export type ReviewMode = "flashcard" | "blank" | "truefalse" | "match";
export interface ReviewCard {
  slug: string;
  title: string;
  section: string | null;
  latex: string | null;
  general: string | null;
  box: number;
  dueAt: string;
  exercise: {
    mode: ReviewMode;
    token: string;
    groupId?: string;
    prompt: string | null;
    options: { id: string; text: string }[];
  };
}
export interface DueResponse {
  dueCount: number;
  newCount: number;
  cards: ReviewCard[];
}
export interface ReviewStats {
  mastered: number;
  learning: number;
  new: number;
  reviewedToday: number;
  streakDays: number;
}
export interface ReviewReceipt {
  slug: string;
  box: number;
  dueAt: string;
  streak: number;
  result: ReviewResult;
  source: "SELF_ASSESSMENT" | "SERVER_GRADED";
  feedback: null | {
    correct: boolean;
    answer: string;
    why: string | null;
    latex: string | null;
    general: string | null;
  };
}
export interface ReviewAnswer {
  exerciseToken: string;
  result?: ReviewResult;
  answer?: string;
}
export const RATINGS: { value: ReviewResult; label: string }[] = [
  { value: "AGAIN", label: "Дахиад" },
  { value: "HARD", label: "Хэцүү" },
  { value: "GOOD", label: "Зөв" },
  { value: "EASY", label: "Амархан" },
];

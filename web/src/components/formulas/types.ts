export type FormulaSection = {
  slug: string;
  title: string;
  order: number;
  icon: string | null;
  description: string | null;
  count: number;
};
export type FormulaSummary = {
  slug: string;
  title: string;
  section: string | null;
  order: number;
  level: string;
  grade: number | null;
  topicSlugs: string[];
  latex: string | null;
  general: string | null;
  widget: string | null;
};
export type FormulaQuiz =
  | { type: "blank"; prompt: string; answer: string; distractors: string[] }
  | {
      type: "truefalse";
      prompt: string;
      answer: "true" | "false";
      why: string;
    };
export type FormulaDetail = Omit<FormulaSummary, "section"> & {
  section: Pick<FormulaSection, "slug" | "title" | "icon"> | null;
  updatedAt: string;
  quiz?: FormulaQuiz[] | null;
  variants: { label: string; latex: string }[] | null;
  conditions: string[] | null;
  explanation: string | null;
  derivation: string[] | null;
  mnemonic: string | null;
  examples: { problem: string; steps: string[]; answer: string }[] | null;
  commonMistakes: string[] | null;
  eeshTip: string | null;
  related: { slug: string; title: string; latex: string | null }[];
  practice: {
    problemId: string;
    token: string;
    statementText: string | null;
    chapterTitle: string;
  }[];
};
export type SeenFormula = {
  slug: string;
  title: string;
  section: { slug: string; title: string } | null;
  latex: string | null;
  general: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  seenCount: number;
  correctCount: number;
  lastTestTitle: string | null;
};
export type SeenFormulas = {
  totalFormulas: number;
  seenFormulas: number;
  items: SeenFormula[];
};

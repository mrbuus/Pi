export type ReviewMockOptions = {
  empty?: boolean;
  failLoadOnce?: boolean;
  failSaveOnce?: boolean;
  staleExerciseOnce?: boolean;
  loadDelayMs?: number;
};
export const reviewCards = Array.from({ length: 10 }, (_, index) => {
  const n = index + 1;
  const mode =
    index % 7 === 0
      ? "flashcard"
      : index % 7 === 1
        ? "blank"
        : index % 7 === 2
          ? "truefalse"
          : "match";
  const options =
    mode === "blank"
      ? [n + 2, n + 1, n + 3, n + 4].map((value) => ({
          id: `choice-${index}-${value}`,
          text:
            value === n + 4
              ? `\\frac{${value}}{2}+\\underbrace{0+0+0+0+0+0+0+0+0+0+0+0+0}_{0}`
              : `\\frac{${value}}{2}`,
        }))
      : mode === "truefalse"
        ? [
            { id: "true", text: "Үнэн" },
            { id: "false", text: "Худал" },
          ]
        : mode === "match"
          ? [6, 5, 4, 3].map((i) => ({
              id: `match-${i}`,
              text: `${i + 1}+1=${i + 2}`,
            }))
          : [];
  return {
    slug: `synthetic-review-${index}`,
    title: `Туршилтын томьёо ${n}`,
    section: index % 2 ? "numbers-algebra" : "equations-inequalities",
    latex: mode === "flashcard" ? `${n}+1=${n + 1}` : null,
    general: mode === "flashcard" ? `${n}+1=${n + 1}` : null,
    quiz: [],
    box: 0,
    dueAt: "2026-09-27T00:00:00.000Z",
    exercise: {
      mode,
      token: `synthetic-exercise-${index}`,
      ...(mode === "match" ? { groupId: "synthetic-match-group" } : {}),
      prompt:
        mode === "blank"
          ? `\\frac{${n}+1}{2}=\\square`
          : mode === "truefalse"
            ? `${n}+1=${n + 2}`
            : null,
      options,
    },
  };
});
export function reviewMock(options: ReviewMockOptions) {
  const receipts = new Map<string, Record<string, unknown>>();
  let loadFailed = false,
    saveFailed = false;
  return {
    async handle(path: string, method: string, body: Record<string, unknown>) {
      if (path === "/formulas/review/due" && method === "GET") {
        if (options.loadDelayMs)
          await new Promise((resolve) =>
            setTimeout(resolve, options.loadDelayMs),
          );
        if (options.failLoadOnce && !loadFailed) {
          loadFailed = true;
          return { status: 400, body: { message: "Зохиомол ачаалах алдаа" } };
        }
        const cards = options.empty
          ? []
          : reviewCards.filter((card) => !receipts.has(card.exercise.token));
        return { body: { dueCount: 0, newCount: cards.length, cards } };
      }
      if (path === "/formulas/review/stats" && method === "GET")
        return {
          body: {
            mastered: 0,
            learning: receipts.size,
            new: options.empty ? 0 : 10 - receipts.size,
            reviewedToday: receipts.size,
            streakDays: receipts.size ? 1 : 0,
          },
        };
      const card = reviewCards.find(
        (card) => path === `/formulas/review/${card.slug}`,
      );
      if (!card || method !== "POST") return null;
      if (options.staleExerciseOnce && !saveFailed) {
        saveFailed = true;
        return { status: 409, body: { message: "Дасгалын хугацаа дууссан." } };
      }
      if (options.failSaveOnce && !saveFailed) {
        saveFailed = true;
        return { status: 400, body: { message: "Зохиомол хадгалах алдаа" } };
      }
      if (body.exerciseToken !== card.exercise.token)
        return { status: 400, body: { message: "Хүчингүй дасгал" } };
      if (receipts.has(card.exercise.token))
        return { body: receipts.get(card.exercise.token) };
      const index = reviewCards.indexOf(card),
        answer =
          card.exercise.mode === "blank"
            ? `\\frac{${index + 2}}{2}`
            : card.exercise.mode === "truefalse"
              ? "false"
              : `${index + 1}+1=${index + 2}`;
      const correctId =
        card.exercise.mode === "blank"
          ? card.exercise.options.find((option) => option.text === answer)!.id
          : card.exercise.mode === "truefalse"
            ? "false"
            : `match-${index}`;
      const self = card.exercise.mode === "flashcard";
      const correct = body.answer === correctId;
      const receipt = {
        slug: card.slug,
        box: 0,
        dueAt: "2026-09-28T00:00:00.000Z",
        streak: 1,
        result: self ? body.result : correct ? "GOOD" : "AGAIN",
        source: self ? "SELF_ASSESSMENT" : "SERVER_GRADED",
        feedback: self
          ? null
          : {
              correct,
              answer,
              why:
                card.exercise.mode === "truefalse"
                  ? `$${index + 1}+1=${index + 2}$`
                  : null,
              latex: `${index + 1}+1=${index + 2}`,
              general: `${index + 1}+1=${index + 2}`,
            },
      };
      receipts.set(card.exercise.token, receipt);
      return { body: receipt };
    },
  };
}

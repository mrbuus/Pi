export function isStudyLearner(role: string | null | undefined): boolean {
  return role === "STUDENT" || role === "BUYER";
}
export function studyMode(
  role: string | null | undefined,
  requested: string | null | undefined,
): "independent" | "classroom" | "probe" {
  return requested === "probe"
    ? "probe"
    : requested === "classroom" && role === "STUDENT"
      ? "classroom"
      : "independent";
}
export function restoredStudyTask(
  role: string | null | undefined,
  saved: string | null,
): string | null {
  if (!isStudyLearner(role) || !saved || saved.length > 160) return null;
  const generated =
    /^lab-v1:(linear|quadratic|fractions|vector-dot|derivative-value|integral-definite):(0|[1-9]\d{0,9})$/.exec(
      saved,
    );
  if (generated)
    return Number(generated[2]) > 4294967295
      ? null
      : `/learning-lab/problem?family=${generated[1]}&seed=${generated[2]}`;
  return saved.startsWith("lab-")
    ? null
    : `/learning-lab/bank/${encodeURIComponent(saved)}`;
}
export type StudyRecord = {
  problemId: string;
  kind: string;
  at: string;
  answer?: string;
  correct?: boolean | null;
  mode?: string;
  flags?: string[];
};
export function answerRecordLabel(
  row: Pick<StudyRecord, "answer" | "flags">,
): string {
  return row.answer?.trim()
    ? row.answer
    : row.flags?.includes("could-not")
      ? "Бодож чадаагүй гэж тэмдэглэсэн"
      : "Хариулт бичээгүй";
}
export function correctnessLabel(correct: boolean | null | undefined): string {
  return correct === true
    ? "Зөв"
    : correct === false
      ? "Буруу"
      : "Үнэлгээ тодорхойгүй";
}
export function independentCorrectRecords(rows: StudyRecord[]): StudyRecord[] {
  return rows.filter(
    (row) =>
      row.kind === "first" &&
      row.correct === true &&
      row.mode === "independent" &&
      !row.flags?.some((flag) =>
        ["guessed", "help", "could-not"].includes(flag),
      ) &&
      !rows.some(
        (event) =>
          event.problemId === row.problemId &&
          ["solution-viewed", "video-solution-open"].includes(event.kind) &&
          Date.parse(event.at) <= Date.parse(row.at),
      ),
  );
}

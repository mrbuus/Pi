/** Persisted issued order and autosaved answer IDs are prior exposure, not mastery. */
export function officialProblemIds(session: {
  problemOrder: unknown;
  draftAnswers: unknown;
}): string[] {
  const order = Array.isArray(session.problemOrder)
    ? session.problemOrder.filter((id): id is string => typeof id === 'string')
    : [];
  const drafts =
    session.draftAnswers &&
    typeof session.draftAnswers === 'object' &&
    !Array.isArray(session.draftAnswers)
      ? Object.keys(session.draftAnswers)
      : [];
  return [...new Set([...order, ...drafts])];
}

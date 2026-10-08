import type { AttemptSignal } from './scheduler';
export interface EvidenceRow {
  problemId: string;
  topicId: string;
  at: Date;
  correct: boolean | null;
  selfState: string | null;
  source: string;
  assisted?: boolean;
}
export interface TopicEvidence {
  independentAttempts: number;
  independentCorrect: number;
  corrected: number;
  guessedOrHelped: number;
  selfReported: number;
  unknown: number;
  repeated: number;
  lastIndependentAt: string | null;
}
export function measuredEvidence(
  rows: EvidenceRow[],
  exposures: { problemId: string; at: Date }[] = [],
) {
  const firstExposure = new Map<string, number>();
  for (const exposure of exposures) {
    const at = exposure.at.getTime();
    firstExposure.set(
      exposure.problemId,
      Math.min(firstExposure.get(exposure.problemId) ?? at, at),
    );
  }
  const topics = new Map<string, TopicEvidence>(),
    history: AttemptSignal[] = [],
    seen = new Set<string>();
  for (const row of [...rows].sort(
    (a, b) =>
      a.at.getTime() - b.at.getTime() || a.problemId.localeCompare(b.problemId),
  )) {
    const e = topics.get(row.topicId) ?? {
      independentAttempts: 0,
      independentCorrect: 0,
      corrected: 0,
      guessedOrHelped: 0,
      selfReported: 0,
      unknown: 0,
      repeated: 0,
      lastIndependentAt: null,
    };
    topics.set(row.topicId, e);
    const repeated = seen.has(row.problemId);
    seen.add(row.problemId);
    if (row.selfState === 'FIXED_AFTER_ERROR') {
      e.corrected++;
      continue;
    }
    if (
      row.assisted ||
      row.selfState === 'GUESSED' ||
      (firstExposure.get(row.problemId) ?? Infinity) <= row.at.getTime()
    ) {
      e.guessedOrHelped++;
      continue;
    }
    if (row.source === 'EVENING_SELF_REPORT') {
      e.selfReported++;
      continue;
    }
    if (row.correct === null) {
      e.unknown++;
      continue;
    }
    if (repeated) {
      e.repeated++;
      continue;
    }
    e.independentAttempts++;
    if (row.correct) e.independentCorrect++;
    e.lastIndependentAt = row.at.toISOString();
    history.push({
      problemId: row.problemId,
      topicId: row.topicId,
      correct: row.correct,
      at: row.at.getTime(),
    });
  }
  return { history, topics, seen };
}
export const observedDifficulty = (correctRate: number | null) =>
  correctRate === null ? 0.5 : 1 - correctRate;
export const emptyEvidence = (): TopicEvidence => ({
  independentAttempts: 0,
  independentCorrect: 0,
  corrected: 0,
  guessedOrHelped: 0,
  selfReported: 0,
  unknown: 0,
  repeated: 0,
  lastIndependentAt: null,
});
export function labEvidence(
  problemId: string,
  topicId: string,
  at: Date,
  meta: unknown,
): EvidenceRow | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const m = meta as Record<string, unknown>;
  if (m.lab !== 'v1' || m.kind !== 'first') return null;
  const flags = Array.isArray(m.flags) ? (m.flags as unknown[]) : [];
  return {
    problemId,
    topicId,
    at,
    correct: typeof m.correct === 'boolean' ? m.correct : null,
    selfState: flags.includes('guessed') ? 'GUESSED' : null,
    source: m.mode === 'classroom' ? 'EVENING_SELF_REPORT' : 'LAB_FIRST',
    assisted: flags.includes('help') || flags.includes('could-not'),
  };
}

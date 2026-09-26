/** Data shapes for retained, currently unmounted legacy presentation components. */
export interface TestStats {
  totalAttempts: number;
  passCount: number;
  failCount: number;
  averageScore: number;
  medianScore: number;
  stdDeviation: number;
  minScore: number;
  maxScore: number;
  scoreDistribution: Array<{ bin: string; count: number }>;
}

export interface ProblemStats {
  problemId: string;
  problemTitle: string;
  topicId: string;
  topicName: string;
  totalAttempts: number;
  successRate: number;
  pointBiserial: number;
  discrimination: "bad" | "poor" | "acceptable" | "good";
  commonMistakes: Array<{ optionId: string; optionText: string; selectionRate: number }>;
}

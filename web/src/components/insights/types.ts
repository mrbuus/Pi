// Шалгалтын дүн шинжилгээ — bagshi.py сорилтын дараа нийт хүүхдүүдийн
// бодлогын чадамж, сэдвийн ялгаа, бодлогын чанарыг үзүүлнэ.

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

export interface StudentTopicStats {
  studentId: string;
  studentName: string;
  topicStats: Array<{
    topicId: string;
    topicName: string;
    successRate: number; // 0..1
  }>;
}

export interface ProblemStats {
  problemId: string;
  problemTitle: string;
  topicId: string;
  topicName: string;
  totalAttempts: number;
  successRate: number; // 0..1
  pointBiserial: number; // -1..1 — сайн ялгаж байгаа уу
  discrimination: "bad" | "poor" | "acceptable" | "good";
  commonMistakes: Array<{
    optionId: string;
    optionText: string;
    selectionRate: number; // 0..1
  }>;
}

export interface TestInsights {
  testId: string;
  testTitle: string;
  classroomId: string;
  classroomName: string;
  conductedAt: string;
  stats: TestStats;
  studentTopics: StudentTopicStats[];
  problems: ProblemStats[];
}

export interface DiscriminationAlert {
  problemId: string;
  problemTitle: string;
  issue: "low_discrimination" | "high_discrimination" | "no_variance";
  description: string;
  recommendation: string;
}

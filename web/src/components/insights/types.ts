export interface DistractorAnalysis {
  problemId: string;
  problemToken: string;
  totalAttempts: number;
  distractor: Array<{
    choiceLabel: string;
    choiceText: string;
    selectionCount: number;
    selectionRate: number;
    mistakeType?: string;
    mistakeNote?: string;
  }>;
}

export interface ProblemQuality {
  problemId: string;
  problemToken: string;
  difficulty: number;
  discrimination: number;
  isDefective: boolean;
  attemptCount: number;
  correctCount: number;
}

export interface TopicMastery {
  studentId: string;
  studentName: string;
  topicMasteries: Array<{
    topicId: string;
    topicName: string;
    problemCount: number;
    correctCount: number;
    masteryRate: number;
  }>;
}

export interface ClassroomOption {
  id: string;
  name: string;
  grade?: number | null;
}

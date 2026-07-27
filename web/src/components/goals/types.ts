export type GoalStatus = "PLANNED" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "CANCELLED";
export type GoalSubject = "MATH" | "SOCIAL_STUDIES";

export interface Goal {
  id: string;
  studentId: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: GoalStatus;
  subject: GoalSubject | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalFormValues {
  title: string;
  description: string;
  targetDate: string;
  subject: GoalSubject | "";
}

export const EMPTY_GOAL_FORM: GoalFormValues = {
  title: "",
  description: "",
  targetDate: "",
  subject: "",
};

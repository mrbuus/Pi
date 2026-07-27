// Ажилтны жилийн төлөвлөгчийн бүх төрлүүд — API-тай (StaffTask/StaffTaskAssignee) уялдана.

export type TaskStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "DONE"
  | "BLOCKED"
  | "CANCELLED";

export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type TaskSubject = "MATH" | "SOCIAL_STUDIES";

export interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  role: string;
}

export interface Assignee {
  userId: string;
  assignedAt: string;
  user: StaffUser;
}

export interface ClassroomRef {
  id: string;
  name: string;
}

// Дэд даалгавар (нэг л түвшин — дэд даалгаварт өөрийн дэд даалгавар байхгүй)
export interface SubTask {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  parentTaskId?: string | null;
  classroomId?: string | null;
  classroom?: ClassroomRef | null;
  subject?: TaskSubject | null;
  estimateHours?: number | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  assignees: Assignee[];
}

// Дээд түвшний даалгавар (эцэг) — createdBy болон subtasks-тай
export interface Task extends SubTask {
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string };
  subtasks: SubTask[];
}

export interface WorkloadRow {
  user: StaffUser;
  counts: Record<TaskStatus, number>;
  totalEstimateHours: number;
  openCount: number;
}

export interface TaskFilters {
  assigneeId?: string;
  classroomId?: string;
  subject?: TaskSubject;
}

// Хадгалах маягтын input (create/update хоёрт хоёуланд ашиглана)
export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string; // "" бол null болгоно
  dueDate: string;
  classroomId: string;
  subject: "" | TaskSubject;
  estimateHours: string; // "" бол null
  assigneeIds: string[];
  parentTaskId?: string | null;
}

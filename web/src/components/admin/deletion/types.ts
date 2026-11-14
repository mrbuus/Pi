export type DeletionStatus = "PENDING" | "IN_REVIEW" | "RESOLVED" | "REJECTED";

export interface DeletionRequestUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  role: string;
  archivedAt: string | null;
}

export interface DeletionRequest {
  id: string;
  status: DeletionStatus;
  reason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  reviewedById: string | null;
  user: DeletionRequestUser;
}

export const STATUS_LABEL: Record<DeletionStatus, string> = {
  PENDING: "Шинэ",
  IN_REVIEW: "Хянаж байна",
  RESOLVED: "Шийдвэрлэсэн",
  REJECTED: "Татгалзсан",
};

export const STATUS_TONE: Record<
  DeletionStatus,
  "warning" | "info" | "success" | "neutral"
> = {
  PENDING: "warning",
  IN_REVIEW: "info",
  RESOLVED: "success",
  REJECTED: "neutral",
};

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Админ",
  TEACHER_PLUS: "Багш+",
  TEACHER: "Багш",
  STUDENT: "Сурагч",
  PARENT: "Эцэг эх",
  BUYER: "Худалдан авагч",
};

/* ============================================================================
 * Шалгалтын дүнгийн хуудсанд ашиглагдах нийтлэг төрлүүд.
 * ========================================================================== */

export interface ResultRow {
  id: string;
  totalScore: number;
  maxScore: number;
  source: string;
  student: { id: string; firstName: string; lastName: string };
  // Шалгалтын горимоос (таб/апп) гарсан тоо — анти-читийн дохио (Шийдвэр Е)
  leaveCount?: number | null;
}

export interface RosterStudent {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ClassroomOption {
  id: string;
  name: string;
}

const SOURCE_LABEL: Record<string, string> = {
  CHAPTER_EXAM: "Цаасан (гараар)",
  ONLINE_TEST: "Онлайн",
  OMR_IMPORT: "Онлайн (OMR)",
  EVENING_SELF_REPORT: "Өөрөө мэдүүлсэн",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? "Онлайн";
}

// maxScore=0 (хуучин бичилт) үед NaN гарахаас хамгаална — заавал "—" харуулна
export function scorePercent(totalScore: number, maxScore: number): number | null {
  if (!Number.isFinite(maxScore) || maxScore <= 0) return null;
  return Math.round((totalScore / maxScore) * 100);
}

export function fullName(s: { firstName: string; lastName: string }): string {
  return `${s.firstName} ${s.lastName}`.trim();
}

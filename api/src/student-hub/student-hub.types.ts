// /student-hub/* хариуны төрөл — гэрээ docs/v2/SURAGCH-V2-GEREE.md «API». Огноо бүр «YYYY-MM-DD» (УБ).

import type {
  AttendanceSummary,
  HomeworkStatus,
  HomeworkSummary,
  HomeworkView,
  HubProblem,
} from './student-hub.logic';

export type LateRangeValue =
  | 'FIVE_TO_TEN'
  | 'TEN_TO_THIRTY'
  | 'THIRTY_TO_SIXTY'
  | 'OVER_ONE_HOUR';

export interface HubOverview {
  classrooms: { id: string; name: string }[];
  attendance: AttendanceSummary;
  homework: HomeworkSummary;
  today: {
    classroomId: string;
    classroomName: string;
    date: string;
    startMinute: number;
    endMinute: number;
    room: string | null;
    topic: string | null;
  } | null;
  /**
   * Хамгийн сүүлд багшийн тавьсан тэмдэглэгээ: date = тэмдэглэсэн өдөр (D'), lessonDate =
   * даалгавар өгсөн хичээлийн өдөр (D; олдохгүй/хуучин анги бол null)
   */
  latestMark: {
    date: string;
    status: HomeworkStatus;
    comment: string | null;
    classroomId: string;
    lessonDate: string | null;
  } | null;
}

export interface HubDayTest {
  testId: string | null;
  title: string;
  variant: string | null;
  open: boolean;
}

export interface HubDay {
  date: string;
  classroomId: string;
  classroomName: string;
  startMinute: number | null;
  endMinute: number | null;
  room: string | null;
  topic: string | null;
  /** LessonRecord / LessonStaffing (байхгүй бол хуваарийн багш); Багш+ нэрэнд «+» */
  teachers: string[];
  problemNumbers: string | null;
  tests: HubDayTest[];
  attendance: {
    status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
    lateRange: LateRangeValue | null;
  } | null;
  homework: HomeworkView;
  theory: {
    count: number;
    mine: boolean;
    canUpload: boolean;
    assignedToMe: boolean;
  };
  homeworkPhoto: {
    id: string;
    fileKey: string;
    pages: number;
    uploadedAt: string;
  } | null;
  canSendHomework: boolean;
}

export interface HubDays {
  month: string;
  prevMonth: string | null;
  nextMonth: string | null;
  days: HubDay[];
}

export interface HubTestRow {
  testId: string | null;
  title: string;
  variant: string | null;
  date: string;
  classroomName: string;
  problemCount: number;
  open: boolean;
}

export interface HubTestDetail {
  testId: string;
  title: string;
  variant: string | null;
  date: string;
  problems: HubProblem[];
}

export interface HubTheoryRow {
  classroomId: string;
  classroomName: string;
  date: string;
  topic: string | null;
  tests: string[];
  count: number;
  uploaders: string[];
  canUpload: boolean;
}

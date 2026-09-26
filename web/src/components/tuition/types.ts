export type RefundStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PAID'
  | 'CANCELLED';

export type RefundWarning =
  | 'NO_LESSON_DAYS'
  | 'LEFT_BEFORE_JOINED'
  | 'ZERO_TUITION'
  | 'LEFT_AFTER_LAST_LESSON'
  | 'JOINED_BEFORE_FIRST_LESSON';

export interface RefundCalculation {
  totalLessonDays: number;
  attendedLessonDays: number;
  dailyRate: number;
  owed: number;
  totalPaid: number;
  refundAmount: number;
  shortfall: number;
  warnings: RefundWarning[];
}

export interface RefundPreview {
  student: { id: string; firstName: string; lastName: string };
  classroom: { id: string; name: string };
  joinedOn: string;
  leftOn: string;
  calculation: RefundCalculation;
  explanation: string[];
}

export interface RefundRow {
  id: string;
  studentId: string;
  classroomId: string;
  leftOn: string;
  totalLessonDays: number;
  attendedLessonDays: number;
  dailyRate: number;
  owed: number;
  totalPaid: number;
  refundAmount: number;
  shortfall: number;
  status: RefundStatus;
  warnings?: string | RefundWarning[] | null;
  note?: string | null;
  paymentMethod?: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  paidAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  student: { id: string; firstName: string; lastName: string };
  classroom: { id: string; name: string };
}

export interface RefundDetail extends RefundRow {
  joinedOn?: string;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
  paidBy?: { id: string; firstName: string; lastName: string } | null;
  cancelledBy?: { id: string; firstName: string; lastName: string } | null;
  warnings: RefundWarning[];
}

export interface RefundListResponse {
  refunds: RefundRow[];
  total: number;
}

export const REFUND_STATUS: Record<RefundStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Ноорог', className: 'border-line bg-panel text-ink-dim' },
  PENDING_APPROVAL: { label: 'Зөвшөөрөл хүлээж буй', className: 'border-warning/30 bg-warning/10 text-warning' },
  APPROVED: { label: 'Зөвшөөрсөн', className: 'border-info/30 bg-info/10 text-info' },
  PAID: { label: 'Олгосон', className: 'border-success/30 bg-success/10 text-success' },
  CANCELLED: { label: 'Цуцалсан', className: 'border-error/30 bg-error/10 text-error' },
};

export const REFUND_WARNING_TEXT: Record<RefundWarning, string> = {
  NO_LESSON_DAYS: 'Энэ хугацаанд хичээлийн өдөр олдсонгүй. Ангийн хуваарь тохируулагдсан эсэхийг шалгана уу.',
  LEFT_BEFORE_JOINED: 'Гарах огноо орсон огнооноос өмнө байна. Огноог шалгана уу.',
  ZERO_TUITION: 'Сурагчийн сургалтын төлбөр тохируулагдаагүй байна. Бүртгэлээс төлбөрийн дүнг оруулна уу.',
  LEFT_AFTER_LAST_LESSON: 'Гарах огноо гэрээний сүүлийн хичээлээс хойш байна. Бүтэн хугацаагаар тооцов.',
  JOINED_BEFORE_FIRST_LESSON: 'Орсон огноо гэрээний эхний хичээлээс өмнө байна. Эхнээс нь тооцов.',
};

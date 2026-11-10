/** Сургалтаас хасах үеийн тооцоо (API: /tuition/withdrawal) — эзэн 2026-11-03, гэрээ «Найм» */

export interface WithdrawalCycle {
  start: string;
  end: string;
  full: boolean;
  lessons: number;
  /** Вэбд ирц бүртгэхээс өмнөх (суусан гэж үзсэн) хичээл — 2026-11-08-аас өмнө хадгалсанд байхгүй */
  assumed?: number;
  leaveDay: string | null;
  extraDays: string[];
  counted: number;
  charge: number;
}

export interface WithdrawalResult {
  cycles: WithdrawalCycle[];
  perLesson: number;
  fullMonths: number;
  owed: number;
  paid: number;
  /** Өмнө нь гаргасан буцаалт (төлсөн дүнгээс хассан) */
  refundedBefore?: number;
  refund: number;
  over: number;
}

export interface WithdrawalLessonDay {
  date: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED" | null;
  note: string | null;
  leave: boolean;
  excluded: boolean;
  /** Вэбд ирц бүртгэхээс өмнөх — суусан гэж үзнэ, хасах боломжгүй */
  assumed?: boolean;
}

export interface WithdrawalPreview {
  student: { id: string; firstName: string; lastName: string };
  classroom: { id: string; name: string };
  plan: { kind: "FULL_YEAR" | "INSTALLMENT" | "MONTHLY"; autoFull: boolean; settled: boolean; price: number };
  monthlyFee: number;
  lessonsPerMonth: number;
  daysPerWeek: number | null;
  startDate: string | null;
  countFrom: string;
  leftOn: string;
  /** Ангид вэбд ирц бүртгэж эхэлсэн өдөр */
  webStart?: string | null;
  /** Хуваарьгүй анги — хичээлийн тоо мэдэгдэхгүй */
  noSchedule?: boolean;
  payments: { amount: number; paidOn: string | null; forMonth: string | null }[];
  result: WithdrawalResult;
  lastCycleDays: WithdrawalLessonDay[];
  history: {
    lessons: number;
    attendance: Record<string, number>;
    homework: Record<string, number>;
  };
  note?: string | null;
}

export interface SavedWithdrawal {
  id: string;
  leftOn: string;
  countFrom: string;
  reason: string;
  owed: number;
  paid: number;
  refund: number;
  createdAt: string;
  createdBy: string | null;
  refundStatus: { id: string; status: string; paidAt: string | null } | null;
  detail: WithdrawalPreview;
}

export const PLAN_LABEL: Record<WithdrawalPreview["plan"]["kind"], string> = {
  FULL_YEAR: "Бүтэн жил",
  INSTALLMENT: "Хуваан төлөх",
  MONTHLY: "Сар бүр",
};

export const ATT_LABEL: Record<string, string> = {
  PRESENT: "Ирсэн",
  LATE: "Хоцорсон",
  ABSENT: "Тасалсан",
  EXCUSED: "Чөлөөтэй",
};

export const HW_LABEL: Record<string, string> = {
  DONE: "Хийсэн",
  PARTIAL: "Дутуу",
  NOT_DONE: "Хийгээгүй",
};

/** «2026-11-03» → «11.03» */
export const md = (d: string) => `${d.slice(5, 7)}.${d.slice(8, 10)}`;

// API: /reconcile/* (api/src/reconcile/reconcile.service.ts)

export type AllocKind = "TUITION" | "BOOK" | "ANSWER_SHEET" | "STAFF_FINE" | "TRANSFER" | "EXPENSE" | "OTHER";
export type Lane = "manual" | "tuition" | "other" | "expense" | "sheet";

export const KIND_LABEL: Record<AllocKind, string> = {
  TUITION: "Сургалтын төлбөр",
  BOOK: "Ном",
  ANSWER_SHEET: "Хариултын хуудас",
  STAFF_FINE: "Заалны торгууль",
  TRANSFER: "Данс хоорондын шилжүүлэг",
  EXPENSE: "Зарлага",
  OTHER: "Бусад",
};

/** Хүүхэдтэй холбогддог зориулалт */
export const STUDENT_KINDS: AllocKind[] = ["TUITION", "BOOK", "ANSWER_SHEET"];

export interface StudentCard {
  id: string;
  name: string;
  classroom: string | null;
  archived: boolean;
  /** Хайлтад: жилийн сургалтын төлбөрөө бүрэн төлсөн */
  paidUp?: boolean;
}

export type MatchSignal = "PHONE" | "PHONE_LEARNED" | "ACCOUNT" | "ACCOUNT_LEARNED" | "NAME" | "SURNAME";

export interface Candidate {
  studentId: string;
  score: number;
  signals: MatchSignal[];
  student: StudentCard | null;
  /** Энэ хүүхдэд шийтэд бүртгэгдсэн, ±3 хоногийн, хуулгатай холбогдоогүй төлбөр */
  sheetPays: { amount: number; date: string }[];
}

export interface Suggestion {
  decision: "AUTO" | "SUGGEST" | "CHOOSE" | "SPLIT" | "NONE";
  kind: AllocKind;
  kindLabel: string;
  confident: boolean;
  split: { kind: AllocKind; amount: number }[] | null;
  reason: string;
  unrecorded: boolean;
  /** Жилийн төлбөрөө бүрэн төлсөн тул саналаас хассан хүүхдийн тоо */
  hiddenPaidUp: number;
  candidates: Candidate[];
}

export interface Allocation {
  id: string;
  kind: AllocKind;
  kindLabel: string;
  amount: number;
  studentId: string | null;
  student: StudentCard | null;
  auto: boolean;
  /** Шийтээс аль хэдийн орсон төлбөртэй холбосон */
  inSheet: boolean;
}

export interface BankRow {
  id: string;
  bookedAt: string;
  amount: number;
  direction: "CREDIT" | "DEBIT";
  description: string;
  counterparty: string | null;
  /** Харьцсан дансны эзэмшигч (хуулгын «ХААНААС: НЭР»-ээс), энэ данснаас ирсэн гүйлгээ, өмнө оноосон хүүхэд */
  account: { owner: string | null; txCount: number; students: StudentCard[] } | null;
  resolvedAt: string | null;
  resolvedBySystem: boolean;
  /** Ажилтан шийтэд хөтөлсөн гэж тэмдэглэгдсэн (хуваарилалтгүй) */
  inSheet: boolean;
  /** Шийтэд ижил дүнтэй ±3 хоногийн бүртгэл олдсонгүй — шалгах */
  sheetMissing: boolean;
  suggestion: Suggestion | null;
  allocations: Allocation[];
}

export interface Overview {
  cursors: { accountNo: string; settledThrough: string; coveredThrough: string; sheetThrough: string | null }[];
  counts: Record<Lane, number>;
  /** Шийтэд хөтлөгдсөн гэж нуусан ч шийтэд байгааг баталж чадаагүй */
  sheetCheck: number;
  lastImportAt: string | null;
}

export interface ImportSummary {
  rows: number;
  newRows: number;
  duplicates: number;
  beforeSettled: number;
  autoResolved: number;
  inSheet: number;
  open: number;
  settledThrough: string | null;
  from: string | null;
  to: string | null;
}

export interface AllocPart {
  kind: AllocKind;
  amount: number;
  studentId?: string;
}

export const SIGNAL_LABEL: Record<MatchSignal, string> = {
  PHONE: "Утас",
  PHONE_LEARNED: "Өмнө оноосон утас",
  ACCOUNT: "Өмнө оноосон данс",
  ACCOUNT_LEARNED: "Өмнө оноосон данс",
  NAME: "Нэр",
  SURNAME: "Овог",
};

/** Хаан банк утганд илгээгчийг залгадаг: «… ХААНААС: 150000 НЭР ОВОГ» — утга ба илгээгчийг салгана */
export function splitSender(text: string): { main: string; sender: string | null } {
  const m = /ХААНААС:?\s*\d*\s*/iu.exec(text);
  if (!m) return { main: text.trim(), sender: null };
  return { main: text.slice(0, m.index).trim(), sender: text.slice(m.index + m[0].length).trim() || null };
}

/** «⋯» дэлгэрэнгүй — GET /reconcile/students/:id */
export interface StudentDetail {
  student: StudentCard & {
    phone: string | null;
    fatherPhone: string | null;
    motherPhone: string | null;
    guardianNote: string | null;
    school: string | null;
    grade: number | null;
    branch: string | null;
  };
  /** Хуулгаас энэ хүүхдэд оноосон гүйлгээ (шинэ нь эхэндээ) */
  bank: {
    id: string;
    kind: AllocKind;
    kindLabel: string;
    amount: number;
    txAmount: number;
    bookedAt: string;
    description: string;
    sender: string | null;
    counterparty: string | null;
    auto: boolean;
    paymentId: string | null;
    inSheet: boolean;
  }[];
  /** Энэ хүүхдэд оноосноор системийн сурсан данс, утас */
  payers: { kind: "ACCOUNT" | "PHONE"; value: string; count: number }[];
}

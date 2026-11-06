// API: /reconcile/* (api/src/reconcile/reconcile.service.ts)

export type AllocKind = "TUITION" | "BOOK" | "ANSWER_SHEET" | "STAFF_FINE" | "TRANSFER" | "EXPENSE" | "OTHER";
export type Lane = "manual" | "tuition" | "other" | "expense";

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
}

export type MatchSignal = "PHONE" | "PHONE_LEARNED" | "ACCOUNT" | "ACCOUNT_LEARNED" | "NAME" | "SURNAME";

export interface Candidate {
  studentId: string;
  score: number;
  signals: MatchSignal[];
  student: StudentCard | null;
}

export interface Suggestion {
  decision: "AUTO" | "SUGGEST" | "CHOOSE" | "SPLIT" | "NONE";
  kind: AllocKind;
  kindLabel: string;
  confident: boolean;
  split: { kind: AllocKind; amount: number }[] | null;
  reason: string;
  unrecorded: boolean;
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
  resolvedAt: string | null;
  resolvedBySystem: boolean;
  suggestion: Suggestion | null;
  allocations: Allocation[];
}

export interface Overview {
  cursors: { accountNo: string; settledThrough: string; coveredThrough: string }[];
  counts: Record<Lane, number>;
  lastImportAt: string | null;
}

export interface ImportSummary {
  rows: number;
  newRows: number;
  duplicates: number;
  beforeSettled: number;
  autoResolved: number;
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

// API: /reconcile/* (api/src/reconcile/reconcile.service.ts)

export type AllocKind = "TUITION" | "BOOK" | "ANSWER_SHEET" | "STAFF_FINE" | "TRANSFER" | "EXPENSE" | "OTHER";
export type Lane = "all" | "manual" | "tuition" | "other" | "expense" | "sheet";

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
  /** Өөрийн, аав, ээжийн утас — тулгахад */
  phones?: { label: string; value: string }[];
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
  /** Систем шийтэд бичсэн үр дүн (аль нүд, эсвэл яагаад бичээгүй) */
  sheetWrites?: SheetWrite[];
  suggestion: Suggestion | null;
  allocations: Allocation[];
}

export interface Overview {
  cursors: { accountNo: string; settledThrough: string; coveredThrough: string; sheetThrough: string | null }[];
  counts: Record<Lane, number>;
  /** Шийтэд хөтлөгдсөн гэж нуусан ч шийтэд байгааг баталж чадаагүй */
  sheetCheck: number;
  lastImportAt: string | null;
  /** Гараар оноосон сургалтын төлбөр бичигдэх шийт (демо бол хуулбар) */
  sheetWrite?: { url: string; demo: boolean } | null;
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
  PHONE: "утас таарсан",
  PHONE_LEARNED: "энэ утаснаас өмнө төлсөн",
  ACCOUNT: "энэ данснаас өмнө төлсөн",
  ACCOUNT_LEARNED: "энэ данснаас өмнө төлсөн",
  NAME: "нэр таарсан",
  SURNAME: "овог таарсан",
};

/** Гүйлгээний утга дахь 8 оронтой дугаарууд — хүүхдийн утастай шууд харьцуулна */
export const phonesInText = (text: string) => new Set(text.match(/(?<!\d)\d{8}(?!\d)/g) ?? []);

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
    bankTxId: string;
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

/** «⋯» цонхноос хуваарилалт буцаахад жагсаалт шинэчлэгдэнэ */
export const RECONCILE_CHANGED = "reconcile:changed";

/** ДЕМО: хуулбар шийтэд бичсэн үр дүн (allocate хариу) */
export interface SheetWrite {
  studentId: string;
  ok: boolean;
  cell?: string;
  month?: string;
  reason?: string;
}
export function sheetWriteText(ws: SheetWrite[] | undefined): string | null {
  if (!ws?.length) return null;
  return ws
    .map((w) => (w.ok ? `Шийтэд бичлээ: ${w.cell} нүд, ${Number(w.month!.slice(5, 7))}-р сар` : `Шийтэд бичсэнгүй: ${w.reason}`))
    .join("; ");
}

/** Гүйлгээний төлөв — «Бүгд» жагсаалтад өнгөөр ялгана */
export type RowTone = "auto" | "done" | "open" | "sheet" | "other" | "expense";
export function rowTone(r: BankRow): RowTone {
  if (!r.resolvedAt) return "open";
  if (r.inSheet) return "sheet";
  if (r.direction === "DEBIT") return "expense";
  if (r.allocations.some((a) => a.kind === "TUITION")) return r.resolvedBySystem ? "auto" : "done";
  return "other";
}
export const TONE: Record<RowTone, { label: string; card: string; dot: string }> = {
  auto: { label: "Сургалтын төлбөр, автоматаар", card: "border-l-success bg-success/5", dot: "bg-success" },
  done: { label: "Сургалтын төлбөр, гараар", card: "border-l-success bg-success/5", dot: "bg-success" },
  open: { label: "Шийдэх", card: "border-l-orange-500 bg-orange-500/[0.07]", dot: "bg-orange-500" },
  sheet: { label: "Шийтэд хөтлөгдсөн", card: "border-l-ink/25", dot: "bg-ink/30" },
  other: { label: "Бусад орлого", card: "border-l-info bg-info/5", dot: "bg-info" },
  expense: { label: "Зарлага", card: "border-l-error/60", dot: "bg-error/70" },
};

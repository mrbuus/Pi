/** «Номын мөнгө» — вэбийн хуваалцсан төрөл, туслахууд (api/src/book-payments). */

export interface BookPerson {
  id: string;
  firstName: string;
  lastName: string;
  role?: string | null;
}

/** API-ийн BOOKS-тай ижил (api/src/book-payments/book-payments.logic.ts). Хариултын хуудас ном БИШ */
export const BOOKS = [
  { key: "E1", title: "E-1" },
  { key: "E2", title: "E-2" },
  { key: "E3", title: "E-3" },
  { key: "HAVTGAI1", title: "Хавтгай-1" },
  { key: "HAVTGAI2", title: "Хавтгай-2" },
  { key: "OGTORGUI", title: "Огторгуй" },
  { key: "PITEST", title: "Pi test" },
] as const;

/**
 * Шалгалтын хариултын хуудасны чек нээх төрлүүд — дугаарыг (1, 2 …) сервер автоматаар өгнө.
 * Нэгдсэн шалгалт: бүх ангид ижил зүйл (анги сольсон сурагчийн төлбөр дагана).
 * Ангийн шалгалт: анги бүрт тусдаа зүйл.
 */
export const SHEET_KINDS = [
  { key: "SHEET", title: "Нэгдсэн шалгалт" },
  { key: "CSHEET", title: "Ангийн шалгалт" },
] as const;

/** API-ийн BOOK_AMOUNT_MAX-тай ижил */
export const BOOK_AMOUNT_MAX = 1_000_000;

export const mnt = (n: number) => `${n.toLocaleString("en-US")}₮`;

/** Нэг сурагч × нэг номын бүртгэл (идэвхтэй эсвэл түүхийн мөр) */
export interface BookPayment {
  id: string;
  studentId: string;
  bookKey: string;
  status: "PAID" | "SKIPPED";
  amount: number | null;
  note: string | null;
  classroom: { id: string; name: string } | null;
  collectedBy: BookPerson | null;
  createdBy: BookPerson | null;
  createdAt: string;
  voidedAt: string | null;
  voidedBy: BookPerson | null;
}

/** Тэмдэглэх/засах хүсэлт — PUT /book-payments/students/:id/books/:key ба номын чекийн тэмдэглэгээ */
export interface BookMarkInput {
  status: "PAID" | "SKIPPED" | "NONE";
  amount?: number;
  collectedById?: string;
  classroomId?: string | null;
  note?: string | null;
}

/** GET /book-payments/students/:id */
export interface StudentBooksResponse {
  student: { id: string; firstName: string; lastName: string };
  classrooms: { id: string; name: string; current: boolean }[];
  books: { key: string; title: string; suggestedAmount: number | null; payment: BookPayment | null }[];
  history: (BookPayment & { title: string })[];
}

export interface BookClassRow {
  classroomId: string;
  name: string;
  classArchived: boolean;
  checkId: string | null;
  hidden: boolean;
  price: number | null;
  openedAt: string | null;
  total: number;
  paidHere: number;
  paidElsewhere: number;
  skipped: number;
  left: number;
  formerPaid: number;
  /** Багшид null — мөнгөн дүнг зөвхөн Багш+/Админ харна */
  collected: number | null;
}

/** GET /book-payments/dashboard */
export interface BookDashboardResponse {
  seeAllMoney: boolean;
  books: { key: string; title: string; classes: BookClassRow[]; noClassPaid: number; paid: number; collected: number | null }[];
  collectors: {
    person: BookPerson | null;
    count: number;
    sum: number;
    byBook: { bookKey: string; title: string; count: number; sum: number }[];
  }[];
}

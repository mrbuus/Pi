// Багш+ төлбөрийн удирдлагын хэсгүүдэд хуваалцаж ашиглах төрлүүд.

export interface PaymentUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  description?: string | null;
  forMonth?: string | null;
  createdAt: string;
  paidAt?: string | null;
  user?: PaymentUser;
}

export interface Pass {
  id: string;
  name: string;
  durationDays: number;
  price?: number | null;
}

export interface MonthRow {
  student: { firstName: string; lastName: string; phone: string };
  classroom: { name: string };
  paid: boolean;
}

// GET /payments/outstanding?month= -н нэг мөр
export interface OutstandingRow {
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  classroomId: string;
  classroomName: string;
  tuitionAmount: number | null;
  tuitionPlan: string | null;
  totalPaid: number;
  shortfall: number;
}

// GET /users/search?q= -н нэг мөр
export interface StudentSearchResult {
  id: string;
  studentCode?: string | null;
  firstName: string;
  lastName: string;
  username?: string | null;
}

// GET /payments/student/:id хариу
export interface StudentHistory {
  student: { id: string; firstName: string; lastName: string; phone: string };
  tuitionPlan: string | null;
  tuitionNote?: string | null;
  summary: { expected: number; totalPaid: number; outstanding: number };
  payments: Payment[];
}

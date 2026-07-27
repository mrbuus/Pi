// GET /audit -тай холбоотой хуваалцсан төрлүүд.

export interface AuditLogRow {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  at: string;
}

export interface AuditListResponse {
  items: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditFilterValues {
  entity: string;
  actorId: string;
  action: string;
  from: string;
  to: string;
}

// GET /users -ээс ажилтны нэр харуулахад хэрэгтэй хэсэг л авна
export interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

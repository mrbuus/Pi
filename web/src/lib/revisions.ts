import { api, ApiError } from "@/lib/api";

/**
 * Өөрчлөлтийн түүхийн API (api/src/revisions): жагсаалт, ялгаа, сэргээх.
 * Хариунд хэрэглэгчийн ID байхгүй — зөвхөн нэр («Б. Баасанжав»).
 */

export type RevisionEntity = "PROBLEM" | "TEST";
export type RevisionAction = "CREATE" | "UPDATE" | "RESTORE" | "IMPORT";

export interface RevisionListItem {
  version: number;
  action: RevisionAction;
  summary: string;
  actorName: string;
  createdAt: string;
  reason: string | null;
  current: boolean;
}

export interface RevisionList {
  entity: RevisionEntity;
  currentVersion: number;
  total: number;
  page: number;
  pageSize: number;
  createdBy: string | null;
  createdAt: string;
  canRestore: boolean;
  items: RevisionListItem[];
}

export interface ChoiceView {
  text: string;
  isCorrect: boolean;
  mistake: string | null;
  note: string | null;
}

export interface ChoiceDiffRow {
  label: string;
  status: "added" | "removed" | "changed" | "same";
  before: ChoiceView | null;
  after: ChoiceView | null;
}

export interface ProblemDiffRow {
  status: "added" | "removed" | "moved" | "points";
  order: number;
  beforeOrder: number | null;
  points: number;
  beforePoints: number | null;
  statement: string | null;
}

export type DiffEntry =
  | { field: string; label: string; kind: "math" | "text" | "image"; before: string | null; after: string | null }
  | { field: string; label: string; kind: "choices"; rows: ChoiceDiffRow[] }
  | { field: string; label: string; kind: "set"; added: string[]; removed: string[] }
  | { field: string; label: string; kind: "problems"; rows: ProblemDiffRow[] };

export interface ProblemSnapshotView {
  statementText: string | null;
  imageKey: string | null;
  format: string;
  points: number;
  choices: (ChoiceView & { label: string })[];
  correctAnswer: string | null;
  legacyChoices: string | null;
  scoringGroups: string | null;
  youtubeUrl: string | null;
  tags: string[];
  solution: string | null;
  answerKeyStatus: string | null;
}

export interface TestSnapshotView {
  title: string;
  type: string;
  gradingMode: string;
  timeLimitMin: number | null;
  price?: number | null;
  chapter: string | null;
  hasPdf: boolean;
  problems: { order: number; points: number; statement: string | null }[];
  classes: string[];
}

export interface RevisionDetail {
  entity: RevisionEntity;
  version: number;
  previousVersion: number | null;
  action: RevisionAction;
  summary: string;
  actorName: string;
  createdAt: string;
  reason: string | null;
  current: boolean;
  changes: DiffEntry[];
  snapshot: ProblemSnapshotView | TestSnapshotView;
}

export interface RestoreResult {
  entity: RevisionEntity;
  version: number;
  restoredFrom: number;
  skipped: string[];
  summary: string | null;
  mergedWith?: string[] | null;
}

export interface VersionConflict {
  message: string;
  currentVersion: number;
  changedBy: string | null;
  changedAt: string | null;
  /** Хоёулаа өөрөөр засварласан хэсгүүд (сервер бусдыг нь автоматаар нэгтгэсэн) */
  fields: string[];
}

function bodyOf(e: unknown): Record<string, unknown> | null {
  if (!(e instanceof ApiError) || e.status !== 409) return null;
  return e.body && typeof e.body === "object" ? (e.body as Record<string, unknown>) : null;
}

/** 409 «Таныг засаж байх хооронд … ижил хэсгийг өөрчилсөн: Зөв хариу» эсэх. */
export function versionConflictOf(e: unknown): VersionConflict | null {
  const body = bodyOf(e);
  if (!body || body.code !== "VERSION_CONFLICT") return null;
  return {
    message: (e as Error).message,
    currentVersion: Number(body.currentVersion ?? 0),
    changedBy: typeof body.changedBy === "string" ? body.changedBy : null,
    changedAt: typeof body.changedAt === "string" ? body.changedAt : null,
    fields: Array.isArray(body.fields) ? body.fields.filter((f): f is string => typeof f === "string") : [],
  };
}

/** 409 — сурагч өгсөн тестийн бодлогын хариуг сэргээхэд батлах шаардлагатай. */
export function confirmRequiredOf(e: unknown): string | null {
  const body = bodyOf(e);
  return body?.code === "CONFIRM_REQUIRED" ? (e as Error).message : null;
}

const path = (entity: RevisionEntity, id: string) => `/revisions/${entity}/${encodeURIComponent(id)}`;

export function fetchRevisions(entity: RevisionEntity, id: string, page = 1): Promise<RevisionList> {
  return api<RevisionList>(`${path(entity, id)}?page=${page}&pageSize=20`);
}

export function fetchRevision(entity: RevisionEntity, id: string, version: number): Promise<RevisionDetail> {
  return api<RevisionDetail>(`${path(entity, id)}/${version}`);
}

export function restoreRevision(
  entity: RevisionEntity,
  id: string,
  version: number,
  body: { expectedVersion?: number; confirm?: boolean; reason?: string } = {},
): Promise<RestoreResult> {
  return api<RestoreResult>(`${path(entity, id)}/restore/${version}`, { method: "POST", body });
}

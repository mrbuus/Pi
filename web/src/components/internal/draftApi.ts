import { api, getToken } from "@/lib/api";
import type { BlockContent, DraftBlock, DraftSetFull, DraftSetSummary, Subject } from "./model";

/* «Дотоод» API — api/src/internal-drafts (зөвхөн Багш+/Админ). */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

/**
 * Ноорогийн зураг. Ерөнхий /files/:key нь зөвхөн оруулсан хүнд нээгддэг тул
 * бусад Багш+ ч харахын тулд ноорогийн тусгай маршрут (DraftFileGuard).
 */
export function draftImageUrl(key: string | null | undefined): string | undefined {
  if (!key) return undefined;
  const token = getToken();
  return `${API_URL}/internal-drafts/files/${encodeURIComponent(key)}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

export interface CheckResult {
  n: number;
  blockId: string;
  given: string | null;
  correct: boolean | null;
  key: string | null;
}

export interface CheckSummary {
  results: CheckResult[];
  correct: number;
  wrong: number;
  blank: number;
  unkeyed: number;
  total: number;
}

export interface PublishBody {
  chapterId: string;
  test?: { title: string; type: "CUSTOM" | "DAILY" | "EESH_MOCK"; isDraft: boolean; timeLimitMin?: number };
}

export interface PublishResult {
  problemIds: string[];
  testId: string | null;
  chapterId: string;
  chapterTitle: string;
  count: number;
  publishNo: number;
}

export type SetPatch = Partial<{ title: string; subject: Subject; chapterId: string | null; topic: string | null }>;

const base = "/internal-drafts";

export const draftApi = {
  list: (q = "", status = "") => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    const query = params.toString();
    return api<DraftSetSummary[]>(`${base}/sets${query ? `?${query}` : ""}`);
  },
  create: (body: SetPatch = {}) => api<DraftSetSummary>(`${base}/sets`, { method: "POST", body }),
  get: (id: string) => api<DraftSetFull>(`${base}/sets/${id}`),
  updateSet: (id: string, body: SetPatch) => api<DraftSetSummary>(`${base}/sets/${id}`, { method: "PATCH", body }),
  deleteSet: (id: string) => api<{ deleted: boolean }>(`${base}/sets/${id}`, { method: "DELETE" }),
  addBlock: (setId: string, body: Partial<BlockContent> & { afterId?: string; atStart?: boolean }) =>
    api<DraftBlock>(`${base}/sets/${setId}/blocks`, { method: "POST", body }),
  addBlocks: (setId: string, blocks: Partial<BlockContent>[], source: "PASTE" | "WORD") =>
    api<DraftBlock[]>(`${base}/sets/${setId}/blocks/bulk`, { method: "POST", body: { blocks, source } }),
  updateBlock: (id: string, body: Partial<BlockContent> & { expectedVersion: number; overwrite?: boolean }) =>
    api<DraftBlock>(`${base}/blocks/${id}`, { method: "PATCH", body }),
  duplicate: (id: string) => api<DraftBlock>(`${base}/blocks/${id}/duplicate`, { method: "POST" }),
  deleteBlock: (id: string) => api<{ deleted: boolean; afterId: string | null }>(`${base}/blocks/${id}`, { method: "DELETE" }),
  reorder: (setId: string, blockIds: string[]) =>
    api<{ ok: boolean }>(`${base}/sets/${setId}/order`, { method: "PUT", body: { blockIds } }),
  check: (setId: string, answers: Record<string, string>) =>
    api<CheckSummary>(`${base}/sets/${setId}/check`, { method: "POST", body: { answers } }),
  publish: (setId: string, body: PublishBody) =>
    api<PublishResult>(`${base}/sets/${setId}/publish`, { method: "POST", body }),
};

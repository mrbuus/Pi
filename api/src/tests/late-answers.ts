// «Хоцорч ирсэн хариу» — сесс хаагдсаны (sweep, гаралтын хязгаар, хугацаа) ДАРАА сурагчийн
// төхөөрөмжөөс ирсэн, дүгнэгдсэн хариунаас ЗӨРҮҮТЭЙ хариу (эзэн 2026-11-21). Цэвэр логик —
// I/O-гүй, тесттэй (late-answers.spec.ts).
//
// - Дүгнэгдсэн хариуг (`draftAnswers`) ХЭЗЭЭ Ч дарж бичихгүй; хоцорсон хариу тусдаа
//   `TestAttemptSession.lateAnswers`-д хадгалагдана, дүн өөрчлөгдөхгүй.
// - Админ / Багш+ «Хүлээн авах» дарвал хоцорсон хариугаар (дүгнэгдсэн дээр нь давхарлаж)
//   ДАХИН дүгнэнэ; өмнөх оноо `history`-д үлдэнэ, AuditLog-д бичигдэнэ.

import { answerToken } from './grading';

export interface LateAcceptance {
  acceptedAt: string;
  acceptedById: string;
  previousScore: { totalScore: number; maxScore: number };
  acceptedScore: { totalScore: number; maxScore: number };
  /** Хүлээн авсан хоцорсон хариу (тухайн үеийн) */
  answers: Record<string, unknown>;
}

export interface LateAnswers {
  /** Дүгнэгдсэн (эсвэл өмнө хүлээн авсан) хариунаас зөрүүтэй бодлогын хариу */
  answers: Record<string, unknown>;
  /** Хүлээгдэж буй (хүлээн аваагүй) хоцорсон хариутай бодлогын тоо */
  differing: number;
  /** Хоцорсон хүсэлт хэдэн удаа ирсэн */
  receivedCount: number;
  /** Сүүлд хүлээн авсан (байхгүй бол null) */
  accepted: LateAcceptance | null;
  /** Өмнөх хүлээн авалтууд (хуучнаас шинэ рүү) — юу ч устгахгүй */
  history: LateAcceptance[];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

/** Санд хадгалсан JSON-ийг уян задлана (хуучин/буруу хэлбэр → null). */
export function parseLateAnswers(raw: unknown): LateAnswers | null {
  const j = asRecord(raw);
  if (!Object.keys(j).length) return null;
  const answers = asRecord(j.answers);
  const accepted = asRecord(j.accepted);
  return {
    answers,
    differing:
      typeof j.differing === 'number' ? j.differing : Object.keys(answers).length,
    receivedCount: typeof j.receivedCount === 'number' ? j.receivedCount : 1,
    accepted: Object.keys(accepted).length
      ? (accepted as unknown as LateAcceptance)
      : null,
    history: Array.isArray(j.history) ? (j.history as LateAcceptance[]) : [],
  };
}

function blank(v: unknown): boolean {
  return v === undefined || v === null || answerToken(v) === '';
}

/** Хоёр хариу ижил эсэх (дугаар/үсэг/олон нүх — дүгнэлттэй ижил хэвийн хэлбэрээр). */
export function sameAnswer(a: unknown, b: unknown): boolean {
  if (blank(a) && blank(b)) return true;
  return answerToken(a) === answerToken(b);
}

/**
 * Одоогийн хүчинтэй хариу: дүгнэгдсэн хариу + ХҮЛЭЭН АВСАН хоцорсон хариу.
 * Хүлээгдэж буй (хүлээн аваагүй) хоцорсон хариу ОРОХГҮЙ.
 */
export function effectiveAnswers(
  graded: unknown,
  late: LateAnswers | null,
): Record<string, unknown> {
  const out = { ...asRecord(graded) };
  if (!late) return out;
  for (const h of late.history) Object.assign(out, asRecord(h.answers));
  if (late.accepted) Object.assign(out, asRecord(late.accepted.answers));
  return out;
}

/**
 * Шинээр ирсэн (баталгаажуулсан, зөвхөн хоосон биш утгатай) хариуг хадгалсан хоцорсон хариутай
 * нэгтгэнэ. Хүчинтэй хариунаас зөрүүтэй бодлого л үлдэнэ. Юу ч зөрөхгүй бол өмнөх төлөв хэвээр
 * (`changed: false`) — дахин дахин ирсэн ижил хүсэлт бичилт үүсгэхгүй.
 */
export function mergeLateAnswers(
  graded: unknown,
  prev: LateAnswers | null,
  incoming: Record<string, unknown>,
): { late: LateAnswers | null; changed: boolean } {
  const base = effectiveAnswers(graded, prev);
  const pending: Record<string, unknown> = {};
  // Хүлээгдэж буй хуучин хоцорсон хариу (хүлээн авсны ДАРААХ шинэ хүсэлт л) үлдэнэ
  for (const [pid, v] of Object.entries(prev?.answers ?? {})) {
    if (!sameAnswer(v, base[pid])) pending[pid] = v;
  }
  let touched = false;
  for (const [pid, v] of Object.entries(incoming)) {
    if (blank(v)) continue;
    if (sameAnswer(v, base[pid])) {
      if (pid in pending && !sameAnswer(pending[pid], v)) {
        delete pending[pid];
        touched = true;
      }
      continue;
    }
    if (!sameAnswer(pending[pid], v)) touched = true;
    pending[pid] = v;
  }
  if (!touched) return { late: prev, changed: false };
  return {
    changed: true,
    late: {
      answers: pending,
      differing: Object.keys(pending).length,
      receivedCount: (prev?.receivedCount ?? 0) + 1,
      accepted: prev?.accepted ?? null,
      history: prev?.history ?? [],
    },
  };
}

/** Багшид: хүлээгдэж буй хоцорсон хариу байгаа эсэх. */
export function latePending(late: LateAnswers | null): boolean {
  return !!late && late.differing > 0 && Object.keys(late.answers).length > 0;
}

/** «Хүлээн авах»-ын дараах төлөв: хүлээгдэж буй хариу хүлээн авсанд шилжинэ, түүх үлдэнэ. */
export function acceptLate(
  late: LateAnswers,
  acceptance: Omit<LateAcceptance, 'answers'>,
): LateAnswers {
  return {
    answers: {},
    differing: 0,
    receivedCount: late.receivedCount,
    accepted: { ...acceptance, answers: { ...late.answers } },
    history: late.accepted ? [...late.history, late.accepted] : late.history,
  };
}

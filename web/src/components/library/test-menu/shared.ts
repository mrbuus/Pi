"use client";

/* ============================================================================
 * Бодлогын сангийн «⋯» тестийн цэсийн нийтлэг төрөл, туслах функц.
 *
 * Номын сангийн нэг «тест» = нэг Chapter («<сэдэв> · Тест N»), дотроо A/B хоёр
 * Test мөр (ижил groupKey, variantLabel A/B). Цэсийн үйлдэл бүр хоёр хувилбарт
 * ЗЭРЭГ үйлчилнэ.
 * ========================================================================== */

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ExamSettings } from "@/components/exams/types";

/** GET /tests?chapterId= — ажилтны жагсаалтын мөр (хэрэгтэй талбар л) */
export interface MenuTest {
  id: string;
  title: string;
  variantLabel: string | null;
  timeLimitMin: number | null;
  isDraft: boolean;
  version?: number;
  access: { classroomId: string; classroom?: { name: string } }[];
  _count?: { problems: number; results: number };
}

/** Онолын блок (GET /lessons/:chapterId → theories) */
export interface TheoryRow {
  id: string;
  title: string;
  content: string;
  imageKeys: string[];
  order: number;
}

export type MenuAction = "rename" | "time" | "theory" | "formulas" | "stats" | "classes";

/** «Томьёо» блокийн гарчиг — ЯГ ИЙМ нэрээр хадгална (миграцгүй ялгах тэмдэг) */
export const FORMULA_TITLE = "Томьёо";

export function isFormulaBlock(t: Pick<TheoryRow, "title">): boolean {
  return t.title.trim() === FORMULA_TITLE;
}

/** A, B, … дарааллаар; хувилбаргүйг сүүлд */
export function sortVariants<T extends { variantLabel: string | null; title: string }>(tests: T[]): T[] {
  return [...tests].sort((a, b) => {
    const va = a.variantLabel ?? "￿";
    const vb = b.variantLabel ?? "￿";
    return va === vb ? a.title.localeCompare(b.title, "mn") : va.localeCompare(vb);
  });
}

/** «A хувилбар» эсвэл (хувилбаргүй бол) «Тест» */
export function variantName(t: { variantLabel: string | null }, index = 0): string {
  return t.variantLabel ? `${t.variantLabel} хувилбар` : `Тест ${index + 1}`;
}

/** Хэрэглэгчид харуулах алдааны мессеж (ApiError нь аль хэдийн монголоор) */
export function errorMessage(e: unknown, fallback = "Хадгалж чадсангүй. Дахин оролдоно уу"): string {
  if (e instanceof ApiError) return e.message;
  return e instanceof Error && /[Ѐ-ӿ]/.test(e.message) ? e.message : fallback;
}

/** «Сэдвийн нэр · Тест 34» → { topic, suffix: " · Тест 34" }; « · »-гүй бол бүтэн нэр сэдэв */
export function splitTitle(title: string): { topic: string; suffix: string } {
  const at = title.indexOf(" · ");
  return at < 0 ? { topic: title, suffix: "" } : { topic: title.slice(0, at), suffix: title.slice(at) };
}

/** Тестийн хугацааг товч: «60 мин», хувилбар бүр өөр бол «A 60, B 50 мин», хязгааргүй бол «Хугацаагүй» */
export function timeSummary(tests: { variantLabel: string | null; timeLimitMin: number | null }[]): string | null {
  if (tests.length === 0) return null;
  const values = new Set(tests.map((t) => t.timeLimitMin));
  if (values.size === 1) {
    const v = tests[0].timeLimitMin;
    return v === null ? "Хугацаагүй" : `${v} мин`;
  }
  return tests.map((t, i) => `${t.variantLabel ?? i + 1} ${t.timeLimitMin ?? "-"}`).join(", ") + " мин";
}

/** Нээлттэй ангийн тоо — хувилбаруудын нэгдэл */
export function openClassCount(tests: MenuTest[]): number {
  return new Set(tests.flatMap((t) => t.access.map((a) => a.classroomId))).size;
}

/**
 * Хувилбар бүрийн «Тохиргоо» (GET /exams/:id/settings) — цонх нээгдэхэд л
 * ачаална. Хариу: хугацаа, хувилбар (expectedVersion), эрх, анги бүрийн төлөв.
 */
export function useVariantSettings(testIds: string[]) {
  const key = testIds.join(",");
  const [state, setState] = useState<{
    key: string;
    byId: Record<string, ExamSettings>;
    error: string;
    loading: boolean;
  }>({ key: "", byId: {}, error: "", loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    const ids = key ? key.split(",") : [];
    Promise.all(
      ids.map((id) => api<ExamSettings>(`/exams/${encodeURIComponent(id)}/settings`).then((s) => [id, s] as const)),
    )
      .then((rows) => {
        if (alive) setState({ key, byId: Object.fromEntries(rows), error: "", loading: false });
      })
      .catch((e) => {
        if (alive)
          setState({ key, byId: {}, error: errorMessage(e, "Тохиргоог ачаалж чадсангүй"), loading: false });
      });
    return () => {
      alive = false;
    };
  }, [key, nonce]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    setNonce((n) => n + 1);
  }, []);

  /** Оноох/хасах хариу нь шинэчилсэн тохиргоо — дахин ачаалахгүйгээр солино */
  const replace = useCallback((id: string, settings: ExamSettings) => {
    setState((s) => ({ ...s, byId: { ...s.byId, [id]: settings } }));
  }, []);

  const current = state.key === key;
  return {
    byId: current ? state.byId : {},
    error: current ? state.error : "",
    loading: !current || state.loading,
    reload,
    replace,
  };
}

/** GET /lessons/:chapterId-ийн онолын блокууд (дарааллаар) */
export function useChapterTheories(chapterId: string) {
  const [state, setState] = useState<{ key: string; rows: TheoryRow[] | null; error: string }>({
    key: "",
    rows: null,
    error: "",
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    api<{ theories?: TheoryRow[] }>(`/lessons/${encodeURIComponent(chapterId)}`)
      .then((res) => {
        const rows = [...(res?.theories ?? [])].sort((a, b) => a.order - b.order);
        if (alive) setState({ key: chapterId, rows, error: "" });
      })
      .catch((e) => {
        if (alive) setState({ key: chapterId, rows: null, error: errorMessage(e, "Онолыг ачаалж чадсангүй") });
      });
    return () => {
      alive = false;
    };
  }, [chapterId, nonce]);

  const current = state.key === chapterId;
  return {
    rows: current ? state.rows : null,
    error: current ? state.error : "",
    reload: () => {
      setState((s) => ({ ...s, key: "" }));
      setNonce((n) => n + 1);
    },
  };
}

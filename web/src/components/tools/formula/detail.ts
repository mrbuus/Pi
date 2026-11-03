"use client";

import { useEffect, useState } from "react";
import { mergeDetail, type FormulaDetail, type SheetFormula } from "./formulaSheet.ts";

/* ============================================================================
 * Томьёоны дэлгэрэнгүйг (алхам, жишээ, нэмэлт тайлбар) хэрэгтэй үед л татна.
 * Эзэн 2026-11-02: «томьёо руу орж харсан хүн л хүлээлтийг мэдэрнэ» — жагсаалт нь
 * хөнгөн (formulas.json), бүлгийн дэлгэрэнгүй (formulas-detail/<бүлэг>.json) нь
 * хэн нэгэн «Алхамаар ойлгох», «Нэмэлт», проектор эсвэл хэвлэхийг анх дарахад.
 * Нэг бүлгийг нэг л удаа татна (амлалт кэшлэгдэнэ, алдаа гарвал дахин оролдоно).
 * ========================================================================== */

const cache = new Map<string, Promise<Record<string, FormulaDetail>>>();

export function loadDetail(section: string): Promise<Record<string, FormulaDetail>> {
  let p = cache.get(section);
  if (!p) {
    p = fetch(`/tools/formulas-detail/${encodeURIComponent(section)}.json`, { cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error("status");
        return r.json() as Promise<Record<string, FormulaDetail>>;
      })
      .catch((e) => {
        cache.delete(section);
        throw e;
      });
    cache.set(section, p);
  }
  return p;
}

/** Олон томьёоны дэлгэрэнгүйг (хэвлэх, слайд) нэг дор */
export async function withDetails(list: SheetFormula[]): Promise<SheetFormula[]> {
  const secs = [...new Set(list.map((f) => f.section))];
  const maps = await Promise.all(secs.map((s) => loadDetail(s).catch(() => ({}) as Record<string, FormulaDetail>)));
  const bySec = new Map(secs.map((s, i) => [s, maps[i]]));
  return list.map((f) => mergeDetail(f, bySec.get(f.section)?.[f.slug]));
}

/**
 * enabled болмогц тухайн томьёоны дэлгэрэнгүйг татаж нэгтгэнэ.
 * Буцаах: { f: нэгтгэсэн (эсвэл анхны) томьёо, loading, failed, retry }
 */
export function useFormulaDetail<T extends SheetFormula | undefined>(base: T, enabled: boolean) {
  const [state, setState] = useState<{ key: string; f?: SheetFormula; failed?: boolean }>({ key: "" });
  const [attempt, setAttempt] = useState(0);
  const key = `${base?.slug ?? ""}:${attempt}`;
  useEffect(() => {
    if (!enabled || !base) return;
    let live = true;
    loadDetail(base.section)
      .then((map) => live && setState({ key, f: mergeDetail(base, map[base.slug]) }))
      .catch(() => live && setState({ key, failed: true }));
    return () => {
      live = false;
    };
  }, [enabled, base, key]);
  const ready = state.key === key;
  return {
    f: (ready && state.f ? state.f : base) as T,
    loading: enabled && !!base && !ready,
    failed: ready && !!state.failed,
    retry: () => setAttempt((n) => n + 1),
  };
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { markUnsaved } from "@/lib/unsavedChanges";
import { draftApi, type SetPatch } from "./draftApi";
import {
  contentOf,
  diffContent,
  sameContent,
  type BlockContent,
  type DraftBlock,
  type DraftSetFull,
} from "./model";

/* ============================================================================
 * Ноорог засварлагчийн төлөв + автосейв.
 *
 * Блок бүр тусдаа хадгалагдана: засвар → 1.2с debounce → PATCH (зөвхөн
 * өөрчлөгдсөн талбар + expectedVersion). Хадгалж байх зуур дахин бичвэл
 * дуусмагц дахин илгээнэ. 409 (өөр хүн зассан) → блок дээр сонголт.
 * Сүлжээ тасарвал 5с-ийн дараа өөрөө дахин оролдоно. Таб нуугдахад бүгдийг
 * шууд хадгална; хадгалаагүй үед хуудаснаас гарахад асууна (lib/unsavedChanges).
 * Төлөв React-аас гадуур (useSyncExternalStore) — таймерын closure хуучрахгүй.
 * ========================================================================== */

export type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

export interface Row {
  id: string;
  server: DraftBlock;
  local: BlockContent;
  state: SaveState;
  conflict?: DraftBlock;
  error?: string;
}

const SAVE_DELAY = 1200;
const RETRY_DELAY = 5000;

class RowStore {
  rows: Row[] = [];
  private listeners = new Set<() => void>();
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  get = () => this.rows;
  set(rows: Row[]) {
    this.rows = rows;
    this.listeners.forEach((fn) => fn());
  }
  find(id: string) {
    return this.rows.find((r) => r.id === id);
  }
  patch(id: string, fn: (row: Row) => Row) {
    this.set(this.rows.map((r) => (r.id === id ? fn(r) : r)));
  }
}

/**
 * 409-ийн дараа: миний өөрчилсөн талбар, тэдний өөрчилсөн талбартай давхцахгүй
 * бол нэгтгэсэн агуулга (тэднийх + минийх), давхцвал null (хүнээр шийдүүлнэ).
 */
export function mergeOnto(row: Pick<Row, "server" | "local">, theirs: DraftBlock): BlockContent | null {
  const base = contentOf(row.server);
  const mine = diffContent(base, row.local);
  const changed = diffContent(base, contentOf(theirs));
  const clash = Object.keys(mine).some(
    (f) => f in changed && JSON.stringify(mine[f as keyof BlockContent]) !== JSON.stringify(changed[f as keyof BlockContent]),
  );
  return clash ? null : { ...contentOf(theirs), ...mine };
}

function rowOf(block: DraftBlock): Row {
  return { id: block.id, server: block, local: contentOf(block), state: "saved" };
}

export function useDraftEditor(id: string) {
  const store = useMemo(() => new RowStore(), []);
  const rows = useSyncExternalStore(store.subscribe, store.get, store.get);
  const [meta, setMeta] = useState<DraftSetFull | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [metaState, setMetaState] = useState<"saved" | "saving" | "error">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inflight = useRef(new Set<string>());
  const again = useRef(new Set<string>());
  const metaTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const metaPending = useRef<SetPatch>({});
  const orderTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await draftApi.get(id);
      setMeta(data);
      store.set(data.blocks.map(rowOf));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Ноорогийг нээж чадсангүй");
    }
  }, [id, store]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMeta = useCallback(async () => {
    const patch = metaPending.current;
    metaPending.current = {};
    if (!Object.keys(patch).length) {
      setMetaState("saved");
      return;
    }
    setMetaState("saving");
    try {
      const saved = await draftApi.updateSet(id, patch);
      setMeta((m) => (m ? { ...m, ...saved, blocks: m.blocks, events: m.events } : m));
      setMetaState("saved");
      setLastSavedAt(new Date());
    } catch (e) {
      metaPending.current = { ...patch, ...metaPending.current };
      setMetaState("error");
      toast.error(e instanceof Error ? e.message : "Хадгалагдсангүй");
    }
  }, [id]);
  const saveMetaRef = useRef(saveMeta);
  useEffect(() => {
    saveMetaRef.current = saveMeta;
  }, [saveMeta]);

  const save = useCallback(
    async (blockId: string): Promise<void> => {
      clearTimeout(timers.current.get(blockId));
      timers.current.delete(blockId);
      const row = store.find(blockId);
      if (!row || row.state === "conflict") return;
      if (inflight.current.has(blockId)) {
        again.current.add(blockId);
        return;
      }
      const base = row.server;
      const diff = diffContent(contentOf(base), row.local);
      if (!Object.keys(diff).length) {
        store.patch(blockId, (r) => ({ ...r, server: base, state: "saved", conflict: undefined, error: undefined }));
        return;
      }
      const sent = row.local;
      inflight.current.add(blockId);
      store.patch(blockId, (r) => ({ ...r, state: "saving" }));
      try {
        const saved = await draftApi.updateBlock(blockId, { ...diff, expectedVersion: base.version });
        store.patch(blockId, (r) => ({
          ...r,
          server: saved,
          state: sameContent(r.local, sent) ? "saved" : "dirty",
          conflict: undefined,
          error: undefined,
        }));
        setLastSavedAt(new Date());
        const after = store.find(blockId);
        if (after?.state === "dirty") timers.current.set(blockId, setTimeout(() => void save(blockId), 400));
      } catch (e) {
        const body = e instanceof ApiError ? (e.body as { code?: string; block?: DraftBlock } | undefined) : undefined;
        if (e instanceof ApiError && e.status === 409 && body?.block) {
          const theirs = body.block;
          const current = store.find(blockId);
          const merged = current ? mergeOnto(current, theirs) : null;
          if (current && merged) {
            // Өөр хүн өөр талбар зассан — хоёулангийнх нь хадгалагдана
            store.patch(blockId, (r) => ({ ...r, server: theirs, local: merged, state: "dirty", conflict: undefined, error: undefined }));
            timers.current.set(blockId, setTimeout(() => void save(blockId), 50));
            toast(`${theirs.updatedByName}-ийн өөрчлөлттэй нэгтгэлээ`);
          } else store.patch(blockId, (r) => ({ ...r, state: "conflict", conflict: theirs, error: e.message }));
        } else if (e instanceof ApiError && e.status === 404) {
          store.set(store.rows.filter((r) => r.id !== blockId));
          toast.error("Энэ бодлогыг өөр хүн устгасан байна");
        } else {
          store.patch(blockId, (r) => ({
            ...r,
            state: "error",
            error: e instanceof Error ? e.message : "Хадгалагдсангүй",
          }));
          timers.current.set(blockId, setTimeout(() => void save(blockId), RETRY_DELAY));
        }
      } finally {
        inflight.current.delete(blockId);
        if (again.current.delete(blockId)) void save(blockId);
      }
    },
    [store],
  );

  const edit = useCallback(
    (blockId: string, patch: Partial<BlockContent>) => {
      store.patch(blockId, (r) => ({
        ...r,
        local: { ...r.local, ...patch },
        state: r.state === "conflict" ? "conflict" : r.state === "saving" ? "saving" : "dirty",
      }));
      clearTimeout(timers.current.get(blockId));
      timers.current.set(blockId, setTimeout(() => void save(blockId), SAVE_DELAY));
    },
    [save, store],
  );

  const flushAll = useCallback(async () => {
    const pending = store.rows.filter((r) => r.state === "dirty" || r.state === "error");
    await Promise.all(pending.map((r) => save(r.id)));
    if (metaTimer.current) {
      clearTimeout(metaTimer.current);
      metaTimer.current = undefined;
      await saveMetaRef.current();
    }
  }, [save, store]);

  const resolveConflict = useCallback(
    (blockId: string, choice: "theirs" | "mine") => {
      const row = store.find(blockId);
      if (!row?.conflict) return;
      const theirs = row.conflict;
      if (choice === "theirs") {
        store.patch(blockId, (r) => ({ ...r, server: theirs, local: contentOf(theirs), state: "saved", conflict: undefined, error: undefined }));
        return;
      }
      // Миний зассан талбарууд л тэдний хувилбар дээр — бусад талбар нь тэднийх хэвээр
      const mine = diffContent(contentOf(row.server), row.local);
      store.patch(blockId, (r) => ({
        ...r,
        server: theirs,
        local: { ...contentOf(theirs), ...mine },
        state: "dirty",
        conflict: undefined,
        error: undefined,
      }));
      void save(blockId);
    },
    [save, store],
  );

  const insertRow = useCallback(
    (block: DraftBlock, afterId?: string | null, atStart?: boolean) => {
      const rows = [...store.rows];
      let at = rows.length;
      if (atStart) at = 0;
      else if (afterId) {
        const i = rows.findIndex((r) => r.id === afterId);
        if (i >= 0) at = i + 1;
      }
      rows.splice(at, 0, rowOf(block));
      store.set(rows);
    },
    [store],
  );

  const addBlock = useCallback(
    async (afterId?: string | null, content?: Partial<BlockContent>, atStart?: boolean) => {
      const block = await draftApi.addBlock(id, {
        ...(content ?? {}),
        ...(afterId ? { afterId } : {}),
        ...(atStart ? { atStart: true } : {}),
      });
      insertRow(block, afterId, atStart);
      setLastSavedAt(new Date());
      return block;
    },
    [id, insertRow],
  );

  const addMany = useCallback(
    async (blocks: Partial<BlockContent>[], source: "PASTE" | "WORD") => {
      const created = await draftApi.addBlocks(id, blocks, source);
      store.set([...store.rows, ...created.map(rowOf)]);
      setLastSavedAt(new Date());
      return created;
    },
    [id, store],
  );

  const duplicate = useCallback(
    async (blockId: string) => {
      await save(blockId);
      const copy = await draftApi.duplicate(blockId);
      insertRow(copy, blockId);
      return copy;
    },
    [insertRow, save],
  );

  const remove = useCallback(
    async (blockId: string) => {
      const index = store.rows.findIndex((r) => r.id === blockId);
      const row = store.rows[index];
      if (!row) return;
      clearTimeout(timers.current.get(blockId));
      timers.current.delete(blockId);
      const snapshot = row.local;
      const res = await draftApi.deleteBlock(blockId);
      store.set(store.rows.filter((r) => r.id !== blockId));
      setLastSavedAt(new Date());
      toast(`${index + 1}-р бодлогыг устгалаа`, {
        action: {
          label: "Буцаах",
          onClick: () => {
            void addBlock(res.afterId, snapshot, !res.afterId).catch((e: unknown) =>
              toast.error(e instanceof Error ? e.message : "Сэргээж чадсангүй"),
            );
          },
        },
      });
    },
    [addBlock, store],
  );

  const move = useCallback(
    (blockId: string, delta: number) => {
      const rows = [...store.rows];
      const from = rows.findIndex((r) => r.id === blockId);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= rows.length) return;
      const [row] = rows.splice(from, 1);
      rows.splice(to, 0, row);
      store.set(rows);
      clearTimeout(orderTimer.current);
      orderTimer.current = setTimeout(() => {
        draftApi
          .reorder(id, store.rows.map((r) => r.id))
          .then(() => setLastSavedAt(new Date()))
          .catch((e: unknown) => {
            toast.error(e instanceof Error ? e.message : "Дарааллыг хадгалж чадсангүй");
            void load();
          });
      }, 500);
    },
    [id, load, store],
  );

  const updateMeta = useCallback((patch: SetPatch, delay = 800) => {
    setMeta((m) => (m ? { ...m, ...patch } : m));
    metaPending.current = { ...metaPending.current, ...patch };
    setMetaState("saving");
    clearTimeout(metaTimer.current);
    metaTimer.current = setTimeout(() => {
      metaTimer.current = undefined;
      void saveMetaRef.current();
    }, delay);
  }, []);

  // Таб нуугдах, хаагдахад хүлээлтэнд байгааг шууд хадгална
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flushAll();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flushAll]);

  const status: SaveState = rows.some((r) => r.state === "conflict")
    ? "conflict"
    : rows.some((r) => r.state === "error") || metaState === "error"
      ? "error"
      : rows.some((r) => r.state === "saving") || metaState === "saving"
        ? "saving"
        : rows.some((r) => r.state === "dirty")
          ? "dirty"
          : "saved";

  const unsavedId = useMemo(() => Symbol("internal-draft"), []);
  useEffect(() => {
    markUnsaved(unsavedId, status !== "saved", "Ноорог");
    return () => markUnsaved(unsavedId, false);
  }, [status, unsavedId]);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  return {
    meta,
    setMeta,
    rows,
    loadError,
    reload: load,
    status,
    lastSavedAt,
    edit,
    save,
    flushAll,
    resolveConflict,
    addBlock,
    addMany,
    duplicate,
    remove,
    move,
    updateMeta,
  };
}

export type DraftEditor = ReturnType<typeof useDraftEditor>;

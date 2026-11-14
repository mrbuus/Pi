"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { VisitView } from "./types";

const POLL_MS = 20_000;
const TYPE_MS = 700;

/** Бичиж буй бичвэр сервер таслаж (trim) буцаасан ижил утгаар солигдохгүй — курсор, зай алдагдахгүй */
const keepTyped = (local: string | null, server: string | null) =>
  (local ?? "").trim() === (server ?? "") ? local : server;
function merge(local: VisitView | undefined, server: VisitView): VisitView {
  if (!local) return server;
  return {
    ...server,
    comment: keepTyped(local.comment, server.comment),
    attendance: { ...server.attendance, note: keepTyped(local.attendance.note, server.attendance.note) },
    homework: { ...server.homework, note: keepTyped(local.homework.note, server.homework.note) },
  };
}

/**
 * Нэг газрын (зочилсон анги эсвэл 406) тэр өдрийн нөхөлтүүд: ачаалах, 20 сек тутам
 * шинэчлэх (хоёр багш зэрэг), засварыг дараалуулан хадгалах (хариу сольж ирэхгүй),
 * бичиж буй тэмдэглэлийг зогссоны дараа илгээх.
 */
export function useVisits(place: string, date: string) {
  const [visits, setVisits] = useState<VisitView[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const pending = useRef(0);
  const chains = useRef(new Map<string, Promise<unknown>>());
  const typing = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; send: () => void }>());
  const key = `${place}|${date}`;
  const ctx = useRef(key);
  useEffect(() => {
    ctx.current = key;
  }, [key]);

  const load = useCallback(async () => {
    const want = `${place}|${date}`;
    try {
      const rows = await api<VisitView[]>(`/makeup-visits?date=${date}&place=${encodeURIComponent(place)}`);
      // Хадгалж байх үед ирсэн хариу хуучирсан байж болно — дараагийн удаа
      if (ctx.current !== want || pending.current > 0 || typing.current.size > 0) return;
      setVisits(rows);
      setError("");
    } catch (e) {
      if (ctx.current === want) setError(e instanceof Error ? e.message : "Ачаалж чадсангүй");
    }
  }, [place, date]);

  // Газар/өдөр солигдоход эцэг компонент key-ээр шинээр үүсдэг тул энд хоослохгүй
  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  /** Түр (optimistic) өөрчлөлт — сервер хариулахад жинхэнэ мөрөөр солигдоно */
  const patchLocal = useCallback((id: string, fn: (v: VisitView) => VisitView) => {
    setVisits((list) => (list ? list.map((v) => (v.id === id ? fn(v) : v)) : list));
  }, []);

  const replace = useCallback((rows: VisitView[]) => {
    const byId = new Map(rows.map((r) => [r.id, r]));
    setVisits((list) => (list ? list.map((v) => (byId.has(v.id) ? merge(v, byId.get(v.id)!) : v)) : list));
  }, []);

  /** Нэг нөхөлтийн хадгалалтуудыг дараалуулна */
  const save = useCallback(
    (id: string, body: Record<string, unknown>) => {
      const want = ctx.current;
      pending.current += 1;
      const prev = chains.current.get(id) ?? Promise.resolve();
      const task = prev
        .catch(() => undefined)
        .then(async () => {
          try {
            const row = await api<VisitView>(`/makeup-visits/${encodeURIComponent(id)}`, { method: "PATCH", body });
            if (ctx.current === want) replace([row]);
          } catch (e) {
            toast.error(e instanceof Error && e.message ? e.message : "Хадгалж чадсангүй");
            if (ctx.current === want) setReloadKey((k) => k + 1);
          } finally {
            pending.current -= 1;
          }
        });
      chains.current.set(id, task);
      return task;
    },
    [replace],
  );

  /** Бичиж байх үед: зогссоны дараа нэг л хүсэлт */
  const saveTyped = useCallback(
    (id: string, field: string, value: string | null) => {
      const k = `${id}|${field}`;
      const t = typing.current.get(k);
      if (t) clearTimeout(t.timer);
      const send = () => {
        typing.current.delete(k);
        void save(id, { [field]: value });
      };
      typing.current.set(k, { timer: setTimeout(send, TYPE_MS), send });
    },
    [save],
  );

  // Гарахад (өдөр/анги солиход) бичиж байсныг алдахгүй — шууд илгээнэ
  useEffect(() => {
    const timers = typing.current;
    return () => {
      [...timers.values()].forEach((t) => {
        clearTimeout(t.timer);
        t.send();
      });
      timers.clear();
    };
  }, [key]);

  const add = useCallback((rows: VisitView[]) => {
    setVisits((list) => {
      const have = new Set((list ?? []).map((v) => v.id));
      return [...(list ?? []), ...rows.filter((r) => !have.has(r.id))];
    });
  }, []);

  const removeLocal = useCallback((id: string) => {
    setVisits((list) => (list ? list.filter((v) => v.id !== id) : list));
  }, []);

  return {
    visits,
    error,
    reload: () => setReloadKey((k) => k + 1),
    patchLocal,
    replace,
    save,
    saveTyped,
    add,
    removeLocal,
  };
}

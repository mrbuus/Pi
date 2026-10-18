"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  ABSENCE_REASONS,
  EMPTY_REC,
  HOMEWORK_REASONS,
  isReason,
  ubParts,
  type AttRow,
  type AttendanceStatus,
  type BoardPayload,
  type Criteria,
  type DayRec,
  type HomeworkStatus,
  type HwRow,
  type LateRangeValue,
  type MarksPayload,
  type RiskFlag,
} from "./lib";

/** Хоёр багш зэрэг тэмдэглэх үед серверээс шинэчлэх давтамж (D8) */
export const POLL_MS = 15_000;
/** Бичиж зогссоноос хойш хадгалах хүлээлт */
const TYPE_MS = 700;

type Cell = "att" | "attNote" | "hw" | "hwNote";
type Override =
  | { cell: "att"; att: AttendanceStatus | null; lateRange: LateRangeValue | null }
  | { cell: "attNote"; text: string }
  | { cell: "hw"; hw: HomeworkStatus | null }
  | { cell: "hwNote"; text: string };

interface Server {
  att: Map<string, AttRow>;
  hw: Map<string, HwRow>;
}

interface MarkResponse {
  applied: string[];
  skipped: string[];
  rows: AttRow[];
}
interface HwBulkResponse {
  applied: string[];
  skipped: string[];
  rows: HwRow[];
}
interface HwPatchResponse {
  applied: boolean;
  status: HomeworkStatus | null;
  comment: string | null;
  markedBy: string | null;
  updatedAt: string | null;
}

interface Target {
  classId: string;
  date: string;
}

const ck = (sid: string, cell: Cell) => `${sid}|${cell}`;
const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : "Хадгалж чадсангүй");

function toServer(p: MarksPayload): Server {
  return {
    att: new Map(p.attendance.map((r) => [r.studentId, r])),
    hw: new Map(p.homework.map((r) => [r.studentId, r])),
  };
}

function nowTime(): string {
  return ubParts(new Date().toISOString()).time;
}

export interface SaveState {
  pending: number;
  savedAt: string | null;
  error: string | null;
}

export function useBoard(classId: string | null, date: string) {
  const [data, setData] = useState<BoardPayload | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [loadError, setLoadError] = useState("");
  const [server, setServer] = useState<Server>({ att: new Map(), hw: new Map() });
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [risk, setRisk] = useState<Record<string, RiskFlag[]>>({});
  const [sent, setSent] = useState<string[]>([]);
  const [criteria, setCriteriaState] = useState<Criteria | null>(null);
  const [save, setSave] = useState<SaveState>({ pending: 0, savedAt: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  const pending = useRef(new Map<string, number>());
  /** Бичиж байгаа нүд: хүлээлтийн цаг + илгээх функц (гарах/анги солиход шууд илгээнэ) */
  const typing = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; send: () => void }>());
  const chains = useRef(new Map<string, Promise<unknown>>());
  /** Хадгалалт бүр дуусахад нэмэгдэнэ — нисэж байсан шинэчлэл хуучирсан эсэхийг мэднэ */
  const epoch = useRef(0);
  const ctx = useRef({ classId, date });
  const latest = useRef({ server, overrides });
  useEffect(() => {
    latest.current = { server, overrides };
  });

  /* ───────── Ачаалах ───────── */

  useEffect(() => {
    // Өмнөх анги/өдрийн бичиж байсан тэмдэглэлийг алдахгүй — шууд илгээнэ (өөрийн огноогоор)
    const timers = typing.current;
    timers.forEach((t) => {
      clearTimeout(t.timer);
      t.send();
    });
    timers.clear();
    ctx.current = { classId, date };
    pending.current.clear();
    chains.current.clear();
    setOverrides({});
    setSave({ pending: 0, savedAt: null, error: null });
    if (!classId) {
      setData(null);
      setStatus("idle");
      return;
    }
    let alive = true;
    setStatus("loading");
    setLoadError("");
    api<BoardPayload>(`/attendance/classrooms/${encodeURIComponent(classId)}/board?date=${date}`)
      .then((p) => {
        if (!alive) return;
        setData(p);
        setServer(toServer(p));
        setRisk(p.risk);
        setSent(p.sent?.students ?? []);
        setCriteriaState(p.criteria);
        setStatus("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setLoadError(errText(e));
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [classId, date, reloadKey]);

  /* ───────── 15 сек тутам (харагдаж байхад) шинэчлэх ───────── */

  const poll = useCallback(async () => {
    const { classId: cid, date: d } = ctx.current;
    if (!cid || document.visibilityState !== "visible") return;
    const at = epoch.current;
    try {
      const p = await api<MarksPayload>(`/attendance/classrooms/${encodeURIComponent(cid)}/marks?date=${d}`);
      if (ctx.current.classId !== cid || ctx.current.date !== d) return;
      setRisk(p.risk);
      setSent(p.sent?.students ?? []);
      setCriteriaState(p.criteria);
      // Нисэж байх хооронд манай хадгалалт дууссан бол хуучирсан байж болно — дараагийнхыг хүлээнэ
      if (epoch.current !== at) return;
      setServer(toServer(p));
    } catch {
      // сүлжээ тасарсан — дараагийн удаа
    }
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    const id = setInterval(() => void poll(), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [status, poll]);

  /* ───────── Бүртгэл = серверийн төлөв + хадгалагдаж буй нүд ───────── */

  const recs = useMemo(() => {
    const out = new Map<string, DayRec>();
    for (const s of data?.students ?? []) {
      const a = server.att.get(s.id);
      const h = server.hw.get(s.id);
      const rec: DayRec = {
        att: a?.status ?? null,
        lateRange: a?.lateRange ?? null,
        attNote: a?.note ?? "",
        hw: h?.status ?? null,
        hwNote: h?.comment ?? "",
        attBy: a?.markedBy ?? null,
        hwBy: h?.markedBy ?? null,
      };
      for (const cell of ["att", "attNote", "hw", "hwNote"] as Cell[]) {
        const o = overrides[ck(s.id, cell)];
        if (!o) continue;
        if (o.cell === "att") {
          rec.att = o.att;
          rec.lateRange = o.lateRange;
        } else if (o.cell === "attNote") rec.attNote = o.text;
        else if (o.cell === "hw") rec.hw = o.hw;
        else rec.hwNote = o.text;
      }
      out.set(s.id, rec);
    }
    return out;
  }, [data, server, overrides]);

  const current = useCallback((sid: string): DayRec => {
    const { server: sv, overrides: ov } = latest.current;
    const a = sv.att.get(sid);
    const h = sv.hw.get(sid);
    const rec: DayRec = {
      ...EMPTY_REC,
      att: a?.status ?? null,
      lateRange: a?.lateRange ?? null,
      attNote: a?.note ?? "",
      hw: h?.status ?? null,
      hwNote: h?.comment ?? "",
    };
    const o1 = ov[ck(sid, "att")];
    if (o1?.cell === "att") {
      rec.att = o1.att;
      rec.lateRange = o1.lateRange;
    }
    const o2 = ov[ck(sid, "attNote")];
    if (o2?.cell === "attNote") rec.attNote = o2.text;
    const o3 = ov[ck(sid, "hw")];
    if (o3?.cell === "hw") rec.hw = o3.hw;
    const o4 = ov[ck(sid, "hwNote")];
    if (o4?.cell === "hwNote") rec.hwNote = o4.text;
    return rec;
  }, []);

  /* ───────── Хадгалах дараалал ───────── */

  const setOverride = useCallback((sid: string, o: Override) => {
    const next = { ...latest.current.overrides, [ck(sid, o.cell)]: o };
    latest.current = { ...latest.current, overrides: next };
    setOverrides(next);
  }, []);

  const bump = useCallback((keys: string[], delta: 1 | -1) => {
    for (const k of keys) {
      const n = (pending.current.get(k) ?? 0) + delta;
      if (n <= 0) pending.current.delete(k);
      else pending.current.set(k, n);
    }
    let total = 0;
    pending.current.forEach((n) => (total += n));
    return total;
  }, []);

  /** Хадгалагдаж дууссан нүдний түр утгыг арилгана (серверийн хариу аль хэдийн орсон) */
  const settle = useCallback((keys: string[]) => {
    const done = keys.filter((k) => !pending.current.has(k) && !typing.current.has(k));
    if (!done.length) return;
    setOverrides((prev) => {
      const next = { ...prev };
      for (const k of done) delete next[k];
      latest.current = { ...latest.current, overrides: next };
      return next;
    });
  }, []);

  const applyAtt = useCallback((ids: string[], rows: AttRow[]) => {
    setServer((prev) => {
      const att = new Map(prev.att);
      for (const id of ids) att.delete(id);
      for (const r of rows) att.set(r.studentId, r);
      const next = { ...prev, att };
      latest.current = { ...latest.current, server: next };
      return next;
    });
  }, []);

  const applyHw = useCallback((ids: string[], rows: HwRow[]) => {
    setServer((prev) => {
      const hw = new Map(prev.hw);
      for (const id of ids) hw.delete(id);
      for (const r of rows) hw.set(r.studentId, r);
      const next = { ...prev, hw };
      latest.current = { ...latest.current, server: next };
      return next;
    });
  }, []);

  /**
   * Нэг сурагчийн хадгалалтуудыг дараалуулна (хариу сольж ирэхгүй). `keys` — нүднүүд;
   * амжилтгүй бол түр утгыг хаяж серверийнхийг харуулна.
   */
  const run = useCallback(
    (sids: string[], keys: string[], fn: (t: Target) => Promise<void>, opts: { counted?: boolean } = {}) => {
      const target: Target = { classId: ctx.current.classId!, date: ctx.current.date };
      const same = () => ctx.current.classId === target.classId && ctx.current.date === target.date;
      if (!opts.counted) {
        // bump-ийг state-ийн updater дотор БҮҮ дууд — dev горимд хоёр удаа ажиллаж тоо зөрнө
        const total = bump(keys, 1);
        setSave((s) => ({ ...s, pending: total, error: null }));
      }
      const prevs = sids.map((sid) => chains.current.get(sid) ?? Promise.resolve());
      const task = Promise.all(prevs)
        .catch(() => undefined)
        .then(async () => {
          try {
            await fn(target);
            // Анги/өдөр солигдсон бол хадгалагдсан ч энэ дэлгэцэд хамаагүй
            if (!same()) return;
            epoch.current += 1;
            const total = bump(keys, -1);
            setSave((s) => ({ pending: total, savedAt: total === 0 ? nowTime() : s.savedAt, error: s.error }));
          } catch (e) {
            if (!same()) return;
            epoch.current += 1;
            const total = bump(keys, -1);
            setSave((s) => ({ ...s, pending: total, error: errText(e) }));
            // Түр утгыг хаяж серверийн бодит төлөвийг харуулна
            setOverrides((prev) => {
              const next = { ...prev };
              for (const k of keys) if (!pending.current.has(k) && !typing.current.has(k)) delete next[k];
              latest.current = { ...latest.current, overrides: next };
              return next;
            });
            void poll();
            return;
          }
          settle(keys);
        });
      for (const sid of sids) chains.current.set(sid, task);
      return task;
    },
    [bump, settle, poll],
  );

  const isCurrent = (t: Target) => ctx.current.classId === t.classId && ctx.current.date === t.date;

  const postAtt = useCallback(
    async (t: Target, entries: Record<string, unknown>[]) => {
      const res = await api<MarkResponse>(`/classrooms/${encodeURIComponent(t.classId)}/attendance`, {
        method: "POST",
        body: { date: t.date, entries },
      });
      if (isCurrent(t))
        applyAtt(
          entries.map((e) => e.studentId as string),
          res.rows,
        );
      return res;
    },
    [applyAtt],
  );

  const patchHw = useCallback(
    async (t: Target, sid: string, body: Record<string, unknown>) => {
      const res = await api<HwPatchResponse>(
        `/classrooms/${encodeURIComponent(t.classId)}/homework-marks/${encodeURIComponent(sid)}`,
        { method: "PATCH", body: { date: t.date, ...body } },
      );
      if (isCurrent(t))
        applyHw([sid], [{ studentId: sid, status: res.status, comment: res.comment, markedBy: res.markedBy, updatedAt: res.updatedAt }]);
    },
    [applyHw],
  );

  /* ───────── Товшилт бүр шууд хадгалагдана (D8) ───────── */

  const onAtt = useCallback(
    (sid: string, v: AttendanceStatus | null) => {
      const cur = current(sid);
      const lateRange = v === "LATE" ? cur.lateRange : null;
      setOverride(sid, { cell: "att", att: v, lateRange });
      const keys = [ck(sid, "att")];
      const entry: Record<string, unknown> = { studentId: sid, status: v };
      // Тасалсан/чөлөөтэй биш болбол сонгосон шалтгааны чипийг цэвэрлэнэ (гараар бичсэнийг үлдээнэ);
      // тэмдэглэгээг арилгавал мөр устах тул тэмдэглэл ч хамт арилна
      const clearNote = v === null ? cur.attNote !== "" : v !== "ABSENT" && v !== "EXCUSED" && isReason(cur.attNote, ABSENCE_REASONS);
      if (clearNote) {
        setOverride(sid, { cell: "attNote", text: "" });
        keys.push(ck(sid, "attNote"));
        if (v !== null) entry.note = null;
      }
      void run([sid], keys, async (t) => {
        await postAtt(t, [entry]);
      });
    },
    [current, setOverride, run, postAtt],
  );

  const onRange = useCallback(
    (sid: string, r: LateRangeValue | null) => {
      setOverride(sid, { cell: "att", att: "LATE", lateRange: r });
      void run([sid], [ck(sid, "att")], async (t) => {
        await postAtt(t, [{ studentId: sid, status: "LATE", lateRange: r }]);
      });
    },
    [setOverride, run, postAtt],
  );

  const onHw = useCallback(
    (sid: string, v: HomeworkStatus | null) => {
      const cur = current(sid);
      setOverride(sid, { cell: "hw", hw: v });
      const keys = [ck(sid, "hw")];
      const body: Record<string, unknown> = { status: v };
      if (v !== "PARTIAL" && v !== "NOT_DONE" && isReason(cur.hwNote, HOMEWORK_REASONS)) {
        setOverride(sid, { cell: "hwNote", text: "" });
        keys.push(ck(sid, "hwNote"));
        body.comment = null;
      }
      void run([sid], keys, (t) => patchHw(t, sid, body));
    },
    [current, setOverride, run, patchHw],
  );

  /** typed = гараар бичиж байна (зогссоны дараа); эс бөгөөс шалтгааны жагсаалтаас (шууд) */
  const writeNote = useCallback(
    (sid: string, cell: "attNote" | "hwNote", text: string, typed: boolean) => {
      if (cell === "attNote" && current(sid).att === null) return;
      setOverride(sid, { cell, text });
      const key = ck(sid, cell);
      // Илгээх агшинд хамгийн сүүлийн бичвэрийг авна (зогссоны дараа нэг л хүсэлт)
      const value = { text };
      const send = () =>
        void run(
          [sid],
          [key],
          async (t) => {
            const body = value.text.trim() === "" ? null : value.text;
            if (cell === "attNote") await postAtt(t, [{ studentId: sid, note: body }]);
            else await patchHw(t, sid, { comment: body });
          },
          { counted: true },
        );
      const prev = typing.current.get(key);
      if (prev) clearTimeout(prev.timer);
      else {
        const total = bump([key], 1);
        setSave((s) => ({ ...s, pending: total, error: null }));
      }
      if (!typed) {
        typing.current.delete(key);
        send();
        return;
      }
      typing.current.set(key, {
        timer: setTimeout(() => {
          typing.current.delete(key);
          send();
        }, TYPE_MS),
        send,
      });
    },
    [current, setOverride, run, postAtt, patchHw, bump],
  );

  const onAttNote = useCallback((sid: string, t: string, typed: boolean) => writeNote(sid, "attNote", t, typed), [writeNote]);
  const onHwNote = useCallback((sid: string, t: string, typed: boolean) => writeNote(sid, "hwNote", t, typed), [writeNote]);

  // Хуудаснаас гарахад бичиж байсан тэмдэглэлийг шууд илгээнэ
  useEffect(() => {
    const timers = typing.current;
    return () => {
      timers.forEach((t) => {
        clearTimeout(t.timer);
        t.send();
      });
      timers.clear();
    };
  }, []);

  /* ───────── Бөөнөөр: зөвхөн тэмдэглээгүй нүд, өөр багшийнхыг дарахгүй ───────── */

  const bulkAtt = useCallback(
    async (ids: string[], v: AttendanceStatus | null, onlyIf: "UNMARKED" | AttendanceStatus): Promise<string[]> => {
      if (!ids.length) return [];
      for (const id of ids) setOverride(id, { cell: "att", att: v, lateRange: null });
      let applied: string[] = [];
      await run(
        ids,
        ids.map((id) => ck(id, "att")),
        async (t) => {
          const res = await postAtt(
            t,
            ids.map((studentId) => ({ studentId, status: v, onlyIf })),
          );
          applied = res.applied;
        },
      );
      return applied;
    },
    [setOverride, run, postAtt],
  );

  const bulkHw = useCallback(
    async (ids: string[], v: HomeworkStatus | null, onlyIf: "UNMARKED" | HomeworkStatus): Promise<string[]> => {
      if (!ids.length) return [];
      for (const id of ids) setOverride(id, { cell: "hw", hw: v });
      let applied: string[] = [];
      await run(
        ids,
        ids.map((id) => ck(id, "hw")),
        async (t) => {
          const res = await api<HwBulkResponse>(`/classrooms/${encodeURIComponent(t.classId)}/homework-marks/bulk`, {
            method: "POST",
            body: { date: t.date, entries: ids.map((studentId) => ({ studentId, status: v, onlyIf })) },
          });
          if (isCurrent(t)) applyHw(ids, res.rows);
          applied = res.applied;
        },
      );
      return applied;
    },
    [setOverride, run, applyHw],
  );

  /* ───────── Шалгуур (Багш+ / Админ) ───────── */

  const saveCriteria = useCallback(
    async (next: Criteria) => {
      const cid = ctx.current.classId;
      if (!cid) return;
      setCriteriaState(next);
      setSave((s) => ({ ...s, pending: s.pending + 1, error: null }));
      try {
        await api(`/attendance/classrooms/${encodeURIComponent(cid)}/criteria`, { method: "PUT", body: next });
        setSave((s) => ({ ...s, pending: Math.max(0, s.pending - 1), savedAt: nowTime() }));
        void poll();
      } catch (e) {
        setSave((s) => ({ ...s, pending: Math.max(0, s.pending - 1), error: errText(e) }));
        void poll();
      }
    },
    [poll],
  );

  return {
    data,
    status,
    loadError,
    reload: () => setReloadKey((k) => k + 1),
    recs,
    risk,
    sent,
    criteria,
    save,
    onAtt,
    onRange,
    onAttNote,
    onHw,
    onHwNote,
    bulkAtt,
    bulkHw,
    saveCriteria,
    poll,
  };
}

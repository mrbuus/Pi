"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Download,
  Landmark,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/kit/button";
import InfoHint from "@/components/ui/InfoHint";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useUnsavedGuard } from "@/hooks/useUndoable";
import { api } from "@/lib/api";
import { formatHundredths, parseHoursInput } from "@/lib/hoursInput";
import { formatMnt } from "@/lib/orgInfo";
import AccountDrawer from "./AccountDrawer";

/* ============================================================================
 * «Ажилласан цаг» — эзний Excel «Цаг»-ийн веб хувилбар (эзэн 2026-11-08).
 *
 * Мөр = багш (ажлын өдрийн хүснэгтийн дарааллаар), багана = хагас сарын өдөр
 * (1–15, 16–сарын сүүл), сүүлийн багана = нийт. Багшид сард 2 удаа цалин
 * олгодог тул хүснэгт хагас сараар шилждэг.
 *
 * Бөглөх: нүдэнд дарахад тоон гар (аравтын тэмдэгтэй) гарна; «7,5» ч «7.5» ч
 * болно. Enter = ДООШ (дараагийн багш, тэр өдөр) — өдөр бүрийн оройд тухайн
 * өдрийн баганыг дээрээс доош бөглөдөг хэв маягт таарна; багана дуусахад
 * дараагийн өдрийн дээд мөр. Tab = баруун тийш. Сум: дээш/доош, баруун/зүүн
 * (курсор ирмэг дээр байхад). Esc = буцаах. Утга 1 секундын дараа эсвэл нүднээс
 * гарахад автоматаар хадгалагдана; хадгалагдаагүй нүд улаанаар үлдэнэ.
 *
 * Өдрийн хуваарьт (ахлах/туслах багшаар) оноогдсон өдөр тухайн багшийн мөрөнд
 * цайвар хөхөөр, буланд цэгтэй харагдана. Цагийн хөлсний баганыг зөвхөн
 * сервер зөвшөөрсөн нэг хүн (viewer.seesPay) хардаг.
 * ========================================================================== */

interface StaffedDay {
  minutes: number;
  lessons: number;
}
interface SheetRow {
  teacherId: string;
  name: string;
  role: string;
  inRoster: boolean;
  archived: boolean;
  hasAccount: boolean;
  cells: Record<string, number>;
  totalHundredths: number;
  staffed: Record<string, StaffedDay>;
}
interface SheetResponse {
  period: { id: string; start: string; end: string; days: string[]; prev: string; next: string | null; current: string };
  today: string;
  viewer: { userId: string; canEdit: boolean; seesPay: boolean };
  rows: SheetRow[];
  totalHundredths: number;
}
interface PayRow {
  teacherId: string;
  ratePerHour: number | null;
  rateFrom: string | null;
  setThisPeriod: boolean;
}
interface PayResponse {
  period: string;
  rows: PayRow[];
}

type CellState = { kind: "saving" } | { kind: "error"; message: string };

const WEEKDAY_SHORT = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
const WEEKDAY_FULL = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
const SAVE_DELAY_MS = 1000;

const keyOf = (teacherId: string, date: string) => `${teacherId}|${date}`;
/** JS гараг (0=Ням…6=Бямба) — UTC-ээр, цагийн бүсээс хамаарахгүй */
const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const dayOf = (date: string) => Number(date.slice(8, 10));

function periodLabel(start: string, end: string): string {
  return `${start.slice(0, 4)} оны ${Number(start.slice(5, 7))}-р сар, ${dayOf(start)}–${dayOf(end)}`;
}
function dateLabel(date: string): string {
  return `${Number(date.slice(5, 7))}-р сарын ${dayOf(date)}, ${WEEKDAY_FULL[weekdayOf(date)]}`;
}
function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} мин`;
  return m ? `${h} цаг ${m} мин` : `${h} цаг`;
}
function errText(e: unknown) {
  return e instanceof Error ? e.message : "Хадгалж чадсангүй";
}

export default function WorkSheet() {
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [data, setData] = useState<SheetResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  // Хадгалагдсан утга (сервер), бичиж буй ноорог, нүдний төлөв — огноо|багш түлхүүрээр
  const [values, setValues] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cellState, setCellState] = useState<Record<string, CellState>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const valuesRef = useRef(values);
  const draftsRef = useRef(drafts);
  valuesRef.current = values;
  draftsRef.current = drafts;
  const timers = useRef(new Map<string, number>());
  const inflight = useRef(new Set<string>());
  const again = useRef(new Set<string>());

  const [pay, setPay] = useState<PayResponse | null>(null);
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});
  const [rateSaving, setRateSaving] = useState<Record<string, boolean>>({});

  const [focus, setFocus] = useState<{ r: number; c: number } | null>(null);
  const [account, setAccount] = useState<{ id: string; name: string } | null>(null);
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const scroller = useRef<HTMLDivElement>(null);

  /* ------------------------------------------------------------ Ачаалах */
  const [loadKey, setLoadKey] = useState(`${periodId}|${tick}`);
  if (loadKey !== `${periodId}|${tick}`) {
    setLoadKey(`${periodId}|${tick}`);
    setLoading(true);
  }
  useEffect(() => {
    let alive = true;
    const q = periodId ? `?period=${periodId}` : "";
    api<SheetResponse>(`/teacher-hours/sheet${q}`)
      .then(async (r) => {
        if (!alive) return;
        setData(r);
        setLoadError("");
        setValues((prev) => {
          const next = { ...prev };
          // Энэ үеийн өдрүүдийг серверийнхээр шинэчилнэ (бусад үе хэвээр)
          const days = new Set(r.period.days);
          for (const k of Object.keys(next)) if (days.has(k.slice(k.indexOf("|") + 1))) delete next[k];
          for (const row of r.rows)
            for (const [date, h] of Object.entries(row.cells)) next[keyOf(row.teacherId, date)] = h;
          return next;
        });
        setLoading(false);
        if (r.viewer.seesPay) {
          try {
            const p = await api<PayResponse>(`/teacher-hours/pay?period=${r.period.id}`);
            if (alive) setPay(p);
          } catch {
            if (alive) setPay(null);
          }
        } else setPay(null);
      })
      .catch((e) => {
        if (!alive) return;
        setLoadError(e instanceof Error ? e.message : "Ачаалахад алдаа гарлаа");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [periodId, tick]);

  // Өнөөдрийн багана харагдахаар гүйлгэнэ (утсан дээр 15 баганаас зөвхөн 5–6 нь багтана)
  useEffect(() => {
    if (!data || loading) return;
    const el = scroller.current?.querySelector<HTMLElement>(`[data-day="${data.today}"]`);
    const box = scroller.current;
    if (!box) return;
    // Өнгөрсөн үед өнөөдөр байхгүй — эхнээс нь
    box.scrollLeft = el ? Math.max(0, el.offsetLeft - box.clientWidth / 2) : 0;
  }, [data, loading]);

  /* ------------------------------------------------------------ Хадгалах */
  const saveKey = useCallback(async (key: string) => {
    const timer = timers.current.get(key);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(key);
    const text = draftsRef.current[key];
    if (text === undefined) return;
    const parsed = parseHoursInput(text);
    if (!parsed.ok) {
      setCellState((s) => ({ ...s, [key]: { kind: "error", message: parsed.error } }));
      return;
    }
    const clearDraft = () =>
      setDrafts((d) => {
        if (d[key] !== text) return d;
        const next = { ...d };
        delete next[key];
        return next;
      });
    if (parsed.hundredths === (valuesRef.current[key] ?? null)) {
      clearDraft();
      setCellState((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
      return;
    }
    if (inflight.current.has(key)) {
      again.current.add(key);
      return;
    }
    inflight.current.add(key);
    setCellState((s) => ({ ...s, [key]: { kind: "saving" } }));
    const [teacherId, date] = key.split("|");
    try {
      const r = await api<{ hundredths: number | null }>("/teacher-hours/sheet/cell", {
        method: "PUT",
        body: { teacherId, date, value: text },
      });
      setValues((v) => {
        const next = { ...v };
        if (r.hundredths === null) delete next[key];
        else next[key] = r.hundredths;
        valuesRef.current = next;
        return next;
      });
      clearDraft();
      setCellState((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
      setSavedAt(Date.now());
    } catch (e) {
      setCellState((s) => ({ ...s, [key]: { kind: "error", message: errText(e) } }));
    } finally {
      inflight.current.delete(key);
      if (again.current.delete(key)) void saveKey(key);
    }
  }, []);

  function onType(key: string, text: string) {
    setDrafts((d) => ({ ...d, [key]: text }));
    draftsRef.current = { ...draftsRef.current, [key]: text };
    setCellState((s) => {
      if (!s[key] || s[key].kind !== "error") return s;
      const next = { ...s };
      delete next[key];
      return next;
    });
    const timer = timers.current.get(key);
    if (timer) window.clearTimeout(timer);
    timers.current.set(
      key,
      window.setTimeout(() => void saveKey(key), SAVE_DELAY_MS),
    );
  }

  function revert(key: string) {
    const timer = timers.current.get(key);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(key);
    setDrafts((d) => {
      const next = { ...d };
      delete next[key];
      draftsRef.current = next;
      return next;
    });
    setCellState((s) => {
      const next = { ...s };
      delete next[key];
      return next;
    });
  }

  function retryAll() {
    for (const key of Object.keys(draftsRef.current)) void saveKey(key);
  }

  const pendingCount = Object.keys(drafts).length;
  // Хадгалагдаагүй нүд: серверийн алдаа + буруу бичсэн (хадгалах боломжгүй) ноорог
  const errorCount = Object.keys(drafts).filter(
    (k) => cellState[k]?.kind === "error" || !parseHoursInput(drafts[k]).ok,
  ).length;
  const savingCount = Object.values(cellState).filter((s) => s.kind === "saving").length;
  useUnsavedGuard(pendingCount > 0, "teacher-hours");

  /* ------------------------------------------------------------ Хөлс */
  async function saveRate(teacherId: string) {
    if (!data) return;
    const text = rateDrafts[teacherId];
    if (text === undefined) return;
    const digits = text.replace(/\D/g, "");
    const current = pay?.rows.find((r) => r.teacherId === teacherId)?.ratePerHour ?? null;
    const next = digits === "" ? null : Number(digits);
    if (next === current) {
      setRateDrafts((d) => {
        const n = { ...d };
        delete n[teacherId];
        return n;
      });
      return;
    }
    setRateSaving((s) => ({ ...s, [teacherId]: true }));
    try {
      await api("/teacher-hours/pay/rate", {
        method: "PUT",
        body: { teacherId, period: data.period.id, ratePerHour: next },
      });
      const p = await api<PayResponse>(`/teacher-hours/pay?period=${data.period.id}`);
      setPay(p);
      setRateDrafts((d) => {
        const n = { ...d };
        delete n[teacherId];
        return n;
      });
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setRateSaving((s) => ({ ...s, [teacherId]: false }));
    }
  }

  /* ------------------------------------------------------------ Тооцоо */
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const days = useMemo(() => data?.period.days ?? [], [data]);
  const canEdit = !!data?.viewer.canEdit;
  const seesPay = !!data?.viewer.seesPay && !!pay;

  /** Нүдний одоогийн утга: зөв ноорог байвал түүнийг, үгүй бол хадгалсныг */
  const effective = useCallback(
    (key: string): number | null => {
      const d = drafts[key];
      if (d !== undefined) {
        const p = parseHoursInput(d);
        if (p.ok) return p.hundredths;
      }
      return values[key] ?? null;
    },
    [drafts, values],
  );

  const rowTotals = useMemo(
    () =>
      rows.map((r) => days.reduce((sum, date) => sum + (effective(keyOf(r.teacherId, date)) ?? 0), 0)),
    [rows, days, effective],
  );
  const dayTotals = useMemo(
    () => days.map((date) => rows.reduce((sum, r) => sum + (effective(keyOf(r.teacherId, date)) ?? 0), 0)),
    [rows, days, effective],
  );
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);
  const rateOf = (teacherId: string) => pay?.rows.find((r) => r.teacherId === teacherId) ?? null;
  const payOf = (teacherId: string, totalHundredths: number) => {
    const rate = rateOf(teacherId)?.ratePerHour;
    return rate === null || rate === undefined ? null : Math.round((totalHundredths * rate) / 100);
  };
  const payTotal = seesPay
    ? rows.reduce((sum, r, i) => sum + (payOf(r.teacherId, rowTotals[i]) ?? 0), 0)
    : 0;

  /* ------------------------------------------------------------ Гар */
  function focusCell(r: number, c: number) {
    const el = inputs.current.get(`${r}:${c}`);
    if (el) {
      el.focus();
      el.select();
    }
  }
  /** Enter/«Доош»: доорх мөр; багана дуусвал дараагийн өдрийн эхний мөр */
  function moveVertical(r: number, c: number, dir: 1 | -1) {
    let nr = r + dir;
    let nc = c;
    if (nr >= rows.length) {
      nr = 0;
      nc = c + 1;
    } else if (nr < 0) {
      nr = rows.length - 1;
      nc = c - 1;
    }
    if (nc < 0 || nc >= days.length) return;
    focusCell(nr, nc);
  }
  function onKey(e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number, key: string) {
    const el = e.currentTarget;
    if (e.key === "Enter") {
      e.preventDefault();
      void saveKey(key);
      moveVertical(r, c, e.shiftKey ? -1 : 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (r + 1 < rows.length) focusCell(r + 1, c);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (r > 0) focusCell(r - 1, c);
    } else if (e.key === "ArrowRight" && el.selectionStart === el.value.length && el.selectionEnd === el.value.length) {
      e.preventDefault();
      if (c + 1 < days.length) focusCell(r, c + 1);
    } else if (e.key === "ArrowLeft" && el.selectionStart === 0 && el.selectionEnd === 0) {
      e.preventDefault();
      if (c > 0) focusCell(r, c - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      revert(key);
    }
  }
  function onBlurCell(key: string) {
    void saveKey(key);
    // Хүснэгтийн өөр нүд рүү шилжээгүй бол дээд мөрийг нууна
    window.setTimeout(() => {
      const a = document.activeElement as HTMLElement | null;
      if (!a?.dataset?.cell) setFocus(null);
    }, 0);
  }

  function downloadCsv() {
    if (!data) return;
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [["№", "Нэр", ...days.map((d) => String(dayOf(d))), "Нийт"].join(",")];
    rows.forEach((r, i) => {
      lines.push(
        [
          i + 1,
          q(r.name),
          ...days.map((d) => formatHundredths(effective(keyOf(r.teacherId, d)))),
          formatHundredths(rowTotals[i]),
        ].join(","),
      );
    });
    // UTF-8 BOM — Excel кирилл үсгийг зөв уншина
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ajillasan-tsag-${data.period.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ------------------------------------------------------------ Дүрслэл */
  if (loadError && !data)
    return <ErrorState message={loadError} onRetry={() => setTick((t) => t + 1)} />;

  const focused = focus && rows[focus.r] && days[focus.c] ? { row: rows[focus.r], date: days[focus.c] } : null;
  const focusedKey = focused ? keyOf(focused.row.teacherId, focused.date) : null;
  const focusedDraft = focusedKey ? drafts[focusedKey] : undefined;
  const focusedParse = focusedDraft !== undefined ? parseHoursInput(focusedDraft) : null;
  const focusedState = focusedKey ? cellState[focusedKey] : undefined;
  const focusedStaff = focused ? focused.row.staffed[focused.date] : undefined;

  return (
    <section className="chunky p-3 sm:p-5">
      {/* Үе сонгох + хадгалалтын төлөв */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Өмнөх хагас сар"
            disabled={!data || loading}
            onClick={() => data && setPeriodId(data.period.prev)}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <h2 className="cyrillic-heading min-w-0 px-1 text-base font-bold text-ink sm:text-lg">
            {data ? periodLabel(data.period.start, data.period.end) : "Ачаалж байна"}
          </h2>
          <Button
            variant="outline"
            size="icon"
            aria-label="Дараагийн хагас сар"
            disabled={!data || loading || !data.period.next}
            onClick={() => data?.period.next && setPeriodId(data.period.next)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
        {data && data.period.id !== data.period.current && (
          <Button variant="ghost" size="sm" onClick={() => setPeriodId(data.period.current)}>
            Одоогийн үе
          </Button>
        )}
        <SaveStatus
          saving={savingCount > 0 || (pendingCount > 0 && errorCount === 0)}
          errors={errorCount}
          savedAt={savedAt}
          onRetry={retryAll}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {data && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAccount({ id: data.viewer.userId, name: "Миний данс" })}
          >
            <Landmark aria-hidden />
            Миний данс
          </Button>
        )}
        {data && rows.length > 0 && (
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download aria-hidden />
            CSV татах
          </Button>
        )}
        <InfoHint label="Хүснэгтийн тайлбар" className="self-center">
          {canEdit
            ? "Нүдэнд дарж цагаа бичнэ: 7, 7,5 эсвэл 7.5. Enter дарвал доорх багш руу, багана дуусахад дараагийн өдөр рүү шилжинэ; Tab — баруун тийш, Esc — буцаах. Бичсэн утга автоматаар хадгалагдана. Нэр дээр дарж дансыг харна"
            : "Цагийг эрхтэй ажилтан бөглөнө. Нэр дээр дарж дансыг харна, өөрийнхөө дансыг «Миний данс»-аас засна"}
        </InfoHint>
      </div>

      {/* Сонгосон нүдний мэдээлэл — утсан дээр гарын дээр харагдахаар дээд талд */}
      {canEdit && rows.length > 0 && (
        <div className="sticky top-2 z-30 mt-3 flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 pl-3 elev-2">
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-bold text-ink">{focused ? focused.row.name : "Нүдэнд дарж цаг бичнэ"}</p>
            <p className="truncate text-ink-dim">
              {!focused ? (
                "7 эсвэл 7,5 — автоматаар хадгалагдана"
              ) : focusedParse && !focusedParse.ok ? (
                <span className="font-semibold text-error">{focusedParse.error}</span>
              ) : focusedState?.kind === "error" ? (
                <span className="font-semibold text-error">{focusedState.message}</span>
              ) : (
                <>
                  {dateLabel(focused.date)}
                  {focusedStaff
                    ? `, хуваарьт ${focusedStaff.lessons} хичээл (${minutesLabel(focusedStaff.minutes)})`
                    : ""}
                </>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Дээрх мөр"
            disabled={!focused}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => focus && moveVertical(focus.r, focus.c, -1)}
          >
            <ChevronUp aria-hidden />
          </Button>
          <Button
            size="icon"
            aria-label="Доорх мөр"
            disabled={!focused}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!focus || !focusedKey) return;
              void saveKey(focusedKey);
              moveVertical(focus.r, focus.c, 1);
            }}
          >
            <ChevronDown aria-hidden />
          </Button>
        </div>
      )}

      {loading && !data ? (
        <div className="mt-4">
          <SkeletonRows rows={8} />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-dim">
          Ажлын өдрийн хүснэгтэд багш бүртгэгдээгүй байна. Хуваарийн «Багшийн ажлын өдөр» хэсэгт нэмбэл энд гарна
        </p>
      ) : (
        <div
          ref={scroller}
          className={`relative mt-3 max-h-[calc(100dvh-14rem)] min-h-[22rem] overflow-auto rounded-xl border border-line ${loading ? "opacity-60" : ""}`}
          aria-busy={loading}
        >
          <table className="border-separate border-spacing-0 text-sm tabular-nums">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-20 min-w-28 border-b border-r border-line bg-panel px-2 py-1.5 text-left text-xs font-semibold text-ink-dim sm:min-w-40"
                >
                  Нэр
                </th>
                {days.map((date) => {
                  const today = date === data?.today;
                  return (
                    <th
                      key={date}
                      scope="col"
                      data-day={date}
                      aria-label={dateLabel(date)}
                      className={`sticky top-0 z-10 min-w-11 border-b border-line bg-panel px-0.5 py-1 text-center ${today ? "text-brand" : "text-ink"}`}
                    >
                      <span className={`block text-sm font-bold ${today ? "rounded-md bg-brand-bright text-on-brand" : ""}`}>
                        {dayOf(date)}
                      </span>
                      <span className="block text-[11px] font-medium text-ink-dim">{WEEKDAY_SHORT[weekdayOf(date)]}</span>
                    </th>
                  );
                })}
                <th scope="col" className="sticky top-0 z-10 min-w-14 border-b border-l border-line bg-panel px-2 text-right text-xs font-semibold text-ink-dim">
                  Нийт
                </th>
                {seesPay && (
                  <>
                    <th scope="col" className="sticky top-0 z-10 min-w-24 border-b border-line bg-panel px-2 text-right text-xs font-semibold text-ink-dim">
                      Хөлс ₮/цаг
                    </th>
                    <th scope="col" className="sticky top-0 z-10 min-w-24 border-b border-line bg-panel px-2 text-right text-xs font-semibold text-ink-dim">
                      Цалин
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => {
                const rate = rateOf(row.teacherId);
                const rateDraft = rateDrafts[row.teacherId];
                const rowPay = payOf(row.teacherId, rowTotals[r]);
                return (
                  <tr key={row.teacherId}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-r border-line bg-surface p-0 text-left font-normal"
                    >
                      <button
                        type="button"
                        onClick={() => setAccount({ id: row.teacherId, name: row.name })}
                        className="flex min-h-11 w-full flex-col justify-center px-2 text-left hover:bg-brand-bright/5 focus-visible:bg-brand-bright/10"
                        aria-label={`${row.name} — данс харах`}
                      >
                        <span className="flex items-center gap-1 truncate font-semibold text-ink">
                          <span className="truncate">{row.name}</span>
                          {row.hasAccount && <Landmark className="size-3.5 shrink-0 text-ink-dim" aria-label="Данстай" />}
                        </span>
                        <span className="text-xs text-ink-dim sm:hidden">{formatHundredths(rowTotals[r])} цаг</span>
                      </button>
                    </th>
                    {days.map((date, c) => {
                      const key = keyOf(row.teacherId, date);
                      const staffed = row.staffed[date];
                      const draft = drafts[key];
                      const shown = draft ?? formatHundredths(values[key]);
                      const invalid = draft !== undefined && !parseHoursInput(draft).ok;
                      const state = cellState[key];
                      const bad = invalid || state?.kind === "error";
                      const today = date === data?.today;
                      const tone = staffed ? "bg-brand-bright/15" : "";
                      const label = `${row.name}, ${dateLabel(date)}${staffed ? ", хуваарьт орсон" : ""}`;
                      return (
                        <td
                          key={date}
                          className={`relative border-b border-line p-0 text-center ${tone} ${today ? "border-x border-x-brand-bright/40" : ""}`}
                        >
                          {staffed && (
                            <span aria-hidden className="pointer-events-none absolute right-0.5 top-0.5 size-1.5 rounded-full bg-brand-bright" />
                          )}
                          {canEdit ? (
                            <input
                              ref={(el) => {
                                if (el) inputs.current.set(`${r}:${c}`, el);
                                else inputs.current.delete(`${r}:${c}`);
                              }}
                              data-cell="1"
                              value={shown}
                              inputMode="decimal"
                              enterKeyHint="next"
                              autoComplete="off"
                              maxLength={6}
                              aria-label={label}
                              aria-invalid={bad || undefined}
                              onFocus={(e) => {
                                setFocus({ r, c });
                                e.currentTarget.select();
                              }}
                              onChange={(e) => onType(key, e.target.value)}
                              onKeyDown={(e) => onKey(e, r, c, key)}
                              onBlur={() => onBlurCell(key)}
                              className={`block h-11 w-11 bg-transparent text-center text-base text-ink outline-none focus:bg-surface ${bad ? "ring-2 ring-inset ring-error" : "focus:ring-2 focus:ring-inset focus:ring-brand-bright"} ${state?.kind === "saving" ? "text-ink-dim" : ""}`}
                            />
                          ) : (
                            <span className="flex h-11 w-11 items-center justify-center text-ink" aria-label={label}>
                              {shown}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-l border-line px-2 text-right font-bold text-ink">
                      {formatHundredths(rowTotals[r])}
                    </td>
                    {seesPay && (
                      <>
                        <td className="border-b border-line p-0">
                          <input
                            value={rateDraft ?? (rate?.ratePerHour != null ? String(rate.ratePerHour) : "")}
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={7}
                            placeholder="—"
                            aria-label={`${row.name} — цагийн хөлс`}
                            title={rate?.rateFrom && !rate.setThisPeriod ? `${rate.rateFrom}-аас хэрэгжиж буй` : undefined}
                            onChange={(e) =>
                              setRateDrafts((d) => ({ ...d, [row.teacherId]: e.target.value.replace(/\D/g, "") }))
                            }
                            onBlur={() => void saveRate(row.teacherId)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            disabled={rateSaving[row.teacherId]}
                            className={`block h-11 w-24 bg-transparent px-2 text-right text-base outline-none focus:bg-surface focus:ring-2 focus:ring-inset focus:ring-brand-bright ${rate?.ratePerHour != null && !rate.setThisPeriod && rateDraft === undefined ? "text-ink-dim" : "text-ink"}`}
                          />
                        </td>
                        <td className="border-b border-line px-2 text-right font-semibold text-ink">
                          {rowPay === null ? "" : formatMnt(rowPay)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="sticky bottom-0 left-0 z-20 border-r border-t-2 border-line bg-panel px-2 py-2 text-left text-xs font-semibold text-ink-dim">
                  Нийт
                </th>
                {dayTotals.map((t, i) => (
                  <td key={days[i]} className="sticky bottom-0 z-10 border-t-2 border-line bg-panel px-0.5 text-center text-xs font-semibold text-ink-dim">
                    {t ? formatHundredths(t) : ""}
                  </td>
                ))}
                <td className="sticky bottom-0 z-10 border-l border-t-2 border-line bg-panel px-2 text-right font-bold text-ink">
                  {formatHundredths(grandTotal)}
                </td>
                {seesPay && (
                  <>
                    <td className="sticky bottom-0 z-10 border-t-2 border-line bg-panel" />
                    <td className="sticky bottom-0 z-10 border-t-2 border-line bg-panel px-2 text-right font-bold text-ink">
                      {formatMnt(payTotal)}
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Тайлбар — хүснэгтийн доор */}
      {rows.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-dim">
          <li className="flex items-center gap-2">
            <span aria-hidden className="relative inline-block size-4 rounded bg-brand-bright/15">
              <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-brand-bright" />
            </span>
            Өдрийн хуваарьт орсон өдөр
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-brand-bright px-1 text-[10px] font-bold text-on-brand">
              {data ? dayOf(data.today) : ""}
            </span>
            Өнөөдөр
          </li>
          {seesPay && (
            <li className="flex items-center gap-2">
              Бүдэг хөлс — өмнөх үеэс өвлөгдсөн; шинээр бичвэл энэ үеэс эхлэн хэрэгжинэ
            </li>
          )}
        </ul>
      )}

      <AccountDrawer
        teacherId={account?.id ?? null}
        name={account?.name ?? ""}
        onClose={() => setAccount(null)}
        onSaved={(id) =>
          setData((d) =>
            d ? { ...d, rows: d.rows.map((r) => (r.teacherId === id ? { ...r, hasAccount: true } : r)) } : d,
          )
        }
      />
    </section>
  );
}

function SaveStatus({
  saving,
  errors,
  savedAt,
  onRetry,
}: {
  saving: boolean;
  errors: number;
  savedAt: number | null;
  onRetry: () => void;
}) {
  if (errors > 0)
    return (
      <span role="status" className="flex w-full items-center gap-1.5 text-sm font-semibold text-error sm:ml-auto sm:w-auto">
        <CircleAlert className="size-4" aria-hidden />
        {errors} нүд хадгалагдаагүй
        <Button variant="ghost" size="sm" onClick={onRetry}>
          <RotateCcw aria-hidden />
          Дахин оролдох
        </Button>
      </span>
    );
  if (saving)
    return (
      <span role="status" className="flex w-full items-center gap-1.5 text-sm text-ink-dim sm:ml-auto sm:w-auto">
        <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        Хадгалж байна
      </span>
    );
  if (savedAt)
    return (
      <span role="status" className="flex w-full items-center gap-1.5 text-sm text-success sm:ml-auto sm:w-auto">
        <CircleCheck className="size-4" aria-hidden />
        Хадгалагдсан
      </span>
    );
  return null;
}

"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Clock, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

interface DeadlineInfo {
  date: string;
  /** Даалгавар өгсөн хичээл (өмнөх хичээл) — байхгүй бол тохируулах зүйлгүй */
  lessonDate: string | null;
  /** Сонгож болох өдрүүд: өгсөн хичээлээс энэ хичээл хүртэл */
  days: string[];
  defaultDueAt: string;
  dueAt: string;
  allowLate: boolean;
  custom: boolean;
}

const WEEKDAY = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

/** UTC ISO → УБ-ын { огноо, «HH», «MM» } (24 цаг) */
function ubParts(iso: string) {
  const d = new Date(new Date(iso).getTime() + 8 * 3_600_000);
  return {
    day: d.toISOString().slice(0, 10),
    hh: String(d.getUTCHours()).padStart(2, "0"),
    mm: String(d.getUTCMinutes()).padStart(2, "0"),
  };
}
const dayText = (key: string) =>
  `${key.slice(5).replace("-", ".")} ${WEEKDAY[new Date(`${key}T12:00:00Z`).getUTCDay()]}`;

/**
 * Гэрийн даалгаврын хугацаа (эзэн 2026-11-05) — самбарын «Онлайн гэрийн даалгавар» мөрийн ард.
 * Teams шиг энгийн: өдөр (даалгавар өгсөн хичээлээс энэ хичээл хүртэл), цаг 24 цагаар (AM/PM үгүй),
 * «хоцорч илгээж болно» эсвэл «хугацаа дуусахад хаагдана».
 */
export default function DeadlineButton({ classId, date }: { classId: string; date: string }) {
  const [info, setInfo] = useState<DeadlineInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState("");
  const [hh, setHh] = useState("00");
  const [mm, setMm] = useState("00");
  const [allowLate, setAllowLate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api<DeadlineInfo>(`/classrooms/${encodeURIComponent(classId)}/homework-deadline?date=${date}`)
      .then((d) => alive && setInfo(d))
      .catch(() => alive && setInfo(null));
    return () => {
      alive = false;
    };
  }, [classId, date]);

  if (!info?.lessonDate || !info.days.length) return null;
  const now = ubParts(info.dueAt);

  function openDialog() {
    if (!info) return;
    const p = ubParts(info.dueAt);
    setDay(info.days.includes(p.day) ? p.day : info.days[info.days.length - 1]);
    setHh(p.hh);
    setMm(MINUTES.includes(p.mm) ? p.mm : "00");
    setAllowLate(info.allowLate);
    setError("");
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const next = await api<DeadlineInfo>(`/classrooms/${encodeURIComponent(classId)}/homework-deadline`, {
        method: "PUT",
        body: { date, dueDate: day, time: `${hh}:${mm}`, allowLate },
      });
      setInfo(next);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Хадгалж чадсангүй");
    } finally {
      setSaving(false);
    }
  }

  const select = "min-h-11 rounded-lg border border-line bg-bg px-2 text-base font-semibold tabular-nums text-ink sm:text-sm";

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={cn(
          "ml-1 inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-lg border px-2 align-middle text-xs font-semibold",
          info.custom ? "border-brand-bright/50 bg-brand-bright/10 text-brand-soft" : "border-line text-ink-dim hover:text-ink",
        )}
        aria-label={`Хугацаа ${dayText(now.day)} ${now.hh}:${now.mm}, өөрчлөх`}
      >
        <Clock className="size-3.5" aria-hidden />
        <span className="tabular-nums">
          {dayText(now.day)} {now.hh}:{now.mm}
        </span>
        {!info.allowLate && <span>хаагдана</span>}
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/40" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-[71] max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[26rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
            <div className="mb-3 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-base font-bold text-ink">Гэрийн даалгаврын хугацаа</Dialog.Title>
                <Dialog.Description className="text-xs text-ink-dim">
                  {dayText(info.lessonDate)}-ны хичээлд өгсөн даалгавар
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label="Хаах" className="-mr-2 -mt-1 inline-flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5">
                <X className="size-5" aria-hidden />
              </Dialog.Close>
            </div>

            <fieldset className="mb-4">
              <legend className="mb-1.5 text-xs font-semibold text-ink-dim">Өдөр</legend>
              <div className="flex flex-wrap gap-1.5">
                {info.days.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={day === d}
                    onClick={() => setDay(d)}
                    className={cn(
                      "min-h-11 rounded-lg border px-3 text-sm font-semibold tabular-nums",
                      day === d ? "border-brand-bright bg-brand-bright/10 text-brand-soft" : "border-line text-ink hover:border-ink/30",
                    )}
                  >
                    {dayText(d)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mb-4">
              <legend className="mb-1.5 text-xs font-semibold text-ink-dim">Цаг (24 цагаар)</legend>
              <div className="flex items-center gap-1.5">
                <label>
                  <span className="sr-only">Цаг</span>
                  <select value={hh} onChange={(e) => setHh(e.target.value)} className={select}>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="text-lg font-bold text-ink">:</span>
                <label>
                  <span className="sr-only">Минут</span>
                  <select value={mm} onChange={(e) => setMm(e.target.value)} className={select}>
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>

            <fieldset className="mb-4 space-y-1.5">
              <legend className="mb-1.5 text-xs font-semibold text-ink-dim">Хугацаа өнгөрвөл</legend>
              {[
                { v: true, title: "Илгээж болно", hint: "Хоцорсон гэж тэмдэглэгдэнэ" },
                { v: false, title: "Хаагдана", hint: "Хугацаа дуусмагц тест, зураг илгээх боломжгүй" },
              ].map((o) => (
                <label
                  key={String(o.v)}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2",
                    allowLate === o.v ? "border-brand-bright bg-brand-bright/10" : "border-line",
                  )}
                >
                  <input type="radio" name="allow-late" checked={allowLate === o.v} onChange={() => setAllowLate(o.v)} className="size-4 accent-[var(--brand-bright)]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{o.title}</span>
                    <span className="block text-xs text-ink-dim">{o.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {error && <p role="alert" className="mb-2 text-sm text-error">{error}</p>}
            <button
              type="button"
              onClick={save}
              disabled={saving || !day}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-on-brand disabled:opacity-60"
            >
              {saving && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
              Хадгалах
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

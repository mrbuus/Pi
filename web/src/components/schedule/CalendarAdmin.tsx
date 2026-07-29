"use client";

import { Palmtree } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  CALENDAR_TYPE_ICON,
  CALENDAR_TYPE_LABEL,
  CALENDAR_TYPES,
  todayUBKey,
  type CalendarDay,
} from "./types";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

const inputCls =
  "rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";
const primaryBtn =
  "rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition disabled:opacity-50";
const outlineBtn =
  "rounded-lg border border-line px-3 py-1.5 text-xs transition hover:border-brand disabled:opacity-50";

type FormState = {
  date: string;
  type: (typeof CALENDAR_TYPES)[number];
  title: string;
  note: string;
};

const EMPTY_FORM: FormState = {
  date: todayUBKey(),
  type: "HOLIDAY",
  title: "",
  note: "",
};

/**
 * ADMIN-ы сургалтын хуанли засварлагч — амралт/завсарлага/шалгалтын өдөр
 * нэмэх, засах, устгах. /schedule/days эндээс уншсан бичлэгүүдийг долоо
 * хоногийн хэв маягаас хасдаг тул энд оруулсан ХЭР ЗӨВ байх нь чухал.
 */
export default function CalendarAdmin() {
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<CalendarDay[]>("/calendar")
      .then(setDays)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  function startEdit(day: CalendarDay) {
    setEditingId(day.id);
    setForm({
      date: day.date.slice(0, 10),
      type: day.type as FormState["type"],
      title: day.title,
      note: day.note ?? "",
    });
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submit() {
    if (!form.title.trim()) {
      setMsg({ kind: "error", text: "Гарчиг заавал бөглөнө үү" });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      // note-ыг null-ээр илгээнэ (undefined биш) — эс бөгөөс засварлахдаа
      // хоослоход сервер "утга ирээгүй" гэж хуучин тэмдэглэлийг хэвээр үлдээнэ.
      const body = {
        date: form.date,
        type: form.type,
        title: form.title.trim(),
        note: form.note.trim() || null,
      };
      if (editingId) {
        await api(`/calendar/${editingId}`, { method: "PATCH", body });
        setMsg({ kind: "success", text: "✓ Хуанлийн бичлэг шинэчлэгдлээ" });
      } else {
        await api("/calendar", { method: "POST", body });
        setMsg({ kind: "success", text: "✓ Хуанлийн бичлэг нэмэгдлээ" });
      }
      cancelEdit();
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/calendar/${id}`, { method: "DELETE" });
      setArmedDelete(null);
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  const upcoming = days.filter((d) => d.date.slice(0, 10) >= todayUBKey());
  const past = days.filter((d) => d.date.slice(0, 10) < todayUBKey());

  return (
    <section className="rounded-2xl border border-line bg-panel p-6">
      <h2 className="mb-1 font-bold text-brand-soft">Сургалтын хуанли</h2>
      <p className="mb-4 text-xs text-ink-dim">
        Энд бүртгэсэн амралт/завсарлага/шалгалтын өдөр нь долоо хоногийн
        давтагддаг хуваариас автоматаар хасагдаж, &ldquo;хичээлгүй
        өдөр&rdquo; болно.
      </p>

      {msg && (
        <div
          role="status"
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            msg.kind === "error"
              ? "bg-error/10 text-error"
              : "bg-success/10 text-success"
          }`}
        >
          {msg.kind === "error" ? "⚠ " : "✓ "}
          {msg.text}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="cal-date" className="text-xs text-ink-dim">
            Огноо
          </label>
          <input
            id="cal-date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="cal-type" className="text-xs text-ink-dim">
            Төрөл
          </label>
          <select
            id="cal-type"
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({ ...f, type: e.target.value as FormState["type"] }))
            }
            className={inputCls}
          >
            {CALENDAR_TYPES.map((t) => (
              <option key={t} value={t}>
                {CALENDAR_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[160px] flex-1 flex-col gap-1">
          <label htmlFor="cal-title" className="text-xs text-ink-dim">
            Гарчиг
          </label>
          <input
            id="cal-title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Жишээ: Цагаан сарын амралт"
            className={inputCls}
          />
        </div>
        <div className="flex min-w-[160px] flex-1 flex-col gap-1">
          <label htmlFor="cal-note" className="text-xs text-ink-dim">
            Тэмдэглэл (сонголтоор)
          </label>
          <input
            id="cal-note"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className={inputCls}
          />
        </div>
        <button onClick={submit} disabled={saving} className={primaryBtn}>
          {saving ? "Хадгалж байна…" : editingId ? "Хадгалах" : "Нэмэх"}
        </button>
        {editingId && (
          <button onClick={cancelEdit} className={outlineBtn}>
            Цуцлах
          </button>
        )}
      </div>

      {loading && (
        <p className="animate-pulse text-sm text-ink-dim" role="status">
          Ачаалж байна…
        </p>
      )}
      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          ⚠ {error}
        </div>
      )}
      {!loading && !error && days.length === 0 && (
        <p className="text-sm text-ink-dim">Хуанлийн бичлэг алга байна</p>
      )}

      {!loading && !error && days.length > 0 && (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-dim">
                Одоогоос хойш
              </h3>
              <div className="space-y-2">
                {upcoming.map((d) => (
                  <CalendarRow
                    key={d.id}
                    day={d}
                    armed={armedDelete === d.id}
                    onEdit={() => startEdit(d)}
                    onArm={() => setArmedDelete(d.id)}
                    onCancelArm={() => setArmedDelete(null)}
                    onDelete={() => remove(d.id)}
                  />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-dim">
                Өнгөрсөн
              </h3>
              <div className="space-y-2 opacity-70">
                {past.map((d) => (
                  <CalendarRow
                    key={d.id}
                    day={d}
                    armed={armedDelete === d.id}
                    onEdit={() => startEdit(d)}
                    onArm={() => setArmedDelete(d.id)}
                    onCancelArm={() => setArmedDelete(null)}
                    onDelete={() => remove(d.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CalendarRow({
  day,
  armed,
  onEdit,
  onArm,
  onCancelArm,
  onDelete,
}: {
  day: CalendarDay;
  armed: boolean;
  onEdit: () => void;
  onArm: () => void;
  onCancelArm: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm">
      <span className="font-mono text-ink-dim">{day.date.slice(0, 10)}</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
        {(() => {
          const Icon = CALENDAR_TYPE_ICON[day.type] ?? Palmtree;
          return <Icon className="h-3.5 w-3.5" aria-hidden />;
        })()}
        {CALENDAR_TYPE_LABEL[day.type] ?? day.type}
      </span>
      <span className="font-semibold">{day.title}</span>
      {day.note && <span className="text-ink-dim">— {day.note}</span>}
      <div className="ml-auto flex gap-2">
        <button onClick={onEdit} className={outlineBtn}>
          ✎ Засах
        </button>
        {armed ? (
          <>
            <span className="text-xs text-error">Устгах уу?</span>
            <button
              onClick={onDelete}
              className="rounded-lg border border-error/40 px-3 py-1.5 text-xs font-semibold text-error transition hover:bg-error/10"
            >
              Тийм, устга
            </button>
            <button onClick={onCancelArm} className={outlineBtn}>
              Үгүй
            </button>
          </>
        ) : (
          <button
            onClick={onArm}
            className="rounded-lg border border-error/40 px-3 py-1.5 text-xs text-error transition hover:bg-error/10"
          >
            ✕ Устгах
          </button>
        )}
      </div>
    </div>
  );
}

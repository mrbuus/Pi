"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Palmtree,
  Pencil,
  Trash2,
} from "lucide-react";
import { useSection } from "@/components/students/progress/useSection";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";
import ClassScopePicker from "./special-days/ClassScopePicker";
import {
  dateRange,
  longDateLabel,
  scopeText,
  type ClassroomOption,
  type SpecialDay,
} from "./special-days/helpers";
import {
  CALENDAR_TYPE_ICON,
  CALENDAR_TYPE_LABEL,
  CALENDAR_TYPES,
  todayUBKey,
} from "./types";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

const inputCls =
  "min-h-11 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";
const primaryBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-bright px-4 text-sm font-bold text-on-brand transition disabled:opacity-50";
const outlineBtn =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold transition hover:border-brand disabled:opacity-50";
const dangerBtn =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-error/40 px-3 text-sm font-semibold text-error transition hover:bg-error/10";

type FormState = {
  date: string;
  /** Олон өдрийн амралт: сүүлийн өдөр (хоосон = зөвхөн нэг өдөр) */
  endDate: string;
  type: (typeof CALENDAR_TYPES)[number];
  title: string;
  note: string;
  allClasses: boolean;
  classroomIds: string[];
};

function emptyForm(): FormState {
  return {
    date: todayUBKey(),
    endDate: "",
    type: "HOLIDAY",
    title: "",
    note: "",
    allClasses: true,
    classroomIds: [],
  };
}

/**
 * Онцгой өдрийн жагсаалт ба маягт (амралт, завсарлага, шалгалтын өдөр).
 * «Онцгой өдөр» цонхонд (SpecialDaysDialog) харагдана. Бүртгэсэн өдөр нь
 * хуваариас БҮХ анги эсвэл сонгосон ангийн хичээлийг хасна.
 * `canEdit` худал бол зөвхөн жагсаалт харна (сервер хадгалахад 403 өгдөг).
 */
export default function CalendarAdmin({
  canEdit,
  onChanged,
}: {
  canEdit: boolean;
  onChanged?: () => void;
}) {
  const [msg, setMsg] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const {
    data: days,
    status,
    error,
    reload: load,
  } = useSection<SpecialDay[]>("/calendar", []);
  const { data: classrooms } = useSection<ClassroomOption[]>("/classrooms", []);
  const loading = status === "loading";

  const today = todayUBKey();
  const upcoming = useMemo(
    () => days.filter((d) => d.date.slice(0, 10) >= today),
    [days, today],
  );
  const past = useMemo(
    () => days.filter((d) => d.date.slice(0, 10) < today).reverse(),
    [days, today],
  );

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setMsg(null);
    setFormOpen(true);
  }

  function startEdit(day: SpecialDay) {
    setEditingId(day.id);
    setForm({
      date: day.date.slice(0, 10),
      endDate: "",
      type: day.type as FormState["type"],
      title: day.title,
      note: day.note ?? "",
      allClasses: day.classroomIds.length === 0,
      classroomIds: day.classroomIds,
    });
    setMsg(null);
    setFormOpen(true);
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(false);
  }

  function changed() {
    load();
    onChanged?.();
  }

  async function submit() {
    if (!form.title.trim()) {
      setMsg({ kind: "error", text: "Гарчиг заавал бөглөнө үү" });
      return;
    }
    if (!form.allClasses && form.classroomIds.length === 0) {
      setMsg({
        kind: "error",
        text: "Хамаарах ангиа сонгоно уу, эсвэл «Бүх анги»-г сонгоно уу",
      });
      return;
    }
    if (form.endDate && form.endDate < form.date) {
      setMsg({
        kind: "error",
        text: "Сүүлийн өдөр эхний өдрөөс хойш байх ёстой",
      });
      return;
    }
    setSaving(true);
    setMsg(null);
    // note-ыг null-ээр илгээнэ (undefined биш) — эс бөгөөс засварлахдаа
    // хоослоход сервер "утга ирээгүй" гэж хуучин тэмдэглэлийг хэвээр үлдээнэ.
    const base = {
      type: form.type,
      title: form.title.trim(),
      note: form.note.trim() || null,
      classroomIds: form.allClasses ? [] : form.classroomIds,
    };
    try {
      if (editingId) {
        await api(`/calendar/${editingId}`, {
          method: "PATCH",
          body: { ...base, date: form.date },
        });
        setMsg({ kind: "success", text: "Онцгой өдөр шинэчлэгдлээ" });
      } else {
        const dates = dateRange(form.date, form.endDate || form.date);
        let done = 0;
        try {
          for (const date of dates) {
            await api("/calendar", { method: "POST", body: { ...base, date } });
            done += 1;
          }
        } catch (e) {
          if (done > 0) changed();
          throw new Error(
            dates.length > 1
              ? `${longDateLabel(dates[done])}: ${errMsg(e)} (${done} өдөр нэмэгдсэн)`
              : errMsg(e),
          );
        }
        setMsg({
          kind: "success",
          text:
            dates.length > 1
              ? `${dates.length} өдөр нэмэгдлээ`
              : "Онцгой өдөр нэмэгдлээ",
        });
      }
      setEditingId(null);
      setForm(emptyForm());
      setFormOpen(false);
      changed();
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
      setMsg({ kind: "success", text: "Онцгой өдөр устгагдлаа" });
      changed();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  const rowProps = (d: SpecialDay) => ({
    day: d,
    canEdit,
    armed: armedDelete === d.id,
    onEdit: () => startEdit(d),
    onArm: () => setArmedDelete(d.id),
    onCancelArm: () => setArmedDelete(null),
    onDelete: () => remove(d.id),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-dim">
        Амралт, завсарлага, шалгалтын өдрийг бүртгэхэд бүх анги эсвэл сонгосон
        ангийн хичээл тэр өдөр хуваариас хасагдана.
      </p>

      {msg && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            msg.kind === "error"
              ? "bg-error/10 text-error"
              : "bg-success/10 text-success"
          }`}
        >
          {msg.kind === "error" ? (
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {msg.text}
        </div>
      )}

      {canEdit && !formOpen && (
        <button type="button" onClick={openNew} className={primaryBtn}>
          <CalendarPlus className="h-4 w-4" aria-hidden />
          Онцгой өдөр нэмэх
        </button>
      )}

      {canEdit && formOpen && (
        <div className="space-y-3 rounded-xl border border-line bg-panel p-4">
          <h3 className="font-bold text-ink">
            {editingId ? "Онцгой өдрийг засах" : "Шинэ онцгой өдөр"}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="cal-date" className="text-xs text-ink-dim">
                {editingId ? "Огноо" : "Эхлэх өдөр"}
              </label>
              <input
                id="cal-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            {!editingId && (
              <div className="flex flex-col gap-1">
                <label htmlFor="cal-end" className="text-xs text-ink-dim">
                  Сүүлийн өдөр (олон өдөр бол)
                </label>
                <input
                  id="cal-end"
                  type="date"
                  min={form.date}
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label htmlFor="cal-type" className="text-xs text-ink-dim">
                Төрөл
              </label>
              <select
                id="cal-type"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as FormState["type"],
                  }))
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
            <div className="flex flex-col gap-1">
              <label htmlFor="cal-title" className="text-xs text-ink-dim">
                Гарчиг
              </label>
              <input
                id="cal-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Жишээ: Цагаан сарын амралт"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="cal-note" className="text-xs text-ink-dim">
                Тэмдэглэл (сонголтоор)
              </label>
              <input
                id="cal-note"
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
                className={inputCls}
              />
            </div>
          </div>

          <ClassScopePicker
            classrooms={classrooms}
            all={form.allClasses}
            onAllChange={(allClasses) => setForm((f) => ({ ...f, allClasses }))}
            value={form.classroomIds}
            onChange={(classroomIds) =>
              setForm((f) => ({ ...f, classroomIds }))
            }
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className={primaryBtn}
            >
              {saving ? "Хадгалж байна" : editingId ? "Хадгалах" : "Нэмэх"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className={outlineBtn}
            >
              Цуцлах
            </button>
          </div>
        </div>
      )}

      {loading && <LoadingState rows={3} />}
      {error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && days.length === 0 && (
        <EmptyState
          icon={Palmtree}
          title="Онцгой өдөр бүртгээгүй байна"
          hint="Амралт, завсарлага эсвэл шалгалтын өдөр нэмбэл тухайн өдрийн хичээл хуваариас хасагдана."
        />
      )}

      {!loading && !error && days.length > 0 && (
        <div className="space-y-4">
          <section aria-label="Удахгүй болох онцгой өдрүүд">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-dim">
              Удахгүй
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-ink-dim">
                Удахгүй болох онцгой өдөр алга
              </p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((d) => (
                  <SpecialDayRow key={d.id} {...rowProps(d)} />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section aria-label="Өнгөрсөн онцгой өдрүүд">
              <button
                type="button"
                onClick={() => setShowPast((v) => !v)}
                aria-expanded={showPast}
                className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-dim hover:text-ink"
              >
                <ChevronDown
                  className={`h-4 w-4 transition ${showPast ? "rotate-180" : ""}`}
                  aria-hidden
                />
                Өнгөрсөн ({past.length})
              </button>
              {showPast && (
                <div className="mt-2 space-y-2 opacity-70">
                  {past.map((d) => (
                    <SpecialDayRow key={d.id} {...rowProps(d)} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SpecialDayRow({
  day,
  canEdit,
  armed,
  onEdit,
  onArm,
  onCancelArm,
  onDelete,
}: {
  day: SpecialDay;
  canEdit: boolean;
  armed: boolean;
  onEdit: () => void;
  onArm: () => void;
  onCancelArm: () => void;
  onDelete: () => void;
}) {
  const Icon = CALENDAR_TYPE_ICON[day.type] ?? Palmtree;
  return (
    <div className="rounded-xl border border-line bg-panel px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-bold text-ink">{longDateLabel(day.date)}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {CALENDAR_TYPE_LABEL[day.type] ?? day.type}
        </span>
      </div>
      <p className="mt-1 text-ink">
        <Meta
          items={[
            <span key="t" className="font-semibold">
              {day.title}
            </span>,
            scopeText(day),
            day.note,
          ]}
        />
      </p>
      {canEdit && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {armed ? (
            <>
              <span className="text-xs text-error">Устгах уу?</span>
              <button type="button" onClick={onDelete} className={dangerBtn}>
                Тийм, устга
              </button>
              <button
                type="button"
                onClick={onCancelArm}
                className={outlineBtn}
              >
                Үгүй
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onEdit} className={outlineBtn}>
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Засах
              </button>
              <button type="button" onClick={onArm} className={dangerBtn}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Устгах
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

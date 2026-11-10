"use client";

import { Check, DoorOpen, ListChecks, NotebookPen, Plus, Search, StickyNote, Trash2, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ubParts } from "@/components/TeacherDashboard/board/lib";
import { Meta } from "@/components/ui/Meta";
import { ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import AddToRoomSheet, { type AddMode } from "./AddToRoomSheet";
import TestSheet from "./TestSheet";
import { ROOM406_ID, fullName, shortClass, type VisitView } from "./types";
import { useVisits } from "./useVisits";

const COMMENT_MAX = 500;

/**
 * 406 нөхөх өрөө (эзэн 2026-11-08): хуваарьгүй, ямар ч өдөр. Эхэндээ хоосон;
 * ямар ч багш сурагч нэмж (нэрээр эсвэл ангиар), сурагч бүрт нөхсөн тест/сэдвийг
 * сонгоно (олныг зэрэг эсвэл нэг нэгээр), хүсвэл тайлбар бичнэ.
 */
export default function Room406View({ date, today }: { date: string; today: string }) {
  const r = useVisits(ROOM406_ID, date);
  const [addMode, setAddMode] = useState<AddMode | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [testFor, setTestFor] = useState<string[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const visits = useMemo(() => r.visits ?? [], [r.visits]);
  const added = useMemo(() => new Set(visits.map((v) => v.student.id)), [visits]);
  const future = date > today;
  const sel = visits.filter((v) => selected.has(v.id));
  const allOn = visits.length > 0 && visits.every((v) => selected.has(v.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const remove = async (v: VisitView) => {
    setConfirmId(null);
    r.removeLocal(v.id);
    setSelected((s) => {
      const n = new Set(s);
      n.delete(v.id);
      return n;
    });
    try {
      await api(`/makeup-visits/${encodeURIComponent(v.id)}`, { method: "DELETE" });
      toast.success(`${fullName(v.student)} хасагдлаа`);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Хасаж чадсангүй");
      r.reload();
    }
  };

  const onComment = (v: VisitView, text: string) => {
    r.patchLocal(v.id, (x) => ({ ...x, comment: text }));
    r.saveTyped(v.id, "comment", text.trim() === "" ? null : text);
  };

  const testVisits = testFor ? visits.filter((v) => testFor.includes(v.id)) : [];

  return (
    <div className="space-y-3 pb-24">
      <section className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-bright/10 text-brand">
          <DoorOpen className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="cyrillic-heading text-base font-bold text-ink">406 нөхөх өрөө</h2>
          <p className="text-sm text-ink-dim">Хуваарьгүй. Ангидаа хийж чадаагүй хичээлээ ямар ч өдөр ирж нөхнө</p>
        </div>
      </section>

      {future ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-dim">
          Ирээгүй өдөрт нөхөлт бүртгэхгүй, өнөөдрийг сонгоно уу
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAddMode("name")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-bright px-3 text-sm font-bold text-on-brand hover:opacity-90"
          >
            <Search className="size-4" aria-hidden />
            Нэрээр нэмэх
          </button>
          <button
            type="button"
            onClick={() => setAddMode("class")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-brand bg-surface px-3 text-sm font-bold text-brand-soft hover:bg-brand-bright/10"
          >
            <Users className="size-4" aria-hidden />
            Ангиар нэмэх
          </button>
        </div>
      )}

      {r.error && !r.visits ? (
        <ErrorState message={r.error} onRetry={r.reload} />
      ) : !r.visits ? (
        <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : visits.length === 0 ? (
        !future && (
          <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-line px-4 py-8 text-center">
            <p className="font-bold text-ink">Энэ өдөр 406-д нөхсөн сурагч алга</p>
            <p className="text-sm text-ink-dim">Ирсэн сурагчаа дээрх товчоор нэмээд, нөхсөн сэдвийг нь сонгоно</p>
          </div>
        )
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 px-1">
            <h3 className="text-sm font-bold text-ink">
              Нөхсөн сурагчид <span className="font-normal tabular-nums text-ink-dim">({visits.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => setSelected(allOn ? new Set() : new Set(visits.map((v) => v.id)))}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-soft hover:bg-brand-bright/10"
            >
              <ListChecks className="size-4" aria-hidden />
              {allOn ? "Бүгдийг болих" : "Бүгдийг сонгох"}
            </button>
          </div>
          <ul className="space-y-2" aria-label="406-д нөхсөн сурагчид">
            {visits.map((v) => {
              const on = selected.has(v.id);
              const showComment = editing[v.id] || !!v.comment;
              return (
                <li
                  key={v.id}
                  className={cn("rounded-xl border bg-surface p-2", on ? "border-brand-bright ring-1 ring-brand-bright/40" : "border-line")}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`${fullName(v.student)} сонгох`}
                      onClick={() => toggle(v.id)}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-ink/5"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-6 items-center justify-center rounded-md border",
                          on ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line",
                        )}
                      >
                        {on && <Check className="size-4" />}
                      </span>
                    </button>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="flex flex-wrap items-center gap-x-2">
                        <span className="cyrillic-tight min-w-0 truncate text-[15px] font-bold text-ink">{fullName(v.student)}</span>
                        <span className="rounded-md bg-brand-bright/10 px-1.5 text-xs font-bold text-brand-soft">
                          {v.homeClassroom ? shortClass(v.homeClassroom.name) : "Ангигүй"}
                        </span>
                      </p>
                      <p className="text-xs text-ink-dim">
                        <Meta items={[v.teacher.name, ubParts(v.createdAt).time]} />
                      </p>
                    </div>
                    {confirmId === v.id ? (
                      <span className="flex shrink-0 flex-col gap-1 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => void remove(v)}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-error/10 px-3 text-sm font-bold text-error hover:bg-error/15"
                        >
                          Хасах
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-ink hover:bg-ink/5"
                        >
                          Болих
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(v.id)}
                        aria-label={`${fullName(v.student)}-г хасах`}
                        title="Хасах"
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setTestFor([v.id])}
                    aria-label={v.tests.length ? `${fullName(v.student)}, нөхсөн сэдвийг өөрчлөх` : `${fullName(v.student)}, нөхсөн сэдэв сонгох`}
                    className={cn(
                      "mt-1.5 flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-lg px-2 py-1.5 text-left",
                      v.tests.length ? "bg-panel hover:bg-ink/[0.05]" : "border border-dashed border-brand text-brand-soft hover:bg-brand-bright/5",
                    )}
                  >
                    {v.tests.length ? (
                      v.tests.map((t) => (
                        <span
                          key={t.id ?? t.title}
                          className={cn(
                            "inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold",
                            t.testId ? "border-brand-bright/50 bg-brand-bright/10 text-brand-soft" : "border-line bg-surface text-ink",
                          )}
                        >
                          {!t.testId && <NotebookPen className="size-3.5 shrink-0 text-ink-dim" aria-hidden />}
                          <span className="min-w-0 truncate">{t.title}</span>
                          {t.result && (
                            <span className="shrink-0 tabular-nums text-xs font-bold text-ink">
                              {t.result.score}/{t.result.max}
                            </span>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                        <Plus className="size-4" aria-hidden />
                        Нөхсөн сэдэв сонгох
                      </span>
                    )}
                  </button>

                  {showComment ? (
                    <label className="mt-1.5 block">
                      <span className="sr-only">Тайлбар, {fullName(v.student)}</span>
                      <textarea
                        value={v.comment ?? ""}
                        onChange={(e) => onComment(v, e.target.value.slice(0, COMMENT_MAX))}
                        autoFocus={editing[v.id] && !v.comment}
                        rows={2}
                        placeholder="Тайлбар (заавал биш)"
                        className="block w-full resize-none rounded-lg border border-line bg-bg p-2.5 text-base sm:text-sm"
                      />
                    </label>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing((e) => ({ ...e, [v.id]: true }))}
                      className="mt-1 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-ink-dim hover:bg-ink/5 hover:text-ink"
                    >
                      <StickyNote className="size-4" aria-hidden />
                      Тайлбар нэмэх
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {sel.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-4 md:bottom-4 md:left-auto md:right-6 md:w-[28rem]">
          <div className="elev-3 flex items-center gap-2 rounded-2xl border border-line bg-surface p-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              aria-label="Сонголтыг болих"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5"
            >
              <X className="size-5" aria-hidden />
            </button>
            <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{sel.length} сурагч сонгосон</span>
            <button
              type="button"
              onClick={() => setTestFor(sel.map((v) => v.id))}
              className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-brand-bright px-4 text-sm font-bold text-on-brand hover:opacity-90"
            >
              <ListChecks className="size-4" aria-hidden />
              Сэдэв сонгох
            </button>
          </div>
        </div>
      )}

      <AddToRoomSheet
        open={addMode !== null}
        mode={addMode ?? "name"}
        onMode={setAddMode}
        onClose={() => setAddMode(null)}
        date={date}
        added={added}
        onAdded={(rows) => {
          r.add(rows);
          // Шинээр нэмсэн сурагчид сонгогдоно — шууд «Сэдэв сонгох» дарж болно
          setSelected((s) => new Set([...s, ...rows.map((x) => x.id)]));
        }}
      />

      {testFor && testVisits.length > 0 && (
        <TestSheet
          visits={testVisits}
          date={date}
          onClose={() => setTestFor(null)}
          onSaved={(rows) => {
            r.replace(rows);
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}

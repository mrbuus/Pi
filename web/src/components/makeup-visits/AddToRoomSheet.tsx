"use client";

import { Check, ChevronLeft, LoaderCircle, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/kit/drawer";
import { ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import StudentSearch from "./StudentSearch";
import { SKIP_TEXT, fullName, shortClass, type ClassOption, type ClassStudent, type CreateResult, type SearchHit, type VisitView } from "./types";

export type AddMode = "name" | "class";

/**
 * 406-д сурагч нэмэх: (1) нэрээр хайж, эсвэл (2) анги сонгоод хэдэн сурагчийг
 * зэрэг сонгож «Нэмэх». Ангийн жагсаалтад зөвхөн овог, нэр, анги.
 */
export default function AddToRoomSheet({
  open,
  mode,
  onMode,
  onClose,
  date,
  added,
  onAdded,
}: {
  open: boolean;
  mode: AddMode;
  onMode: (m: AddMode) => void;
  onClose: () => void;
  date: string;
  added: Set<string>;
  onAdded: (rows: VisitView[]) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const post = async (studentIds: string[]) => {
    const r = await api<CreateResult>("/makeup-visits", {
      method: "POST",
      body: { date, hostClassroomId: null, studentIds },
    });
    if (r.created.length) onAdded(r.created);
    return r;
  };

  const addOne = async (hit: SearchHit) => {
    setBusyId(hit.id);
    try {
      const r = await post([hit.id]);
      if (r.created.length) toast.success(`${fullName(hit)} нэмэгдлээ`);
      else if (r.skipped[0]) toast.message(`${fullName(hit)}: ${SKIP_TEXT[r.skipped[0].reason]}`);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Нэмж чадсангүй");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto h-[88dvh] w-full max-w-xl">
        <header className="border-b border-line px-4 pb-3 pt-2">
          <DrawerTitle className="cyrillic-heading text-lg font-bold text-ink">406-д сурагч нэмэх</DrawerTitle>
          <DrawerDescription className="sr-only">Нэрээр хайж эсвэл ангиар сонгож нэмнэ</DrawerDescription>
          <div role="tablist" aria-label="Нэмэх арга" className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-ink/[0.05] p-1">
            {(
              [
                ["name", "Нэрээр хайх", Search],
                ["class", "Ангиар", Users],
              ] as const
            ).map(([m, label, Icon]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => onMode(m)}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-bold",
                  mode === m ? "elev-1 bg-surface text-brand-soft" : "text-ink-dim hover:text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </header>
        {mode === "name" ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" data-vaul-no-drag>
            <StudentSearch added={added} busyId={busyId} onAdd={(h) => void addOne(h)} />
          </div>
        ) : (
          <ByClass added={added} onAdd={post} />
        )}
        {mode === "name" && (
          <footer className="border-t border-line px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-surface text-sm font-bold text-ink hover:bg-ink/5"
            >
              Болсон
            </button>
          </footer>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function ByClass({ added, onAdd }: { added: Set<string>; onAdd: (ids: string[]) => Promise<CreateResult> }) {
  const [classes, setClasses] = useState<ClassOption[] | null>(null);
  const [classError, setClassError] = useState("");
  const [cls, setCls] = useState<ClassOption | null>(null);
  const [students, setStudents] = useState<{ id: string; list: ClassStudent[] } | null>(null);
  const [studentError, setStudentError] = useState<{ id: string; msg: string } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    api<ClassOption[]>("/makeup-visits/classrooms")
      .then((d) => alive && (setClasses(d), setClassError("")))
      .catch((e) => alive && setClassError(e instanceof Error ? e.message : "Ангиуд ачаалагдсангүй"));
    return () => {
      alive = false;
    };
  }, [retry]);

  useEffect(() => {
    if (!cls) return;
    let alive = true;
    api<ClassStudent[]>(`/makeup-visits/classrooms/${encodeURIComponent(cls.id)}/students`)
      .then((list) => alive && setStudents({ id: cls.id, list }))
      .catch((e) => alive && setStudentError({ id: cls.id, msg: e instanceof Error ? e.message : "Сурагчид ачаалагдсангүй" }));
    return () => {
      alive = false;
    };
  }, [cls, retry]);

  if (!cls) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" data-vaul-no-drag>
        {classError && !classes ? (
          <ErrorState message={classError} onRetry={() => setRetry((r) => r + 1)} />
        ) : !classes ? (
          <div aria-busy="true" aria-label="Ачаалж байна" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <p className="mb-2 text-sm text-ink-dim">Анги сонгоно уу</p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {classes.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCls(c);
                      setPicked(new Set());
                    }}
                    className="flex min-h-14 w-full flex-col items-center justify-center rounded-xl border border-line bg-surface px-1 text-center hover:border-brand hover:bg-brand-bright/5"
                  >
                    <span className="text-[15px] font-bold text-ink">{shortClass(c.name)}</span>
                    <span className="text-[11px] tabular-nums text-ink-dim">{c.studentCount} сурагч</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }

  const list = students?.id === cls.id ? students.list : null;
  const selectable = (list ?? []).filter((s) => !added.has(s.id));
  const allOn = selectable.length > 0 && selectable.every((s) => picked.has(s.id));
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const submit = async () => {
    const ids = [...picked].filter((id) => !added.has(id));
    if (!ids.length) return;
    setBusy(true);
    try {
      const r = await onAdd(ids);
      if (r.created.length) toast.success(`${r.created.length} сурагч нэмэгдлээ`);
      if (r.skipped.length) toast.message(`${r.skipped.length} сурагч ${SKIP_TEXT[r.skipped[0].reason]}`);
      setPicked(new Set());
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Нэмж чадсангүй");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b border-line px-2 py-1.5">
        <button
          type="button"
          onClick={() => setCls(null)}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-ink hover:bg-ink/5"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Ангиуд
        </button>
        <span className="min-w-0 flex-1 truncate text-base font-bold text-ink">{shortClass(cls.name)}</span>
        {selectable.length > 0 && (
          <button
            type="button"
            onClick={() => setPicked(allOn ? new Set() : new Set(selectable.map((s) => s.id)))}
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-brand-soft hover:bg-brand-bright/10"
          >
            {allOn ? "Бүгдийг болих" : "Бүгдийг сонгох"}
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2" data-vaul-no-drag>
        {studentError?.id === cls.id && !list ? (
          <ErrorState message={studentError.msg} onRetry={() => setRetry((r) => r + 1)} />
        ) : !list ? (
          <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-1.5">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-dim">Энэ ангид сурагч алга</p>
        ) : (
          <ul className="space-y-1.5" aria-label={`${shortClass(cls.name)} ангийн сурагчид`}>
            {list.map((s) => {
              const isAdded = added.has(s.id);
              const on = picked.has(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isAdded || on}
                    disabled={isAdded}
                    onClick={() => toggle(s.id)}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left",
                      on ? "border-brand-bright bg-brand-bright/10" : "border-line bg-surface hover:bg-ink/[0.03]",
                      isAdded && "opacity-60",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md border",
                        on || isAdded ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line",
                      )}
                    >
                      {(on || isAdded) && <Check className="size-4" />}
                    </span>
                    <span className="cyrillic-tight min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{fullName(s)}</span>
                    <span className="shrink-0 text-xs text-ink-dim">{isAdded ? "Нэмсэн" : shortClass(s.classroom.name)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <footer className="border-t border-line px-4 py-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={picked.size === 0 || busy}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-bright text-sm font-bold text-on-brand hover:opacity-90 disabled:opacity-50"
        >
          {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {picked.size ? `Нэмэх (${picked.size})` : "Сурагч сонгоно уу"}
        </button>
      </footer>
    </>
  );
}

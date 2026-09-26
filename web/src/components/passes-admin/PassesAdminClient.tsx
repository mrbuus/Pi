"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Check,
  Pencil,
  Plus,
  Search,
  Ticket,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, PageHeader, SectionHeader } from "@/components/ui/Surface";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateBlock";

type PassScope = {
  all?: boolean;
  chapterIds?: string[];
  bookIds?: string[];
  testIds?: string[];
};

type PassRow = {
  id: string;
  name: string;
  durationDays: number;
  scope: PassScope;
  price: number | null;
  active: boolean;
  holdersCount: number;
};

type Holder = {
  id: string;
  startsAt: string;
  expiresAt: string;
  active: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    studentCode: string | null;
  };
};

type StudentResult = {
  id: string;
  firstName: string;
  lastName: string;
  studentCode: string | null;
};

type EditorValues = {
  name: string;
  durationDays: string;
  price: string;
  all: boolean;
  chapterIds: string;
  bookIds: string;
  testIds: string;
};

const EMPTY_EDITOR: EditorValues = {
  name: "",
  durationDays: "30",
  price: "",
  all: true,
  chapterIds: "",
  bookIds: "",
  testIds: "",
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Үйлдэл амжилтгүй боллоо. Дахин оролдоно уу.";
}

function idsFrom(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .join(", ")
    : "";
}

function editorFrom(pass: PassRow): EditorValues {
  return {
    name: pass.name,
    durationDays: String(pass.durationDays),
    price: pass.price === null ? "" : String(pass.price),
    all: pass.scope?.all === true,
    chapterIds: idsFrom(pass.scope?.chapterIds),
    bookIds: idsFrom(pass.scope?.bookIds),
    testIds: idsFrom(pass.scope?.testIds),
  };
}

function idList(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function scopeFrom(values: EditorValues): PassScope {
  if (values.all) return { all: true };
  const scope: PassScope = {};
  const chapterIds = idList(values.chapterIds);
  const bookIds = idList(values.bookIds);
  const testIds = idList(values.testIds);
  if (chapterIds.length) scope.chapterIds = chapterIds;
  if (bookIds.length) scope.bookIds = bookIds;
  if (testIds.length) scope.testIds = testIds;
  return scope;
}

function scopeSummary(scope: PassScope) {
  if (scope?.all) return "Бүх агуулга";
  const parts = [
    scope?.chapterIds?.length ? `${scope.chapterIds.length} бүлэг` : null,
    scope?.bookIds?.length ? `${scope.bookIds.length} ном` : null,
    scope?.testIds?.length ? `${scope.testIds.length} тест` : null,
  ].filter(Boolean);
  return parts.join(", ") || "Хамрах хүрээ тохируулаагүй";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function moneyLabel(value: number | null) {
  if (value === null) return "Дурын дүн";
  return `${new Intl.NumberFormat("mn-MN").format(value)} ₮`;
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialogRef.current
      ?.querySelector<HTMLElement>("button, input, textarea, select")
      ?.focus();
    return () => previous?.focus();
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex='-1'])",
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pass-dialog-title"
        onKeyDown={onKeyDown}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 elev-3 sm:rounded-2xl md:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id="pass-dialog-title" className="text-lg font-bold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Цонх хаах"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink-dim hover:bg-bg"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PassEditor({
  pass,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  pass: PassRow | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: EditorValues) => void;
}) {
  const [values, setValues] = useState(() =>
    pass ? editorFrom(pass) : EMPTY_EDITOR,
  );
  const [scopeError, setScopeError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scope = scopeFrom(values);
    if (!Object.keys(scope).length) {
      setScopeError(
        "Хамрах бүлэг, ном эсвэл тестийн ID оруулах эсвэл бүх агуулгыг сонгоно уу.",
      );
      return;
    }
    const durationDays = Number(values.durationDays);
    const price = values.price.trim() ? Number(values.price) : null;
    if (
      !Number.isInteger(durationDays) ||
      durationDays < 1 ||
      (price !== null && (!Number.isInteger(price) || price < 0))
    ) {
      setScopeError(
        "Хугацаа бүхэл тоо, дор хаяж 1 өдөр байна. Үнэ 0 эсвэл түүнээс их бүхэл тоо байна.",
      );
      return;
    }
    setScopeError(null);
    onSubmit({
      ...values,
      name: values.name.trim(),
      durationDays: String(durationDays),
      price: price === null ? "" : String(price),
    });
  }

  function setField<K extends keyof EditorValues>(
    key: K,
    value: EditorValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    if (scopeError) setScopeError(null);
  }

  const inputClass =
    "min-h-11 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-2 focus:outline-brand";

  return (
    <Dialog
      title={pass ? "Эрхийн мэдээлэл засах" : "Шинэ эрх үүсгэх"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1.5 text-sm font-semibold text-ink">
          <span>Нэр</span>
          <input
            className={inputClass}
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
            required
            maxLength={120}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            <span>Хүчинтэй хугацаа (өдөр)</span>
            <input
              className={inputClass}
              type="number"
              min={1}
              step={1}
              value={values.durationDays}
              onChange={(event) => setField("durationDays", event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            <span>Үнэ</span>
            <input
              className={inputClass}
              type="number"
              min={0}
              step={1}
              placeholder="Дурын дүн"
              value={values.price}
              onChange={(event) => setField("price", event.target.value)}
            />
          </label>
        </div>
        <fieldset className="space-y-3 rounded-xl border border-line p-4">
          <legend className="px-1 text-sm font-semibold text-ink">
            Хамрах хүрээ
          </legend>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={values.all}
              onChange={(event) => setField("all", event.target.checked)}
              className="h-5 w-5 accent-brand"
            />
            Бүх агуулгад нэвтрэх
          </label>
          {!values.all && (
            <div className="grid gap-3 sm:grid-cols-3">
              {(["chapterIds", "bookIds", "testIds"] as const).map((key) => (
                <label
                  key={key}
                  className="block space-y-1.5 text-sm font-medium text-ink"
                >
                  <span>
                    {key === "chapterIds"
                      ? "Бүлгийн ID"
                      : key === "bookIds"
                        ? "Номын ID"
                        : "Тестийн ID"}
                  </span>
                  <textarea
                    className={`${inputClass} min-h-20 resize-y`}
                    value={values[key]}
                    onChange={(event) => setField(key, event.target.value)}
                    placeholder="ID-уудыг таслал эсвэл шинэ мөрөөр"
                  />
                </label>
              ))}
            </div>
          )}
        </fieldset>
        {(scopeError || error) && (
          <p
            role="alert"
            className="rounded-xl border border-error/30 bg-error/5 p-3 text-sm text-error"
          >
            {scopeError || error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-bg"
          >
            Болих
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-on-brand disabled:opacity-60"
          >
            {saving
              ? "Хадгалж байна"
              : pass
                ? "Өөрчлөлт хадгалах"
                : "Эрх үүсгэх"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default function PassesAdminClient() {
  const [passes, setPasses] = useState<PassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorPass, setEditorPass] = useState<PassRow | null | undefined>(
    undefined,
  );
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedPass, setSelectedPass] = useState<PassRow | null>(null);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [holdersError, setHoldersError] = useState<string | null>(null);
  const [grantPass, setGrantPass] = useState<PassRow | null>(null);
  const [grantNote, setGrantNote] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(
    null,
  );
  const [confirmAction, setConfirmAction] = useState<
    | { kind: "delete"; pass: PassRow }
    | { kind: "revoke"; holder: Holder }
    | null
  >(null);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const searchSequence = useRef(0);

  const loadPasses = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setPasses(await api<PassRow[]>("/passes"));
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHolders = useCallback(async (pass: PassRow) => {
    setSelectedPass(pass);
    setHoldersLoading(true);
    setHoldersError(null);
    try {
      setHolders(
        await api<Holder[]>(`/passes/${encodeURIComponent(pass.id)}/holders`),
      );
    } catch (error) {
      setHoldersError(errorMessage(error));
      setHolders([]);
    } finally {
      setHoldersLoading(false);
    }
  }, []);

  useEffect(() => {
    let current = true;
    api<PassRow[]>("/passes")
      .then((result) => {
        if (current) setPasses(result);
      })
      .catch((error: unknown) => {
        if (current) setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    if (!grantPass || search.trim().length < 2) {
      return;
    }
    const sequence = ++searchSequence.current;
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError(null);
      api<StudentResult[]>(
        `/users/search?q=${encodeURIComponent(search.trim())}`,
      )
        .then((results) => {
          if (searchSequence.current === sequence) setStudents(results);
        })
        .catch((error: unknown) => {
          if (searchSequence.current === sequence)
            setSearchError(errorMessage(error));
        })
        .finally(() => {
          if (searchSequence.current === sequence) setSearchLoading(false);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [grantPass, search, searchAttempt]);

  async function savePass(values: EditorValues) {
    setSaving(true);
    setActionError(null);
    const payload = {
      name: values.name,
      durationDays: Number(values.durationDays),
      price: values.price === "" ? undefined : Number(values.price),
      scope: scopeFrom(values),
    };
    try {
      if (editorPass) {
        await api(`/passes/${encodeURIComponent(editorPass.id)}`, {
          method: "PATCH",
          body: payload,
        });
        setNotice({ kind: "success", text: "Эрхийн мэдээлэл шинэчлэгдлээ." });
      } else {
        await api("/passes", {
          method: "POST",
          body: { ...payload, active: true },
        });
        setNotice({ kind: "success", text: "Шинэ эрх үүслээ." });
      }
      setEditorPass(undefined);
      await loadPasses();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function setActive(pass: PassRow, active: boolean) {
    setActionError(null);
    try {
      await api(`/passes/${encodeURIComponent(pass.id)}`, {
        method: "PATCH",
        body: { active },
      });
      setNotice({
        kind: "success",
        text: active ? "Эрхийг идэвхжүүллээ." : "Эрхийг идэвхгүй болголоо.",
      });
      await loadPasses();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  async function runConfirmation() {
    if (!confirmAction) return;
    setSaving(true);
    setActionError(null);
    try {
      if (confirmAction.kind === "delete") {
        await api(`/passes/${encodeURIComponent(confirmAction.pass.id)}`, {
          method: "DELETE",
        });
        setNotice({ kind: "success", text: "Эрхийн тодорхойлолтыг устгалаа." });
        setSelectedPass(null);
        setHolders([]);
        await loadPasses();
      } else {
        await api(
          `/passes/grants/${encodeURIComponent(confirmAction.holder.id)}/revoke`,
          { method: "POST", body: { reason: revokeReason.trim() } },
        );
        setNotice({ kind: "success", text: "Олгосон эрхийг цуцаллаа." });
        setConfirmAction(null);
        setRevokeReason("");
        if (selectedPass) await loadHolders(selectedPass);
        await loadPasses();
      }
      setConfirmAction(null);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function grantToStudent() {
    if (!grantPass || !selectedStudent) return;
    setSaving(true);
    setActionError(null);
    try {
      await api(`/passes/${encodeURIComponent(grantPass.id)}/grant`, {
        method: "POST",
        body: {
          userId: selectedStudent.id,
          ...(grantNote.trim() ? { note: grantNote.trim() } : {}),
        },
      });
      setNotice({
        kind: "success",
        text: `${selectedStudent.lastName} ${selectedStudent.firstName} сурагчид эрх олголоо.`,
      });
      const activePass = grantPass;
      setGrantPass(null);
      setSearch("");
      setStudents([]);
      setSelectedStudent(null);
      setGrantNote("");
      await Promise.all([loadPasses(), loadHolders(activePass)]);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const editorOpen = editorPass !== undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 md:px-6 md:py-8">
      <PageHeader
        title="Эрхийн удирдлага"
        description="Эрхийн нөхцөл, идэвхтэй байдал болон сурагчдад олгосон эрхийг удирдана."
        actions={
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setEditorPass(null);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-on-brand"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Шинэ эрх
          </button>
        }
      />

      {notice && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${notice.kind === "success" ? "border-success/30 bg-success/5 text-success" : "border-error/30 bg-error/5 text-error"}`}
        >
          <p>{notice.text}</p>
          <button
            type="button"
            aria-label="Мэдэгдэл хаах"
            onClick={() => setNotice(null)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
      {actionError && editorPass === undefined && !confirmAction && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
        >
          <p>{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="min-h-8 rounded-lg px-2 font-semibold"
          >
            Хаах
          </button>
        </div>
      )}

      <Card>
        <SectionHeader
          icon={Ticket}
          title="Бүх эрх"
          hint={
            <span className="text-sm font-normal text-ink-dim">
              Идэвхгүй болон эзэмшигчтэй эрх мөн харагдана.
            </span>
          }
        />
        {loading ? (
          <LoadingState rows={4} label="Эрхийн жагсаалтыг ачаалж байна" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => void loadPasses()} />
        ) : passes.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="Одоогоор эрх үүсгээгүй байна"
            hint="Шинэ эрх үүсгэснээр үнэ, хугацаа, хамрах хүрээг тохируулж болно."
            action={
              <button
                type="button"
                onClick={() => setEditorPass(null)}
                className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-on-brand"
              >
                Эрх үүсгэх
              </button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-line text-xs text-ink-dim">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Эрх</th>
                    <th className="px-3 py-3 font-semibold">Хугацаа</th>
                    <th className="px-3 py-3 font-semibold">Үнэ</th>
                    <th className="px-3 py-3 font-semibold">Хамрах хүрээ</th>
                    <th className="px-3 py-3 font-semibold">Төлөв</th>
                    <th className="px-3 py-3 font-semibold">Эзэмшигч</th>
                    <th className="px-3 py-3 font-semibold">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {passes.map((pass) => (
                    <tr key={pass.id} className="align-top">
                      <td className="px-3 py-4 font-semibold text-ink">
                        {pass.name}
                      </td>
                      <td className="px-3 py-4">{pass.durationDays} өдөр</td>
                      <td className="px-3 py-4">{moneyLabel(pass.price)}</td>
                      <td className="px-3 py-4">{scopeSummary(pass.scope)}</td>
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${pass.active ? "bg-success/10 text-success" : "bg-bg text-ink-dim"}`}
                        >
                          {pass.active ? "Идэвхтэй" : "Идэвхгүй"}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <button
                          type="button"
                          onClick={() => void loadHolders(pass)}
                          className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 font-semibold text-brand hover:bg-brand/5"
                        >
                          <Users className="h-4 w-4" aria-hidden />
                          {pass.holdersCount}
                        </button>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActionError(null);
                              setEditorPass(pass);
                            }}
                            className="min-h-10 rounded-lg border border-line px-3 text-xs font-semibold hover:bg-bg"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                              Засах
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={!pass.active}
                            onClick={() => {
                              setGrantPass(pass);
                              setSearch("");
                              setSelectedStudent(null);
                              setStudents([]);
                              setActionError(null);
                            }}
                            className="min-h-10 rounded-lg border border-line px-3 text-xs font-semibold hover:bg-bg disabled:opacity-50"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <UserRoundPlus
                                className="h-3.5 w-3.5"
                                aria-hidden
                              />
                              Олгох
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void setActive(pass, !pass.active)}
                            className="min-h-10 rounded-lg border border-line px-3 text-xs font-semibold hover:bg-bg"
                          >
                            {pass.active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({ kind: "delete", pass })
                            }
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-error/30 px-3 text-xs font-semibold text-error hover:bg-error/5"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Устгах
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 md:hidden">
              {passes.map((pass) => (
                <article
                  key={pass.id}
                  className="rounded-xl border border-line bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-ink">{pass.name}</h3>
                      <p className="mt-1 text-sm text-ink-dim">
                        {pass.durationDays} өдөр — {moneyLabel(pass.price)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${pass.active ? "bg-success/10 text-success" : "bg-bg text-ink-dim"}`}
                    >
                      {pass.active ? "Идэвхтэй" : "Идэвхгүй"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-ink-dim">
                    Хамрах хүрээ: {scopeSummary(pass.scope)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadHolders(pass)}
                    className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-brand"
                  >
                    <Users className="h-4 w-4" aria-hidden />
                    {pass.holdersCount} эзэмшигч
                  </button>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setEditorPass(pass);
                      }}
                      className="min-h-11 rounded-xl border border-line px-3 text-sm font-semibold"
                    >
                      Засах
                    </button>
                    <button
                      type="button"
                      disabled={!pass.active}
                      onClick={() => {
                        setGrantPass(pass);
                        setSearch("");
                        setSelectedStudent(null);
                        setStudents([]);
                        setActionError(null);
                      }}
                      className="min-h-11 rounded-xl border border-line px-3 text-sm font-semibold disabled:opacity-50"
                    >
                      Сурагчид олгох
                    </button>
                    <button
                      type="button"
                      onClick={() => void setActive(pass, !pass.active)}
                      className="min-h-11 rounded-xl border border-line px-3 text-sm font-semibold"
                    >
                      {pass.active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ kind: "delete", pass })}
                      className="min-h-11 rounded-xl border border-error/30 px-3 text-sm font-semibold text-error"
                    >
                      Устгах
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </Card>

      {selectedPass && (
        <Card>
          <SectionHeader
            icon={Users}
            title={`Эзэмшигчид — ${selectedPass.name}`}
            actions={
              <button
                type="button"
                onClick={() => setSelectedPass(null)}
                className="min-h-11 rounded-xl border border-line px-3 text-sm font-semibold"
              >
                Хаах
              </button>
            }
          />
          {holdersLoading ? (
            <LoadingState
              rows={3}
              label="Эзэмшигчдийн жагсаалтыг ачаалж байна"
            />
          ) : holdersError ? (
            <ErrorState
              message={holdersError}
              onRetry={() => void loadHolders(selectedPass)}
            />
          ) : holders.length === 0 ? (
            <EmptyState
              title="Одоогоор эзэмшигч алга"
              hint="Энэ эрхийг хараахан сурагчид олгоогүй байна."
            />
          ) : (
            <div className="space-y-2">
              {holders.map((holder) => {
                const active = holder.active;
                return (
                  <div
                    key={holder.id}
                    className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-ink">
                        {holder.user.lastName} {holder.user.firstName}
                      </p>
                      <p className="text-sm text-ink-dim">
                        {holder.user.studentCode || "Кодгүй"} —{" "}
                        {dateLabel(holder.startsAt)}–
                        {dateLabel(holder.expiresAt)}
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${active ? "bg-success/10 text-success" : "bg-bg text-ink-dim"}`}
                      >
                        {active ? "Хүчинтэй" : "Хугацаа дууссан"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRevokeReason("");
                        setConfirmAction({ kind: "revoke", holder });
                      }}
                      className="min-h-11 rounded-xl border border-error/30 px-3 text-sm font-semibold text-error hover:bg-error/5"
                    >
                      Цуцлах
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {editorOpen && (
        <PassEditor
          pass={editorPass}
          saving={saving}
          error={actionError}
          onClose={() => {
            if (!saving) {
              setEditorPass(undefined);
              setActionError(null);
            }
          }}
          onSubmit={(values) => void savePass(values)}
        />
      )}

      {grantPass && (
        <Dialog
          title={`Сурагчид эрх олгох — ${grantPass.name}`}
          onClose={() => {
            if (!saving) {
              setGrantPass(null);
              setSearch("");
              setSelectedStudent(null);
              setGrantNote("");
              setActionError(null);
            }
          }}
        >
          <div className="space-y-4">
            <label className="block space-y-1.5 text-sm font-semibold text-ink">
              <span>Сурагчийг нэр эсвэл кодоор хайх</span>
              <span className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-bg px-3">
                <Search className="h-4 w-4 text-ink-dim" aria-hidden />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSelectedStudent(null);
                    setStudents([]);
                    setSearchError(null);
                  }}
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-2 outline-brand"
                  placeholder="Дор хаяж 2 тэмдэгт"
                  autoComplete="off"
                />
              </span>
            </label>
            {search.length > 0 && search.trim().length < 2 && (
              <p className="text-sm text-ink-dim">
                Хайхын тулд дор хаяж 2 тэмдэгт оруулна уу.
              </p>
            )}
            {searchLoading && (
              <LoadingState rows={2} label="Сурагч хайж байна" />
            )}
            {searchError && (
              <ErrorState
                message={searchError}
                onRetry={() => setSearchAttempt((attempt) => attempt + 1)}
              />
            )}
            {!searchLoading &&
              !searchError &&
              search.trim().length >= 2 &&
              students.length === 0 && (
                <EmptyState
                  title="Тохирох сурагч олдсонгүй"
                  hint="Нэр эсвэл сурагчийн кодыг шалгаад дахин хайна уу."
                />
              )}
            {!searchLoading && students.length > 0 && (
              <div
                className="max-h-56 space-y-2 overflow-y-auto"
                role="listbox"
                aria-label="Хайлтын үр дүн"
              >
                {students.map((student) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedStudent?.id === student.id}
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left ${selectedStudent?.id === student.id ? "border-brand bg-brand/5" : "border-line hover:bg-bg"}`}
                  >
                    <span>
                      <span className="block font-semibold text-ink">
                        {student.lastName} {student.firstName}
                      </span>
                      <span className="text-xs text-ink-dim">
                        {student.studentCode || "Кодгүй"}
                      </span>
                    </span>
                    {selectedStudent?.id === student.id && (
                      <Check className="h-5 w-5 text-success" aria-hidden />
                    )}
                  </button>
                ))}
              </div>
            )}
            {selectedStudent && (
              <p className="rounded-xl bg-bg p-3 text-sm text-ink">
                Сонгосон сурагч:{" "}
                <strong>
                  {selectedStudent.lastName} {selectedStudent.firstName}
                </strong>
              </p>
            )}
            <label className="block space-y-1.5 text-sm font-semibold text-ink">
              <span>Олголтын тэмдэглэл (сонголттой)</span>
              <textarea
                value={grantNote}
                onChange={(event) => setGrantNote(event.target.value)}
                maxLength={500}
                rows={2}
                className="w-full rounded-xl border border-line bg-surface p-3 font-normal"
              />
            </label>
            {actionError && (
              <p
                role="alert"
                className="rounded-xl border border-error/30 bg-error/5 p-3 text-sm text-error"
              >
                {actionError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setGrantPass(null)}
                disabled={saving}
                className="min-h-11 rounded-xl border border-line px-4 py-2 text-sm font-semibold"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={() => void grantToStudent()}
                disabled={!selectedStudent || saving}
                className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-on-brand disabled:opacity-50"
              >
                {saving ? "Олгож байна" : "Эрх олгох"}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {confirmAction && (
        <Dialog
          title={
            confirmAction.kind === "delete"
              ? "Эрхийн тодорхойлолтыг устгах уу?"
              : "Олгосон эрхийг цуцлах уу?"
          }
          onClose={() => {
            if (!saving) {
              setConfirmAction(null);
              setRevokeReason("");
              setActionError(null);
            }
          }}
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-ink-dim">
              {confirmAction.kind === "delete" ? (
                <>
                  <strong className="text-ink">
                    {confirmAction.pass.name}
                  </strong>{" "}
                  эрхийн тодорхойлолтыг устгах гэж байна. Өмнө нь сурагчид
                  олгосон бол сервер устгалтыг хориглоно. Шинэ эрх өгөхөө
                  зогсоох бол идэвхгүй болгоно уу.
                </>
              ) : (
                <>
                  <strong className="text-ink">
                    {confirmAction.holder.user.lastName}{" "}
                    {confirmAction.holder.user.firstName}
                  </strong>
                  -ийн эрхийг цуцална. Энэ олголт устсанаар нэвтрэх эрх шууд
                  дуусна. Цуцлах шалтгаан аудитад хадгалагдана.
                </>
              )}
            </p>
            {confirmAction.kind === "revoke" && (
              <label className="block space-y-1.5 text-sm font-semibold text-ink">
                <span>Цуцлах шалтгаан</span>
                <textarea
                  value={revokeReason}
                  onChange={(event) => setRevokeReason(event.target.value)}
                  maxLength={500}
                  rows={3}
                  required
                  className="w-full rounded-xl border border-line bg-surface p-3 font-normal"
                />
              </label>
            )}
            {actionError && (
              <p
                role="alert"
                className="rounded-xl border border-error/30 bg-error/5 p-3 text-sm text-error"
              >
                {actionError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setConfirmAction(null);
                  setActionError(null);
                }}
                disabled={saving}
                className="min-h-11 rounded-xl border border-line px-4 py-2 text-sm font-semibold"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={() => void runConfirmation()}
                disabled={
                  saving ||
                  (confirmAction.kind === "revoke" && !revokeReason.trim())
                }
                className="min-h-11 rounded-xl bg-error px-4 py-2 text-sm font-bold text-on-brand disabled:opacity-50"
              >
                {saving ? "Хүлээнэ үү" : "Баталгаажуулах"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

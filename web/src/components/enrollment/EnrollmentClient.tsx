"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import RequireRole from "@/components/nav/RequireRole";
import ConfirmCloseDialog from "./ConfirmCloseDialog";
import SubjectCard, { DraftState } from "./SubjectCard";
import {
  EnrollmentStatus,
  EnrollmentSubject,
  EnrollmentWindow,
  errMsg,
  STATUS_OPTIONS,
  SUBJECT_LABEL,
  SUBJECT_ORDER,
} from "./types";

function draftFrom(w: EnrollmentWindow): DraftState {
  return { status: w.status, availability: w.availability, note: w.note ?? "" };
}

function isDirty(saved: EnrollmentWindow, draft: DraftState): boolean {
  return (
    saved.status !== draft.status ||
    saved.availability !== draft.availability ||
    (saved.note ?? "") !== draft.note
  );
}

type ConfirmTarget =
  | { kind: "single"; subject: EnrollmentSubject }
  | { kind: "bulk"; status: EnrollmentStatus };

// Хичээл БҮР ("Математик" / "Нийгэм судлал" / "SAT") тусдаа бөгөөд ижил
// биш элсэлтийн цонхтой — эзний гол дүрэм (2026-07-27): энэ тохиргоог
// ЗӨВХӨН дата (EnrollmentWindow мөр тус бүр) удирдана, код руу
// hardcode хийхгүй. Багш+/Админ хичээл бүрийг бие даан, эсвэл "бүгдийг
// нэг дор" нэг товчоор нээж/хааж чадна.
export default function EnrollmentClient() {
  const [windows, setWindows] = useState<EnrollmentWindow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [lastBulkTarget, setLastBulkTarget] = useState<EnrollmentStatus | null>(null);

  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<EnrollmentWindow[]>("/enrollment-windows")
      .then((rows) => {
        setWindows(rows);
        // Хадгалаагүй ноорогтой картыг дахин ачаалж дарж бичихгүй — зөвхөн
        // цэвэр (dirty биш) картуудыг л шинэ серверийн утгатай синк хийнэ.
        setDrafts((prev) => {
          const next = { ...prev };
          for (const w of rows) {
            const existing = prev[w.subject];
            if (!existing || !isDirty(w, existing)) {
              next[w.subject] = draftFrom(w);
            }
          }
          return next;
        });
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const changeDraft = useCallback(
    (subject: EnrollmentSubject, patch: Partial<DraftState>) => {
      setDrafts((d) => ({
        ...d,
        [subject]: { ...d[subject], ...patch },
      }));
    },
    [],
  );

  const commit = useCallback(
    (subject: EnrollmentSubject) => {
      const saved = windows?.find((w) => w.subject === subject);
      const draft = drafts[subject];
      if (!saved || !draft) return;

      const body: Partial<EnrollmentWindow> = {};
      if (draft.status !== saved.status) body.status = draft.status;
      if (draft.availability !== saved.availability) body.availability = draft.availability;
      if (draft.note !== (saved.note ?? "")) body.note = draft.note;
      if (Object.keys(body).length === 0) return;

      setSaving((m) => ({ ...m, [subject]: true }));
      setSaveErrors((m) => {
        if (!(subject in m)) return m;
        const next = { ...m };
        delete next[subject];
        return next;
      });

      api<EnrollmentWindow>(`/enrollment-windows/${subject}`, {
        method: "PATCH",
        body,
      })
        .then((updated) => {
          setWindows((ws) =>
            ws?.map((w) => (w.subject === subject ? updated : w)) ?? ws,
          );
          setDrafts((d) => ({ ...d, [subject]: draftFrom(updated) }));
        })
        .catch((e) => setSaveErrors((m) => ({ ...m, [subject]: errMsg(e) })))
        .finally(() =>
          setSaving((m) => {
            const next = { ...m };
            delete next[subject];
            return next;
          }),
        );
    },
    [windows, drafts],
  );

  const requestSave = useCallback(
    (subject: EnrollmentSubject) => {
      const saved = windows?.find((w) => w.subject === subject);
      const draft = drafts[subject];
      if (!saved || !draft) return;
      // Зөвхөн "Дууссан" рүү ШИНЭЭР шилжих үед л баталгаажуулна — энэ бол
      // ирж буй хүсэлтийг зогсоох цорын ганц эргэлт буцалтгүй үйлдэл.
      if (draft.status === "CLOSED" && saved.status !== "CLOSED") {
        setConfirm({ kind: "single", subject });
        return;
      }
      commit(subject);
    },
    [windows, drafts, commit],
  );

  const discard = useCallback(
    (subject: EnrollmentSubject) => {
      const saved = windows?.find((w) => w.subject === subject);
      if (!saved) return;
      setDrafts((d) => ({ ...d, [subject]: draftFrom(saved) }));
      setSaveErrors((m) => {
        if (!(subject in m)) return m;
        const next = { ...m };
        delete next[subject];
        return next;
      });
    },
    [windows],
  );

  const applyBulk = useCallback(
    (status: EnrollmentStatus) => {
      if (!windows) return;
      setLastBulkTarget(status);
      setBulkBusy(true);
      setBulkError(null);
      Promise.all(
        windows.map((w) =>
          api<EnrollmentWindow>(`/enrollment-windows/${w.subject}`, {
            method: "PATCH",
            body: { status },
          }),
        ),
      )
        .then((updated) => {
          setWindows(updated);
          setDrafts((d) => {
            const next = { ...d };
            for (const w of updated) {
              // Ноорог дээрх бусад талбар (хамрах хэлбэр/тэмдэглэл) хэвээр
              // үлдэнэ — "бүгдийг нэг дор" зөвхөн төлвийг л нэгтгэдэг.
              next[w.subject] = { ...(d[w.subject] ?? draftFrom(w)), status: w.status };
            }
            return next;
          });
        })
        .catch((e) => setBulkError(errMsg(e)))
        .finally(() => setBulkBusy(false));
    },
    [windows],
  );

  const requestBulk = useCallback(
    (status: EnrollmentStatus) => {
      if (status === "CLOSED") {
        setConfirm({ kind: "bulk", status });
        return;
      }
      applyBulk(status);
    },
    [applyBulk],
  );

  function handleConfirm() {
    if (!confirm) return;
    if (confirm.kind === "single") commit(confirm.subject);
    else applyBulk(confirm.status);
    setConfirm(null);
  }

  const confirmCopy = useMemo(() => {
    if (!confirm) return null;
    if (confirm.kind === "single") {
      return {
        title: `«${SUBJECT_LABEL[confirm.subject]}»-ийг хаах уу?`,
        description: (
          <>
            Энэ хичээлийн элсэлт «Дууссан» болно. Нүүр хуудсаар шинэ
            хүсэлт ирэхээ зогсоох тул сайтар шалгаад баталгаажуулна уу.
          </>
        ),
      };
    }
    return {
      title: "Бүх хичээлийг хаах уу?",
      description: (
        <>
          Математик, Нийгэм судлал, SAT — 3 хичээлийн элсэлт БҮГД «Дууссан»
          болно. Ямар ч хичээлээр шинэ хүсэлт ирэхээ зогсоох тул сайтар
          шалгаад баталгаажуулна уу.
        </>
      ),
    };
  }, [confirm]);

  const busy = confirm?.kind === "bulk" ? bulkBusy : confirm?.kind === "single" ? !!saving[confirm.subject] : false;

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS"]}>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Элсэлтийн удирдлага</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Хичээл тус бүр (Математик · Нийгэм судлал · SAT) бие даан дүүрч,
          нээлттэй/хаалттай байх ёстой. Энд тохиргоог өөрчлөхөд нүүр
          хуудсанд шууд нөлөөлнө — хадгалахаасаа өмнө зочин юу харахыг
          доор урьдчилан харна уу.
        </p>
      </div>

      {loading && (
        <p className="animate-pulse text-sm text-ink-dim" role="status">
          Ачаалж байна…
        </p>
      )}

      {error && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          <span>error</span>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
          >
            Дахин ачаалах
          </button>
        </div>
      )}

      {!loading && !error && windows && (
        <>
          <div className="rounded-2xl border border-line bg-panel p-4">
            <h2 className="text-sm font-bold text-ink">Бүгдийг нэг дор</h2>
            <p className="mt-1 text-xs text-ink-dim">
              Бүх 3 хичээлийн элсэлтийн ТӨЛӨВИЙГ нэг товчоор адилхан
              болгоно. Хичээл тус бүрийн хамрах хэлбэр, тэмдэглэл хэвээр
              үлдэнэ — доорх картаар тус тусад нь тохируулна.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => requestBulk(opt.v)}
                  className="rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-50"
                >
                  Бүгдийг „{opt.t}” болгох
                </button>
              ))}
            </div>
            {bulkBusy && (
              <p className="mt-2 animate-pulse text-xs text-ink-dim" role="status">
                Хэрэгжүүлж байна…
              </p>
            )}
            {bulkError && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-error">
                <span>bulkError</span>
                <button
                  type="button"
                  onClick={() => lastBulkTarget && requestBulk(lastBulkTarget)}
                  className="rounded-lg border border-error/40 px-2 py-1 font-semibold transition hover:bg-error/10"
                >
                  Дахин оролдох
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {SUBJECT_ORDER.map((subject) => {
              const saved = windows.find((w) => w.subject === subject);
              const draft = drafts[subject];
              if (!saved || !draft) return null;
              return (
                <SubjectCard
                  key={subject}
                  subject={subject}
                  saved={saved}
                  draft={draft}
                  dirty={isDirty(saved, draft)}
                  saving={!!saving[subject]}
                  saveError={saveErrors[subject] ?? null}
                  onDraftChange={(patch) => changeDraft(subject, patch)}
                  onSave={() => requestSave(subject)}
                  onDiscard={() => discard(subject)}
                />
              );
            })}
          </div>
        </>
      )}

      <ConfirmCloseDialog
        open={!!confirm}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy?.description}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
    </RequireRole>
  );
}

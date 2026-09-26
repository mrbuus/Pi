"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Check, RotateCcw, UserRoundCheck } from "lucide-react";
import InfoHint from "@/components/ui/InfoHint";
import { Meta } from "@/components/ui/Meta";
import { Card } from "@/components/ui/Surface";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateBlock";
import { api } from "@/lib/api";

interface ExternalTeacher {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organization: string | null;
}

interface PendingTeacher extends ExternalTeacher {
  createdAt: string;
  rejectionReason?: string | null;
}

interface VerifiedTeacher extends ExternalTeacher {
  verifiedAt: string;
  note: string | null;
  groupCount: number;
}

type View = "pending" | "rejected" | "verified";

function displayName(teacher: ExternalTeacher) {
  return `${teacher.lastName} ${teacher.firstName}`.trim();
}

function localDate(value: string) {
  return new Date(value).toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ExternalTeachersPanel() {
  const [view, setView] = useState<View>("pending");
  const [pending, setPending] = useState<PendingTeacher[]>([]);
  const [verified, setVerified] = useState<VerifiedTeacher[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<PendingTeacher | null>(null);
  const [verificationNote, setVerificationNote] = useState("");
  const [rejectTarget, setRejectTarget] = useState<PendingTeacher | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reconsiderTarget, setReconsiderTarget] =
    useState<PendingTeacher | null>(null);
  const [unverifyTarget, setUnverifyTarget] = useState<VerifiedTeacher | null>(
    null,
  );
  const [confirmationText, setConfirmationText] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchLists = useCallback(
    async () =>
      Promise.all([
        api<{ role: string }>("/auth/me"),
        api<PendingTeacher[]>("/teacher-groups/unverified"),
        api<VerifiedTeacher[]>("/teacher-groups/verified"),
      ]),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, waiting, approved] = await fetchLists();
      setRole(me.role);
      setPending(waiting);
      setVerified(approved);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Багшийн мэдээллийг авч чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchLists]);

  useEffect(() => {
    let cancelled = false;
    void fetchLists()
      .then(([me, waiting, approved]) => {
        if (cancelled) return;
        setRole(me.role);
        setPending(waiting);
        setVerified(approved);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Багшийн мэдээллийг авч чадсангүй.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchLists]);

  const confirmVerification = async () => {
    if (!verifyTarget) return;
    setBusy(true);
    setError(null);
    try {
      await api(
        `/teacher-groups/verify/${encodeURIComponent(verifyTarget.id)}`,
        {
          method: "PUT",
          body: { note: verificationNote.trim() || undefined },
        },
      );
      setVerifyTarget(null);
      setVerificationNote("");
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Багшийг баталгаажуулж чадсангүй.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmUnverify = async () => {
    if (!unverifyTarget || confirmationText.trim() !== "ЦУЦЛАХ") return;
    setBusy(true);
    setError(null);
    try {
      await api(
        `/teacher-groups/unverify/${encodeURIComponent(unverifyTarget.id)}`,
        { method: "PUT" },
      );
      setUnverifyTarget(null);
      setConfirmationText("");
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Баталгаажуулалтыг цуцалж чадсангүй.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmRejection = async () => {
    if (!rejectTarget || !rejectionReason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(
        `/teacher-groups/reject/${encodeURIComponent(rejectTarget.id)}`,
        { method: "PUT", body: { reason: rejectionReason.trim() } },
      );
      setRejectTarget(null);
      setRejectionReason("");
      setView("rejected");
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Хүсэлтийг татгалзаж чадсангүй.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmReconsideration = async () => {
    if (!reconsiderTarget) return;
    setBusy(true);
    setError(null);
    try {
      await api(
        `/teacher-groups/reconsider/${encodeURIComponent(reconsiderTarget.id)}`,
        { method: "PUT" },
      );
      setReconsiderTarget(null);
      setView("pending");
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Хүсэлтийг дахин шалгахад шилжүүлж чадсангүй.",
      );
    } finally {
      setBusy(false);
    }
  };

  const pendingRequests = pending.filter((teacher) => !teacher.rejectionReason);
  const rejectedRequests = pending.filter((teacher) => !!teacher.rejectionReason);

  return (
    <section className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Гадны багш</h2>
          <p className="mt-1 text-sm text-ink-dim">
            Гадны багшийн бүртгэлийг хянаж, баталгаажуулалтыг удирдана.
          </p>
        </div>
        <InfoHint label="Гадны багшийн эрхийн тухай">
          Баталгаажаагүй гадны багш шинэ бүлэг үүсгэх боломжгүй. Сурагчид
          баталгаажаагүй багшийн бүлэгт нэгдэх боломжгүй.
        </InfoHint>
      </div>

      <div
        role="tablist"
        aria-label="Гадны багшийн жагсаалт"
        className="flex gap-2 border-b border-line"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "pending"}
          onClick={() => setView("pending")}
          className={`min-h-11 border-b-2 px-4 text-sm font-medium ${view === "pending" ? "border-brand text-brand" : "border-transparent text-ink-dim hover:text-ink"}`}
        >
          Хүлээгдэж буй{" "}
          <span className="ml-1 tabular-nums">{pendingRequests.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "rejected"}
          onClick={() => setView("rejected")}
          className={`min-h-11 border-b-2 px-4 text-sm font-medium ${view === "rejected" ? "border-brand text-brand" : "border-transparent text-ink-dim hover:text-ink"}`}
        >
          Татгалзсан{" "}
          <span className="ml-1 tabular-nums">{rejectedRequests.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "verified"}
          onClick={() => setView("verified")}
          className={`min-h-11 border-b-2 px-4 text-sm font-medium ${view === "verified" ? "border-brand text-brand" : "border-transparent text-ink-dim hover:text-ink"}`}
        >
          Баталгаажсан{" "}
          <span className="ml-1 tabular-nums">{verified.length}</span>
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading ? (
        <LoadingState rows={3} label="Гадны багшийн жагсаалт ачаалж байна" />
      ) : error ? null : view === "pending" ? (
        pendingRequests.length === 0 ? (
          <EmptyState
            icon={UserRoundCheck}
            title="Хүлээгдэж буй бүртгэл алга"
            hint="Шинэ гадны багш бүртгүүлэхэд энд харагдана."
          />
        ) : (
          <div className="grid gap-3">
            {pendingRequests.map((teacher) => (
              <Card
                key={teacher.id}
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <h3 className="font-semibold text-ink">
                    {displayName(teacher)}
                  </h3>
                  <p className="break-all text-sm text-ink-dim">
                    {teacher.email}
                  </p>
                  {teacher.organization && (
                    <p className="flex items-center gap-1.5 text-sm text-ink-dim">
                      <Building2 aria-hidden size={15} /> {teacher.organization}
                    </p>
                  )}
                  <p className="text-xs text-ink-dim">
                    Бүртгүүлсэн: {localDate(teacher.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setVerificationNote("");
                      setVerifyTarget(teacher);
                    }}
                    className="min-h-11 shrink-0 rounded-lg bg-brand px-4 font-medium text-on-brand hover:bg-brand/90"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Check aria-hidden size={16} /> Баталгаажуулах
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setRejectionReason("");
                      setRejectTarget(teacher);
                    }}
                    className="min-h-11 shrink-0 rounded-lg border border-error/30 px-4 font-medium text-error hover:bg-error/10"
                  >
                    Татгалзах
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : view === "rejected" ? (
        rejectedRequests.length === 0 ? (
          <EmptyState
            icon={UserRoundCheck}
            title="Татгалзсан хүсэлт алга"
            hint="Татгалзсан бүртгэлүүд шалтгаантайгаа энд харагдана."
          />
        ) : (
          <div className="grid gap-3">
            {rejectedRequests.map((teacher) => (
              <Card
                key={teacher.id}
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <h3 className="font-semibold text-ink">
                    {displayName(teacher)}
                  </h3>
                  <p className="break-all text-sm text-ink-dim">{teacher.email}</p>
                  {teacher.organization && (
                    <p className="text-sm text-ink-dim">{teacher.organization}</p>
                  )}
                  <p className="text-sm text-error">
                    Шалтгаан: {teacher.rejectionReason}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReconsiderTarget(teacher)}
                  className="min-h-11 shrink-0 rounded-lg border border-line px-4 font-medium hover:bg-bg"
                >
                  Хүлээгдэж буй руу буцаах
                </button>
              </Card>
            ))}
          </div>
        )
      ) : verified.length === 0 ? (
        <EmptyState
          icon={UserRoundCheck}
          title="Баталгаажсан багш алга"
          hint="Баталгаажуулсан гадны багш энд бүртгэгдэнэ."
        />
      ) : (
        <div className="grid gap-3">
          {verified.map((teacher) => (
            <Card
              key={teacher.id}
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <h3 className="font-semibold text-ink">
                  {displayName(teacher)}
                </h3>
                <p className="break-all text-sm text-ink-dim">
                  {teacher.email}
                </p>
                {teacher.organization && (
                  <p className="flex items-center gap-1.5 text-sm text-ink-dim">
                    <Building2 aria-hidden size={15} /> {teacher.organization}
                  </p>
                )}
                <p className="text-sm text-ink-dim">
                  <Meta
                    items={[
                      `Баталгаажсан: ${localDate(teacher.verifiedAt)}`,
                      `Бүлэг: ${teacher.groupCount}`,
                    ]}
                  />
                </p>
                {teacher.note && (
                  <p className="text-sm text-ink-dim">
                    Тэмдэглэл: {teacher.note}
                  </p>
                )}
              </div>
              {role === "ADMIN" && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setConfirmationText("");
                    setUnverifyTarget(teacher);
                  }}
                  className="min-h-11 shrink-0 rounded-lg border border-error/30 px-4 font-medium text-error hover:bg-error/10"
                >
                  <span className="inline-flex items-center gap-2">
                    <RotateCcw aria-hidden size={16} /> Баталгаажуулалт цуцлах
                  </span>
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {verifyTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy)
              setVerifyTarget(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-teacher-title"
            className="w-full max-w-lg space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-xl"
          >
            <div>
              <h2 id="verify-teacher-title" className="text-lg font-semibold">
                {displayName(verifyTarget)} багшийг баталгаажуулах уу?
              </h2>
              <p className="mt-1 text-sm text-ink-dim">
                {verifyTarget.email}
                {verifyTarget.organization
                  ? ` | ${verifyTarget.organization}`
                  : ""}
              </p>
            </div>
            <label
              htmlFor="verification-note"
              className="block text-sm font-medium"
            >
              Тэмдэглэл (сонголттой)
            </label>
            <textarea
              id="verification-note"
              maxLength={500}
              rows={3}
              value={verificationNote}
              onChange={(event) => setVerificationNote(event.target.value)}
              className="w-full rounded-lg border border-line bg-surface p-3"
            />
            {error && <ErrorState message={error} />}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setVerifyTarget(null)}
                className="min-h-11 rounded-lg border border-line px-4 hover:bg-bg"
              >
                Болих
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmVerification()}
                className="min-h-11 rounded-lg bg-brand px-4 text-on-brand hover:bg-brand/90 disabled:opacity-60"
              >
                {busy ? "Баталгаажуулж байна" : "Баталгаажуулах"}
              </button>
            </div>
          </section>
        </div>
      )}

      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy)
              setRejectTarget(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-teacher-title"
            className="w-full max-w-lg space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-xl"
          >
            <div>
              <h2 id="reject-teacher-title" className="text-lg font-semibold">
                {displayName(rejectTarget)} багшийн хүсэлтээс татгалзах уу?
              </h2>
              <p className="mt-1 text-sm text-ink-dim">
                {rejectTarget.email}
                {rejectTarget.organization
                  ? ` | ${rejectTarget.organization}`
                  : ""}
              </p>
            </div>
            <label
              htmlFor="rejection-reason"
              className="block text-sm font-medium"
            >
              Татгалзах шалтгаан
            </label>
            <textarea
              id="rejection-reason"
              maxLength={450}
              rows={3}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              className="w-full rounded-lg border border-line bg-surface p-3"
              required
            />
            {error && <ErrorState message={error} />}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setRejectTarget(null)}
                className="min-h-11 rounded-lg border border-line px-4 hover:bg-bg"
              >
                Болих
              </button>
              <button
                type="button"
                disabled={busy || !rejectionReason.trim()}
                onClick={() => void confirmRejection()}
                className="min-h-11 rounded-lg bg-error px-4 text-on-error hover:bg-error/90 disabled:opacity-60"
              >
                {busy ? "Хүсэлтийг татгалзаж байна" : "Шалтгаантай татгалзах"}
              </button>
            </div>
          </section>
        </div>
      )}

      {reconsiderTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy)
              setReconsiderTarget(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reconsider-teacher-title"
            className="w-full max-w-lg space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-xl"
          >
            <div>
              <h2
                id="reconsider-teacher-title"
                className="text-lg font-semibold"
              >
                Хүсэлтийг дахин шалгах уу?
              </h2>
              <p className="mt-1 text-sm text-ink-dim">
                {displayName(reconsiderTarget)} багшийн бүртгэл хүлээгдэж буй
                жагсаалт руу буцна.
              </p>
              <p className="mt-2 rounded-lg bg-bg p-3 text-sm">
                Өмнөх шалтгаан: {reconsiderTarget.rejectionReason}
              </p>
            </div>
            {error && <ErrorState message={error} />}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setReconsiderTarget(null)}
                className="min-h-11 rounded-lg border border-line px-4 hover:bg-bg"
              >
                Болих
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmReconsideration()}
                className="min-h-11 rounded-lg bg-brand px-4 text-on-brand hover:bg-brand/90 disabled:opacity-60"
              >
                {busy ? "Буцааж байна" : "Дахин шалгах"}
              </button>
            </div>
          </section>
        </div>
      )}

      {unverifyTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy)
              setUnverifyTarget(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="unverify-teacher-title"
            className="w-full max-w-lg space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-xl"
          >
            <div>
              <h2 id="unverify-teacher-title" className="text-lg font-semibold">
                Баталгаажуулалтыг цуцлах уу?
              </h2>
              <p className="mt-1 text-sm text-ink-dim">
                {displayName(unverifyTarget)} багшид шинэ бүлэг үүсгэх эрх
                хаагдана.
              </p>
            </div>
            <label
              htmlFor="unverify-confirm"
              className="block text-sm font-medium"
            >
              Баталгаажуулахын тулд ЦУЦЛАХ гэж бичнэ үү
            </label>
            <input
              id="unverify-confirm"
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-line bg-surface px-3"
              autoComplete="off"
            />
            {error && <ErrorState message={error} />}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setUnverifyTarget(null)}
                className="min-h-11 rounded-lg border border-line px-4 hover:bg-bg"
              >
                Болих
              </button>
              <button
                type="button"
                disabled={busy || confirmationText.trim() !== "ЦУЦЛАХ"}
                onClick={() => void confirmUnverify()}
                className="min-h-11 rounded-lg bg-error px-4 text-on-error hover:bg-error/90 disabled:opacity-60"
              >
                {busy ? "Цуцалж байна" : "Баталгаажуулалтыг цуцлах"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

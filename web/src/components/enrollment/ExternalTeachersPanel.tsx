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
}

interface VerifiedTeacher extends ExternalTeacher {
  verifiedAt: string;
  note: string | null;
  groupCount: number;
}

type View = "pending" | "verified";

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
          <span className="ml-1 tabular-nums">{pending.length}</span>
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
        pending.length === 0 ? (
          <EmptyState
            icon={UserRoundCheck}
            title="Хүлээгдэж буй бүртгэл алга"
            hint="Шинэ гадны багш бүртгүүлэхэд энд харагдана."
          />
        ) : (
          <div className="grid gap-3">
            {pending.map((teacher) => (
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

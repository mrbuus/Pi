"use client";

import { useCallback, useEffect, useState } from "react";
import { MoreVertical } from "lucide-react";
import RequireRole from "@/components/nav/RequireRole";
import { Meta } from "@/components/ui/Meta";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";

interface Classroom {
  id: string;
  name: string;
  type: string;
  grade?: number;
  teacher?: { firstName: string; lastName: string };
  _count?: { enrollments: number };
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

export default function ClassroomsClient() {
  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [disbandTarget, setDisbandTarget] = useState<Classroom | null>(null);
  const [disbandConfirmText, setDisbandConfirmText] = useState("");
  const [disbanding, setDisbanding] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<Classroom[]>("/classrooms")
      .then(setClassrooms)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const handleDisbandClick = (classroom: Classroom) => {
    setDisbandTarget(classroom);
    setDisbandConfirmText("");
    setOpenMenu(null);
  };

  const handleDisbandConfirm = async () => {
    if (!disbandTarget || disbandConfirmText !== disbandTarget.name) {
      setMsg({ kind: "error", text: "Ангийн нэр таарахгүй байна" });
      return;
    }

    setDisbanding(true);
    try {
      await api(`/classrooms/${disbandTarget.id}/disband`, { method: "POST", body: {} });
      setMsg({ kind: "success", text: "Анги тарасан" });
      setDisbandTarget(null);
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setDisbanding(false);
    }
  };

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold">Ангиуд</h1>
          <p className="mt-1 text-sm text-ink-dim">
            Та ангиудыг удирдан, сурагчдыг сольж, ангийг тараавал болно.
          </p>
        </div>

        {loading && <LoadingState rows={3} label="Ачаалж байна" />}

        {error && (
          <ErrorState
            message={error}
            onRetry={load}
          />
        )}

        {!loading && !error && (!classrooms || classrooms.length === 0) && (
          <EmptyState title="Анги алга байна" />
        )}

        {!loading && !error && classrooms && classrooms.length > 0 && (
          <div className="space-y-2">
            {classrooms.map((classroom) => (
              <div
                key={classroom.id}
                className="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{classroom.name}</div>
                  {classroom.teacher && (
                    <p className="mt-0.5 text-xs text-ink-dim">
                      <Meta
                        items={[
                          `${classroom.teacher.firstName} ${classroom.teacher.lastName}`,
                          `${classroom._count?.enrollments ?? 0} сурагч`,
                        ]}
                      />
                    </p>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === classroom.id ? null : classroom.id)}
                    className="rounded-lg p-2 transition hover:bg-bg"
                    aria-label={`${classroom.name}-ийн цэс`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {openMenu === classroom.id && (
                    <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-line bg-surface p-1 shadow-lg">
                      <button
                        onClick={() => handleDisbandClick(classroom)}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-error transition hover:bg-error/10"
                      >
                        Анги тараах
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {msg && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              msg.kind === "error"
                ? "bg-error/10 text-error"
                : "bg-success/10 text-success"
            }`}
            role="status"
          >
            {msg.text}
          </div>
        )}

        {disbandTarget && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-xl">
              <h2 className="text-lg font-bold">«{disbandTarget.name}» ангийг тараах уу?</h2>
              <p className="mt-2 text-sm text-ink-dim">
                Энэ анги дээрх {disbandTarget._count?.enrollments ?? 0} сурагч бүгд ангигаас гарна.
                Баталгаажуулахын тулд ангийн нэрийг дараа бичнэ үү.
              </p>

              <input
                type="text"
                value={disbandConfirmText}
                onChange={(e) => setDisbandConfirmText(e.target.value)}
                placeholder={disbandTarget.name}
                className="mt-4 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                disabled={disbanding}
              />

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setDisbandTarget(null)}
                  className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:border-brand disabled:opacity-50"
                  disabled={disbanding}
                >
                  Цуцлах
                </button>
                <button
                  onClick={handleDisbandConfirm}
                  className="flex-1 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-on-brand transition disabled:opacity-50"
                  disabled={disbanding || disbandConfirmText !== disbandTarget.name}
                >
                  {disbanding ? "Тараж байна…" : "Тараах"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireRole>
  );
}

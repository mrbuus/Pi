"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import GoalCard from "./GoalCard";
import GoalForm from "./GoalForm";
import ProgressSummary from "./ProgressSummary";
import { STATUS_ORDER_FOR_SORT } from "./statusMeta";
import type { Goal, GoalFormValues, GoalStatus } from "./types";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/** /app/goals хуудасны үндсэн клиент — сурагч ЗӨВХӨН ӨӨРИЙН зорилгыг
 * нэмэх/засах/дуусгах/устгах боломжтой. Багшийн жилийн төлөвлөгчийн
 * (planner) сурагчийн жижиг хувилбар. */
export default function GoalsClient() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api<Goal[]>("/goals")
      .then(setGoals)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(values: GoalFormValues) {
    const created = await api<Goal>("/goals", {
      method: "POST",
      body: {
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        targetDate: values.targetDate || undefined,
        subject: values.subject || undefined,
      },
    });
    setGoals((prev) => [...prev, created]);
  }

  async function handleStatusChange(id: string, status: GoalStatus) {
    const prev = goals;
    setGoals((gs) => gs.map((g) => (g.id === id ? { ...g, status } : g)));
    try {
      await api<Goal>(`/goals/${id}`, { method: "PATCH", body: { status } });
    } catch (e) {
      setGoals(prev);
      setError(errMsg(e));
    }
  }

  async function handleEdit(
    id: string,
    values: { title: string; description: string; targetDate: string },
  ) {
    try {
      const updated = await api<Goal>(`/goals/${id}`, {
        method: "PATCH",
        body: {
          title: values.title,
          description: values.description || undefined,
          targetDate: values.targetDate || null,
        },
      });
      setGoals((gs) => gs.map((g) => (g.id === id ? updated : g)));
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function handleDelete(id: string) {
    const prev = goals;
    setGoals((gs) => gs.filter((g) => g.id !== id));
    try {
      await api(`/goals/${id}`, { method: "DELETE" });
    } catch (e) {
      setGoals(prev);
      setError(errMsg(e));
    }
  }

  const sorted = [...goals].sort((a, b) => {
    const byStatus = STATUS_ORDER_FOR_SORT[a.status] - STATUS_ORDER_FOR_SORT[b.status];
    if (byStatus !== 0) return byStatus;
    if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate);
    if (a.targetDate) return -1;
    if (b.targetDate) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">Миний зорилго</h1>
      <p className="text-sm text-ink-dim">
        Өөрийн сурлагын зорилтуудаа тодорхойлж, хугацаатай тавьж, явцаа хянана уу.
      </p>

      {error && (
        <div className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <ProgressSummary goals={goals} />

      <GoalForm onCreate={handleCreate} />

      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Бүх зорилго</h2>
        {loading && (
          <p className="animate-pulse text-sm text-ink-dim" role="status">
            Ачаалж байна…
          </p>
        )}
        {!loading && sorted.length === 0 && (
          <p className="text-sm text-ink-dim">
            Одоогоор зорилго алга байна — дээрх маягтаар эхнийхээ нэмнэ үү.
          </p>
        )}
        {!loading && sorted.length > 0 && (
          <div className="space-y-3">
            {sorted.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onStatusChange={(status) => handleStatusChange(g.id, status)}
                onEdit={(values) => handleEdit(g.id, values)}
                onDelete={() => handleDelete(g.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

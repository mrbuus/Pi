"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import StudentPicker, { type StudentHit } from "@/components/exam/StudentPicker";
import BulkScoreEntry from "@/components/results/BulkScoreEntry";
import ResultsTable from "@/components/results/ResultsTable";
import type { ClassroomOption, ResultRow } from "@/components/results/types";

interface TestDetail {
  id: string;
  title: string;
  access: { classroomId: string }[];
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

export default function TestResultsPage() {
  const params = useParams<{ id: string }>();

  const [rows, setRows] = useState<ResultRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [rowsError, setRowsError] = useState("");

  const [testTitle, setTestTitle] = useState("");
  const [classroomOptions, setClassroomOptions] = useState<ClassroomOption[]>([]);
  const [classroomsLoading, setClassroomsLoading] = useState(true);

  // Гараар нэг сурагч нэмэх (жишээ нь ангид биш, эрхээр нэвтэрсэн сурагч) —
  // StudentPicker-ийг ашигласан хуучин урсгал, bulk горимын нэмэлт болгож үлдээв
  const [student, setStudent] = useState<StudentHit | null>(null);
  const [total, setTotal] = useState("");
  const [max, setMax] = useState("100");
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "error">("ok");

  const loadResults = useCallback(() => {
    setRowsLoading(true);
    setRowsError("");
    api<ResultRow[]>(`/tests/${params.id}/results`)
      .then(setRows)
      .catch((e) => setRowsError(errMsg(e)))
      .finally(() => setRowsLoading(false));
  }, [params.id]);

  useEffect(loadResults, [loadResults]);

  useEffect(() => {
    let cancelled = false;
    setClassroomsLoading(true);
    Promise.all([
      api<TestDetail>(`/tests/${params.id}`),
      api<ClassroomOption[]>("/classrooms"),
    ])
      .then(([test, classrooms]) => {
        if (cancelled) return;
        setTestTitle(test.title);
        const accessIds = new Set((test.access ?? []).map((a) => a.classroomId));
        const matched = classrooms.filter((c) => accessIds.has(c.id));
        // Тестэд тодорхой анги оноогдоогүй бол багшийн бүх ангийг санал болгоно
        setClassroomOptions(matched.length > 0 ? matched : classrooms);
      })
      .catch(() => {
        if (!cancelled) setClassroomOptions([]);
      })
      .finally(() => {
        if (!cancelled) setClassroomsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function enterResult() {
    setMsg("");
    if (!student) {
      setMsgTone("error");
      setMsg("Эхлээд сурагчаа хайж сонгоно уу");
      return;
    }
    try {
      await api(`/tests/${params.id}/results`, {
        method: "POST",
        body: {
          studentId: student.id,
          totalScore: parseFloat(total),
          maxScore: parseFloat(max),
        },
      });
      setMsgTone("ok");
      setMsg(`${student.firstName} ${student.lastName} — дүн орлоо`);
      setStudent(null);
      setTotal("");
      loadResults();
    } catch (e) {
      setMsgTone("error");
      setMsg(errMsg(e));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Шалгалтын дүн</h1>
        {testTitle && <p className="mt-1 text-base text-ink-dim">{testTitle}</p>}
      </div>

      <BulkScoreEntry
        testId={params.id}
        classroomOptions={classroomOptions}
        classroomsLoading={classroomsLoading}
        existingResults={rows}
        onSaved={loadResults}
      />

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-1 text-lg font-bold text-brand-soft">
          Ангийн жагсаалтад байхгүй сурагч нэмэх
        </h2>
        <p className="mb-4 text-base text-ink-dim">
          Сурагчийг код (жишээ нь SIE-26-M-0142) эсвэл нэрээр хайж сонгоод оноог оруулна.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <StudentPicker onSelect={setStudent} />
          <label className="sr-only" htmlFor="score-total">
            Авсан оноо
          </label>
          <input
            id="score-total"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            inputMode="numeric"
            placeholder="Авсан оноо"
            className="h-11 w-28 rounded-lg border border-line bg-surface px-3 text-base text-ink outline-none focus-visible:border-brand"
          />
          <label className="sr-only" htmlFor="score-max">
            Нийт оноо
          </label>
          <input
            id="score-max"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            inputMode="numeric"
            placeholder="Нийт"
            className="h-11 w-24 rounded-lg border border-line bg-surface px-3 text-base text-ink outline-none focus-visible:border-brand"
          />
          <button
            onClick={enterResult}
            className="h-11 rounded-lg bg-brand-bright px-4 text-base font-bold text-on-brand"
          >
            Оруулах
          </button>
        </div>
        {student && (
          <p className="mt-2 text-sm text-ink-dim">
            Сонгосон:{" "}
            <span className="font-semibold text-ink">
              {student.firstName} {student.lastName}
            </span>
            {student.studentCode && <span className="ml-1 font-mono">({student.studentCode})</span>}
          </p>
        )}
        {msg && (
          <p className={`mt-2 text-sm ${msgTone === "ok" ? "text-success" : "text-error"}`}>{msg}</p>
        )}
      </section>

      <ResultsTable rows={rows} loading={rowsLoading} error={rowsError} onRetry={loadResults} />
    </div>
  );
}

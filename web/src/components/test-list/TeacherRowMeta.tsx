"use client";

import { useEffect, useState } from "react";
import { Pencil, Users } from "lucide-react";
import Link from "next/link";
import { api, getRole } from "@/lib/api";
import type { TestRow } from "./types";

type TestRowWithCreator = TestRow & { createdById?: string };

/* ============================================================================
 * Багшийн харагдацад нэг тестийн мөрөнд харуулах нэмэлт мэдээлэл: хэдэн
 * сурагч өгсөн (TestResult нь testId+studentId дээр @@unique тул
 * _count.results = ДАВХАРДААГҮЙ сурагчийн тоо), мөн дүн рүү шууд холбоос.
 *
 * ДУНДАЖ ОНОО: /tests жагсаалтын API нь одоогоор нийт оноог (totalScore/
 * maxScore) буцаадаггүй, зөвхөн тоог (_count) буцаадаг тул энд найдвартай
 * тооцоолж чадахгүй — жагсаалт бүрд /tests/:id/results дуудвал N+1 асуулга
 * үүсгэж гүйцэтгэлд сөрөг нөлөөтэй тул орхив. Backend дунджийг шууд буцаах
 * болвол энд харуулж болно.
 * ========================================================================== */
export default function TeacherRowMeta({ test }: { test: TestRowWithCreator }) {
  const takenCount = test._count.results;
  const role = getRole();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    if (role !== "TEACHER") return;
    api<{ id: string }>("/auth/me")
      .then((user) => setUserId(user.id))
      .catch(() => setUserId(null));
  }, [role]);
  const canEdit =
    role === "ADMIN" ||
    role === "TEACHER_PLUS" ||
    (role === "TEACHER" && !!userId && test.createdById === userId);

  return (
    <div className="flex shrink-0 items-center gap-3">
      {typeof takenCount === "number" && (
        <span
          title="Өгсөн сурагчийн тоо"
          className="hidden items-center gap-1 text-xs text-ink-dim sm:inline-flex"
        >
          <Users className="h-3.5 w-3.5" aria-hidden="true" /> {takenCount}{" "}
          сурагч
        </span>
      )}
      {canEdit && (
        <Link
          href={`/app/tests/${test.id}/edit`}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs transition hover:border-brand"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Засах
        </Link>
      )}
      <Link
        href={`/app/tests/${test.id}/results`}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-3 py-1.5 text-xs transition hover:border-brand"
      >
        Дүн харах
      </Link>
    </div>
  );
}

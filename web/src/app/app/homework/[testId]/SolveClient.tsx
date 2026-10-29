"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import RequireRole from "@/components/nav/RequireRole";
import HomeworkSolve from "@/components/homework-practice/HomeworkSolve";
import { ErrorState } from "@/components/ui/StateBlock";

export default function SolveClient() {
  const params = useParams<{ testId: string }>();
  const search = useSearchParams();
  const date = search.get("date") ?? "";
  const classroomId = search.get("classroomId") ?? "";
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && !!classroomId && !!params.testId;

  return (
    <RequireRole allow={["STUDENT"]}>
      {valid ? (
        <HomeworkSolve testId={decodeURIComponent(params.testId)} date={date} classroomId={classroomId} />
      ) : (
        <div className="mx-auto max-w-2xl space-y-3">
          <ErrorState message="Даалгаврын холбоос буруу байна" />
          <Link href="/app/homework" className="text-sm font-semibold text-brand hover:underline">
            Гэрийн даалгавар руу
          </Link>
        </div>
      )}
    </RequireRole>
  );
}

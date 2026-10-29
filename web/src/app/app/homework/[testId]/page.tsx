import { Suspense } from "react";
import { LoadingState } from "@/components/ui/StateBlock";
import SolveClient from "./SolveClient";

/** /app/homework/:testId?date=YYYY-MM-DD&classroomId=… — эхлүүлэх/үргэлжлүүлэх (POST /homework/attempts) */
export default function HomeworkSolvePage() {
  return (
    <Suspense fallback={<LoadingState rows={5} />}>
      <SolveClient />
    </Suspense>
  );
}

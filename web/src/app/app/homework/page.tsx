"use client";

import RequireRole from "@/components/nav/RequireRole";
import HomeworkList from "@/components/homework-practice/HomeworkList";

/** Сурагчийн «Гэрийн даалгавар» (эзэн 2026-10-29) — өдрөөр бүлэглэсэн B хувилбарын тестүүд */
export default function HomeworkPage() {
  return (
    <RequireRole allow={["STUDENT"]}>
      <HomeworkList />
    </RequireRole>
  );
}

import type { Metadata } from "next";
import TeacherDashboardClient from "./TeacherDashboardClient";

export const metadata: Metadata = {
  title: "Ирц ба даалгавар | Шинэ Ирээдүйн Эзэд",
  description: "Тухайн өдрийн хичээлтэй ангийн ирц, гэрийн даалгаврыг тэмдэглэх, хянах багшийн самбар",
};

type Search = Promise<{ class?: string | string[]; date?: string | string[] }>;

/**
 * Багшийн самбар = Ирц ба даалгавар (эзэн 2026-10-18). `?class=<id>&date=YYYY-MM-DD` —
 * өдрийн хуваарь болон бусад хэсгээс тэр анги, тэр өдөр рүү шууд. Холбоосоор зөөлөн
 * шилжихэд ч зөв анги/өдөр нээгдэхийн тулд `key`-ээр шинээр mount хийнэ.
 */
export default async function TeacherPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const classId = typeof sp.class === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(sp.class) ? sp.class : null;
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : null;
  return <TeacherDashboardClient key={`${classId ?? ""}|${date ?? ""}`} link={{ classId, date }} />;
}

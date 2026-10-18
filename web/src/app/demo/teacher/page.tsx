import type { Metadata } from "next";
import DemoShell from "@/components/demo/shell/DemoShell";
import TeacherBoard from "@/components/demo/teacher-board/TeacherBoard";

export const metadata: Metadata = {
  title: "Ирц ба даалгавар — демо",
  robots: { index: false, follow: false },
};

type Search = Promise<{ class?: string | string[]; date?: string | string[] }>;

/**
 * Нийтийн ДЕМО: нэвтрэлтгүй, зохиомол өгөгдөл, юу ч хадгалагдахгүй. Бүрхүүл нь жинхэнэ аппын дүрслэл.
 * `?class=c121&date=2026-10-17` — бусад демо хэсгээс тэр анги, тэр өдөр рүү шууд орно.
 */
export default async function DemoTeacherPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const classId = typeof sp.class === "string" ? sp.class : null;
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : null;
  return (
    <DemoShell active="teacher" title="Багшийн самбар">
      <TeacherBoard key={`${classId ?? ""}|${date ?? ""}`} link={{ classId, date }} />
    </DemoShell>
  );
}

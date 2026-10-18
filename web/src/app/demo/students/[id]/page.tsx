import type { Metadata } from "next";
import { StudentSkeleton } from "@/components/demo/classes/Skeletons";
import DemoShell from "@/components/demo/shell/DemoShell";
import { ClientOnly } from "@/components/demo/shell/status";
import StudentView from "@/components/demo/students/StudentView";
import { studentById } from "@/components/demo/world";

export const metadata: Metadata = {
  title: "Сурагч — демо",
  robots: { index: false, follow: false },
};

/** Сурагчийн бүтэн хуудас (демо): холбоо барих, ирц, даалгавар, шалгалт, төлбөр, тэмдэглэл */
export default async function DemoStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Олдохгүй бол бүрхүүл дотроо «Сурагч олдсонгүй» төлөв харуулна (StudentView)
  const student = studentById(id);
  return (
    <DemoShell active="students" title={student?.name ?? "Сурагч"}>
      <ClientOnly fallback={<StudentSkeleton />}>
        <StudentView id={id} />
      </ClientOnly>
    </DemoShell>
  );
}

import type { Metadata } from "next";
import { StudentsSkeleton } from "@/components/demo/classes/Skeletons";
import DemoShell from "@/components/demo/shell/DemoShell";
import { ClientOnly } from "@/components/demo/shell/status";
import StudentsView from "@/components/demo/students/StudentsView";

export const metadata: Metadata = {
  title: "Сурагчид — демо",
  robots: { index: false, follow: false },
};

/** Нийтийн ДЕМО: нэвтрэлтгүй, зохиомол өгөгдөл. Цаг хамаарсан тул зөвхөн хөтөч дээр зурна */
export default function DemoStudentsPage() {
  return (
    <DemoShell active="students" title="Сурагчид">
      <ClientOnly fallback={<StudentsSkeleton />}>
        <StudentsView />
      </ClientOnly>
    </DemoShell>
  );
}

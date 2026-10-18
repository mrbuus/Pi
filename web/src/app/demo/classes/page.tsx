import type { Metadata } from "next";
import ClassesView from "@/components/demo/classes/ClassesView";
import { ClassesSkeleton } from "@/components/demo/classes/Skeletons";
import DemoShell from "@/components/demo/shell/DemoShell";
import { ClientOnly } from "@/components/demo/shell/status";

export const metadata: Metadata = {
  title: "Ангиуд — демо",
  robots: { index: false, follow: false },
};

/** Нийтийн ДЕМО: нэвтрэлтгүй, зохиомол өгөгдөл. Цаг хамаарсан тул зөвхөн хөтөч дээр зурна */
export default function DemoClassesPage() {
  return (
    <DemoShell active="classes" title="Ангиуд">
      <ClientOnly fallback={<ClassesSkeleton />}>
        <ClassesView />
      </ClientOnly>
    </DemoShell>
  );
}

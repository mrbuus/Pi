import type { Metadata } from "next";
import ClassView from "@/components/demo/classes/ClassView";
import { ClassSkeleton } from "@/components/demo/classes/Skeletons";
import DemoShell from "@/components/demo/shell/DemoShell";
import { ClientOnly } from "@/components/demo/shell/status";
import { classById } from "@/components/demo/world";

export const metadata: Metadata = {
  title: "Анги — демо",
  robots: { index: false, follow: false },
};

/** Ангийн хяналтын самбар (демо): нэгтгэл, сарын тор, шалгалт, эрэмбэ, асуудалтай, төлбөр */
export default async function DemoClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Олдохгүй бол бүрхүүл дотроо «Анги олдсонгүй» төлөв харуулна (ClassView)
  const cls = classById(id);
  return (
    <DemoShell active="classes" title={cls?.name ?? "Анги"}>
      <ClientOnly fallback={<ClassSkeleton />}>
        <ClassView id={id} />
      </ClientOnly>
    </DemoShell>
  );
}

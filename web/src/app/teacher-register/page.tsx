import type { Metadata } from "next";
import { RegisterExternalTeacher } from "@/components/groups/RegisterExternalTeacher";

export const metadata: Metadata = {
  title: "Анги удирдах | Шинэ Ирээдүйн Эзэд",
  description: "Багшаар бүртгүүлж ангийн бүлэг үүсгэх.",
};

export default function TeacherRegisterPage() {
  return (
    <main className="min-h-screen bg-bg px-4 py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-5">
        <div className="text-center">
          <p className="text-sm font-semibold text-brand">
            Анги удирдах
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Ангийн бүлгээ үүсгээрэй</h1>
          <p className="mt-2 text-sm text-ink-dim">
            Багшаар бүртгүүлээд нэвтэрч ангиа удирдана.
          </p>
        </div>
        <RegisterExternalTeacher />
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Анги удирдах | Шинэ Ирээдүйн Эзэд",
  description: "Гадны багшийн бүртгэлийг төвийн админ үүсгэнэ.",
};

/**
 * Гадны багшийн бүртгэлийг өөрөө үүсгэх боломжийг хаасан (2026-11-05 аюулгүй байдлын аудит):
 * бүртгэлийг зөвхөн төвийн админ үүсгэж, баталгаажуулна.
 */
export default function TeacherRegisterPage() {
  return (
    <main className="min-h-screen bg-bg px-4 py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 text-center">
        <p className="text-sm font-semibold text-brand">Анги удирдах</p>
        <h1 className="text-2xl font-bold text-ink">Багшийн бүртгэлийг төвийн админ үүсгэнэ</h1>
        <p className="text-sm text-ink-dim">Бүртгүүлэх бол төвтэй холбогдоно уу. Бүртгэлтэй бол нэвтэрч орно</p>
        <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 text-sm font-bold text-on-brand hover:opacity-90">
          Нэвтрэх
        </Link>
      </div>
    </main>
  );
}

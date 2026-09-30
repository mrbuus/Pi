import type { Metadata } from "next";
import { RegisterExternalTeacher } from "@/components/groups/RegisterExternalTeacher";

export const metadata: Metadata = {
  title: "Гадны багшийн бүртгэл | Шинэ Ирээдүйн Эзэд",
  description: "Гадны багшийн бүлэг үүсгэх хүсэлт илгээх.",
};

export default function TeacherRegisterPage() {
  return (
    <main className="min-h-screen bg-bg px-4 py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-5">
        <div className="text-center">
          <p className="text-sm font-semibold text-brand">
            Гадны багшийн бүртгэл
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Бүлгийн хүсэлт</h1>
          <p className="mt-2 text-sm text-ink-dim">
            Мэдээллээ илгээж админы баталгаажуулалтыг хүлээнэ үү.
          </p>
        </div>
        <RegisterExternalTeacher />
      </div>
    </main>
  );
}

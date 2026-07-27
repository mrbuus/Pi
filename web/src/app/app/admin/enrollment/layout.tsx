import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Элсэлтийн удирдлага | Шинэ Ирээдүйн Эзэд",
  description:
    "Хичээл тус бүрийн элсэлтийг нээх/хаах, хамрах хэлбэрийг тохируулах — Багш+/Админ самбар.",
};

export default function EnrollmentAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="mx-auto w-full max-w-6xl">{children}</div>;
}

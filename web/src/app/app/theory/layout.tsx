import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Онолын зураг — Шинэ Ирээдүйн Эзэд",
  description: "Хичээлийн онолын зургийг өдрөөр, сэдвээр хайж харах, өнөөдрийнхийг илгээх",
};

export default function TheoryLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

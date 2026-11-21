import type { Metadata } from "next";
import HomePage from "@/components/home/HomePage";

// Нүүрний таб хуудас (2026-11-21) — нүүрний ижил markup, зөвхөн энэ хэсэг харагдана
export const metadata: Metadata = {
  title: "Багш нар",
  description: "Шинэ Ирээдүйн Эзэд сургалтын төвийн багш нар, тэдний ангиуд",
};

export default function Page() {
  return <HomePage page="bagsh-nar" />;
}

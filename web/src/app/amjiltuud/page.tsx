import type { Metadata } from "next";
import HomePage from "@/components/home/HomePage";

// Нүүрний таб хуудас (2026-11-21) — нүүрний ижил markup, зөвхөн энэ хэсэг харагдана
export const metadata: Metadata = {
  title: "Амжилт",
  description: "Манай сурагчдын элсэлтийн шалгалтын амжилт, 2018 оноос он оноор",
};

export default function Page() {
  return <HomePage page="amjiltuud" />;
}

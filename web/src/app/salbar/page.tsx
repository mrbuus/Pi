import type { Metadata } from "next";
import HomePage from "@/components/home/HomePage";

// Нүүрний таб хуудас (2026-11-21) — нүүрний ижил markup, зөвхөн энэ хэсэг харагдана
export const metadata: Metadata = {
  title: "Салбар",
  description: "Сургалтын төвийн салбаруудын хаяг, газрын зураг, цахим анги",
};

export default function Page() {
  return <HomePage page="salbar" />;
}

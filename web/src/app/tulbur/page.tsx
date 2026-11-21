import type { Metadata } from "next";
import HomePage from "@/components/home/HomePage";

// Нүүрний таб хуудас (2026-11-21) — нүүрний ижил markup, зөвхөн энэ хэсэг харагдана
export const metadata: Metadata = {
  title: "Төлбөр",
  description: "Танхимын сургалтын төлбөр, цахим номын хандах эрх",
};

export default function Page() {
  return <HomePage page="tulbur" />;
}

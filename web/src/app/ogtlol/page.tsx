import type { Metadata } from "next";
import HomePage from "@/components/home/HomePage";

// Нүүрний таб хуудас (2026-11-21) — нүүрний ижил markup, зөвхөн энэ хэсэг харагдана
export const metadata: Metadata = {
  title: "Огтлол",
  description: "Куб, пирамид, цилиндрийг өөрөө огтолж, огтлолын хэлбэрийг үзэх",
};

export default function Page() {
  return <HomePage page="ogtlol" />;
}

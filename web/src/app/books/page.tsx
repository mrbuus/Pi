import type { Metadata } from "next";
import BooksWorkspace from "@/components/books/BooksWorkspace";

export const metadata: Metadata = {
  title: "Ном, тест | Шинэ Ирээдүйн Эзэд",
  description: "Математикийн тестүүд I, II, III, 1000 бодлого: сэдэв бүрийн эхний тестийг нэвтрэлтгүй, шууд бодож үзээрэй",
};

export default function BooksPage() {
  return <BooksWorkspace />;
}

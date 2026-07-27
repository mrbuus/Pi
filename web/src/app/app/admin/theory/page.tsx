import type { Metadata } from "next";
import TheoryEditorClient from "@/components/theory/TheoryEditorClient";

export const metadata: Metadata = {
  title: "Онолын агуулга удирдах | Шинэ Ирээдүйн Эзэд",
  description:
    "Бүлэг сэдэв тус бүрийн онолын блок (markdown + томьёо) үүсгэх, засах, эрэмбэлэх — багшийн эрхтэй хэрэглэгчид зориулсан хуудас.",
};

export default function TheoryAdminPage() {
  return <TheoryEditorClient />;
}

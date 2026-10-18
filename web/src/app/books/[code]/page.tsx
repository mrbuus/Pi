import type { Metadata } from "next";
import BooksWorkspace from "@/components/books/BooksWorkspace";
import { BOOK_META } from "@/components/books/bookMeta";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const name = BOOK_META[code]?.name ?? "Ном";
  return { title: `${name} | Шинэ Ирээдүйн Эзэд`, description: `${name}: сэдэв бүрийн эхний тест үнэгүй, A/B хувилбартай, шууд бодож дүнгээ хар` };
}

export default async function BookPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <BooksWorkspace initialCode={code} />;
}

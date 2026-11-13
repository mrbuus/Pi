import type { Metadata } from "next";
import BookMoneyDashboard from "@/components/book-money/BookMoneyDashboard";

export const metadata: Metadata = {
  title: "Номын мөнгө | Шинэ Ирээдүйн Эзэд",
  description: "Аль анги ямар ном авсан, хэдэн хүүхэд мөнгөө өгсөн, аль багш хураасан.",
};

export default function BookMoneyPage() {
  return <BookMoneyDashboard />;
}

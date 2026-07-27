import type { Metadata } from "next";
import PaymentsClient from "./PaymentsClient";

export const metadata: Metadata = {
  title: "Төлбөрийн хяналт | Шинэ Ирээдүйн Эзэд",
  description:
    "Хүлээгдэж буй төлбөр баталгаажуулах, сарын төлөлт хянах, сургалтын төлбөрийн лавлагаа.",
};

export default function PaymentsPage() {
  return <PaymentsClient />;
}

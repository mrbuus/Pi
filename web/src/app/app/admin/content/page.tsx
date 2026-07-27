import type { Metadata } from "next";
import ContentAdminClient from "./ContentAdminClient";

export const metadata: Metadata = {
  title: "Контент удирдах | Шинэ Ирээдүйн Эзэд",
  description:
    "Ном, бүлэг сэдэв, бодлого нэмэх — Математик болон Нийгмийн ухааны контент удирдлага.",
};

export default function ContentAdminPage() {
  return <ContentAdminClient />;
}

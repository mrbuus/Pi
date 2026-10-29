import { redirect } from "next/navigation";

// Дүн, эрэмбэ одоо «Шалгалт» хэсгийн «Эрэмбэ» табд (эзэн 2026-10-29)
export default function ResultsRankingRedirect() {
  redirect("/app/tests?tab=rank");
}

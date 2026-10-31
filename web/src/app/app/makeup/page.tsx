import { redirect } from "next/navigation";

// Сурагчийн «Нөхөх хичээл» → «Хичээл» hub-ийн «Нөхөх» таб (SURAGCH-V2-GEREE, 2026-10-31).
// Мэдэгдэл, хуучин холбоос эвдрэхгүйн тулд шилжүүлнэ.
export default function MakeupRedirect() {
  redirect("/app/my-class?tab=makeup");
}

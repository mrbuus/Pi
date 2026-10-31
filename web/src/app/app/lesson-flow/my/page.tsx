import { redirect } from "next/navigation";

// Сурагчийн «Хичээл» нэг hub-д нэгдсэн (SURAGCH-V2-GEREE, 2026-10-31): /app/my-class.
// Хуучин холбоос, хавчуурга эвдрэхгүйн тулд шилжүүлнэ; tab/day/c байвал хадгална.
export default async function LessonFlowMyRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const key of ["tab", "day", "c"]) {
    const v = sp[key];
    if (typeof v === "string" && v) q.set(key, v);
  }
  const s = q.toString();
  redirect(s ? `/app/my-class?${s}` : "/app/my-class");
}

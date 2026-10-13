import { redirect } from "next/navigation";

// Сурагчийн бүх мэдээлэл нэг хуудсанд нэгдсэн (2026-10-12): /app/students/:id.
// Хуучин холбоос (AtRiskList, хавчуурга) эвдрэхгүйн тулд энд шилжүүлнэ;
// ?tab= байвал хадгална, байхгүй бол хуучин хуудастай адил «Мэдээлэл» таб.
export default async function AdminStudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tab = typeof sp.tab === "string" && sp.tab ? sp.tab : "info";
  redirect(`/app/students/${encodeURIComponent(id)}?tab=${encodeURIComponent(tab)}`);
}

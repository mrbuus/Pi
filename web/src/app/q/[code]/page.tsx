import { redirect } from "next/navigation";

// Номд хэвлэсэн QR: pimath.mn/q/<код>. Утасны камер шууд энэ хаягийг нээнэ.
// Нэвтрэлтийг /app layout шалгаж, нэвтрээгүй бол /login?next=… руу илгээнэ.
export default async function ScanShortLink({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (/^[A-Za-z0-9-]{4,40}$/.test(code)) redirect(`/app/scan/${code}`);
  redirect("/app");
}

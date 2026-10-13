import { redirect } from "next/navigation";

// «1000 бодлогын шалгалт»-ын тусдаа хэсэг байхгүй болсон (эзэн 2026-10-10) —
// бүгд «Шалгалт» хэсэгт. Хуучин холбоосыг шилжүүлнэ:
//   /app/thousand/:id/review → /app/tests/:id/review (сурагчийн эргэн харалт)
//   бусад /app/thousand*      → /app/tests
export default async function ThousandRedirect({
  params,
}: {
  params: Promise<{ rest?: string[] }>;
}) {
  const { rest = [] } = await params;
  if (rest.length === 2 && rest[1] === "review" && /^[A-Za-z0-9_-]{1,64}$/.test(rest[0])) {
    redirect(`/app/tests/${rest[0]}/review`);
  }
  redirect("/app/tests");
}

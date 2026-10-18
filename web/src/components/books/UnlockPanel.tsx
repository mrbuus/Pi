"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, GraduationCap, Lock, Phone } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";
import { formatMnt, PHONES } from "@/lib/orgInfo";
import { useAuth } from "@/hooks/useAuth";

// Эрх нээх сонголтууд — зөвхөн ӨС-д байгаа бодит бүтээгдэхүүн, эрх (үнэ зохиохгүй).
// Нэвтэрсэн бол дэлгүүр рүү, зочин бол бүртгүүлээд дэлгүүр рүү буцна.

interface Pass { id: string; name: string; durationDays: number; price: number; scope: { all?: boolean; bookIds?: string[]; chapterIds?: string[]; testIds?: string[] } | null }
interface Product { id: string; kind: "TEST" | "BOOK" | "PASS"; refId: string; price: number; title?: string }

export default function UnlockPanel({ bookId, bookName, compact = false }: { bookId: string; bookName: string; compact?: boolean }) {
  const { user } = useAuth();
  const [passes, setPasses] = useState<Pass[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  useEffect(() => {
    let alive = true;
    api<Pass[]>("/catalog/passes", { auth: false }).then((r) => alive && setPasses(r)).catch(() => alive && setPasses([]));
    api<Product[]>("/store/products", { auth: false }).then((r) => alive && setProducts(r)).catch(() => alive && setProducts([]));
    return () => { alive = false; };
  }, []);

  const bookProduct = products?.find((p) => p.kind === "BOOK" && p.refId === bookId) ?? null;
  const relevantPasses = (passes ?? []).filter((p) => p.price >= 0 && (!p.scope || p.scope.all || p.scope.bookIds?.includes(bookId) || (!p.scope.bookIds?.length && !p.scope.chapterIds?.length && !p.scope.testIds?.length)));
  const storeHref = user ? "/app/store" : "/register?next=%2Fapp%2Fstore";
  const loading = passes === null || products === null;

  const options: { icon: typeof BookOpen; title: string; sub: string; price: string }[] = [];
  if (bookProduct) options.push({ icon: BookOpen, title: `${bookName} бүтнээр`, sub: "Бүх тест, бодолт, зөв хариу", price: formatMnt(bookProduct.price) });
  for (const p of relevantPasses) options.push({ icon: p.scope?.all ? GraduationCap : CalendarDays, title: p.name, sub: p.durationDays ? `${p.durationDays} хоногийн эрх` : "Хугацаагүй", price: p.price ? formatMnt(p.price) : "Үнэгүй" });

  return (
    <section aria-labelledby="unlock" className={`rounded-3xl border border-line bg-surface ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-bright/12 text-brand-soft"><Lock className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0">
          <h3 id="unlock" className="text-lg font-bold leading-tight">Бүх тест, бодолтыг нээх</h3>
          <p className="mt-1 text-sm text-ink-dim">Сэдэв бүрийн эхний тест үнэгүй, бусад тест, зөв хариу, бодолт эрхтэй сурагчдад нээгдэнэ</p>
        </div>
      </div>
      {loading ? (
        <div className="mt-4 h-16 animate-pulse rounded-2xl bg-bg" aria-hidden />
      ) : options.length ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <li key={o.title} className="flex items-center gap-3 rounded-2xl border border-line bg-bg px-4 py-3">
              <o.icon className="h-5 w-5 shrink-0 text-brand" aria-hidden />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{o.title}</span><span className="block text-xs text-ink-dim">{o.sub}</span></span>
              <span className="shrink-0 font-display text-sm font-bold">{o.price}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-2xl bg-bg px-4 py-3 text-sm text-ink-dim">Багц, үнийн мэдээллийг төвөөс лавлана уу, танхимын сурагчдад бүх эрх дагалдана</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild><Link href={storeHref}>{user ? "Дэлгүүр рүү" : "Бүртгүүлээд эрх авах"}</Link></Button>
        {!user && <Button asChild variant="ghost"><Link href="/login?next=%2Fapp%2Fstore">Нэвтрэх</Link></Button>}
        <a href={`tel:${PHONES[0].replace(/\s/g, "")}`} className="ml-auto inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand"><Phone className="h-4 w-4" aria-hidden />{PHONES[0]}</a>
      </div>
    </section>
  );
}

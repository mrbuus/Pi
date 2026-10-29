"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { Hourglass } from "lucide-react";
import { getRole } from "@/lib/api";

/**
 * «Тун удахгүй» дэлгэц (эзэн 2026-10-29, SURAGCH-SHINECHLEL §1): сурагчийн
 * цэсний «Тун удахгүй» бүлгийн хуудсууд (Суралцах, Давтлага, Дасгал, Хичээл
 * үзэх, Онлайн хичээл, Зорилго) бэлэн болтол сурагчид энэ дэлгэц харагдана.
 */
export default function ComingSoon({ title }: { title?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-bright/10 text-brand-soft">
        <Hourglass className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="text-xl font-extrabold text-ink">Тун удахгүй</h1>
      <p className="text-sm text-ink-dim">
        {title ? `«${title}» хэсгийг бэлдэж байна, удахгүй нээгдэнэ` : "Энэ хэсгийг бэлдэж байна, удахгүй нээгдэнэ"}
      </p>
      <Link
        href="/app/student"
        className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 text-sm font-bold text-on-brand hover:opacity-90"
      >
        Миний самбар руу
      </Link>
    </div>
  );
}

const noopSubscribe = () => () => {};

/** Сурагчид ComingSoon, бусад role-д (ажилтан, худалдан авагч) хуудас хэвээр */
export function StudentComingSoon({ title, children }: { title?: string; children: ReactNode }) {
  const role = useSyncExternalStore(noopSubscribe, getRole, () => null);
  if (!role) return null;
  if (role === "STUDENT") return <ComingSoon title={title} />;
  return <>{children}</>;
}

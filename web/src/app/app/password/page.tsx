"use client";

import Link from "next/link";
import ChangePasswordSection from "@/components/profile/ChangePasswordSection";

/* Нууц үг солих — заавал хэрэгтэй урсгал. Хуудас өөрөө одоо «Миний мэдээлэл»
   хуудасны нэг хэсэг болсон ч хуучин холбоос/bookmark 404 болохгүйн тулд
   энд ажиллаж байгаа хэвээр үлдэв. */
export default function ChangePasswordPage() {
  return (
    <div className="mx-auto max-w-sm">
      <p className="mb-4 text-sm text-ink-dim">
        Энэ маягт одоо{" "}
        <Link href="/app/profile" className="font-semibold text-brand underline underline-offset-2">
          Миний мэдээлэл
        </Link>{" "}
        хуудасны нэг хэсэг болсон.
      </p>
      <ChangePasswordSection />
    </div>
  );
}

"use client";

import Link from "next/link";
import ChangePasswordSection from "@/components/profile/ChangePasswordSection";

/* Нууц үг солих — SPEC §6.2-ийн дагуу энэ урсгал заавал хэрэгтэй (анхны
   нууц үг = утасны дугаар). Хуудас өөрөө одоо /app/profile-ийн нэг хэсэг
   болсон ч хуучин холбоос/bookmark 404 болохгүйн тулд ЭНД ажиллаж байгаа
   хэвээр үлдэв — доторх маягт ChangePasswordSection-той яг ижил. */
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

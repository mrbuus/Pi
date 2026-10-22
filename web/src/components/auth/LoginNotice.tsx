"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { api } from "@/lib/api";

/* Нэвтрэх хуудасны админ засдаг тайлбар/зарлал (GET /auth/login-text, нийтийн).
   Энгийн текст: React автоматаар escape хийнэ, мөр шилжилтийг `whitespace-pre-line`
   хадгална — HTML хэзээ ч ажиллахгүй. Хоосон эсвэл сүлжээ тасарвал юу ч гаргахгүй
   (нэвтрэлтэд саад болохгүй). */
export default function LoginNotice() {
  const [body, setBody] = useState("");

  useEffect(() => {
    let active = true;
    api<{ body: string }>("/auth/login-text", { auth: false })
      .then((r) => active && setBody(r.body?.trim() ?? ""))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!body) return null;
  return (
    <section
      aria-label="Сургалтын төвийн мэдээлэл"
      className="mb-5 flex gap-2.5 rounded-xl border border-brand/25 bg-brand/5 px-3.5 py-3 text-sm text-ink"
    >
      <Megaphone aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
      <p className="min-w-0 whitespace-pre-line break-words">{body}</p>
    </section>
  );
}

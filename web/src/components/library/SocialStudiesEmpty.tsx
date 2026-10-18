"use client";

import Link from "next/link";
import { Landmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { EmptyState } from "@/components/ui/StateBlock";

/** Builder-ийн хичээл урьдчилан сонгогдсон холбоос (`/app/tests/new?subject=`) */
export const NEW_SOCIAL_TEST_HREF = "/app/tests/new?subject=SOCIAL_STUDIES";

/**
 * Номын сангийн «Нийгмийн ухаан» таб хоосон үед (эзэн 2026-10-18).
 * Ажилтан (canCreate) — «Шинэ тест үүсгэх» товч: эхний тест үүсэхэд «Нийгмийн
 * ухаан» ном, тестийн бүлэг автоматаар үүсч энд харагдана. Сурагч — найрсаг
 * тайлбар (сервер нийгмийн ухааны контентыг зөвхөн тухайн ангийн сурагчид өгнө).
 */
export default function SocialStudiesEmpty({ canCreate }: { canCreate: boolean }) {
  if (canCreate) {
    return (
      <EmptyState
        icon={Landmark}
        title="Нийгмийн ухааны тест хараахан алга"
        hint="Эхний тестийг үүсгэхэд «Нийгмийн ухаан» ном автоматаар нээгдэж, тест энд харагдана"
        action={
          <Button asChild>
            <Link href={NEW_SOCIAL_TEST_HREF}>
              <Plus aria-hidden />
              Шинэ тест үүсгэх
            </Link>
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={Landmark}
      title="Нийгмийн ухааны материал хараахан алга"
      hint="Нийгмийн ухааны ангид тест нэмэгдэхэд энд харагдана"
    />
  );
}

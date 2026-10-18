"use client";

import AttentionBanner from "@/components/students/AttentionBanner";
import Board, { type BoardLink } from "@/components/TeacherDashboard/board/Board";

/**
 * Багшийн самбар (/app/teacher) — Ирц ба даалгаврын самбар (эзний баталсан демо,
 * docs/v2/UDRIIN-HICHEEL-REWORK.md). Хуучин самбарын бусад хэсгүүд (оройн тэмдэглэгээний
 * дүгнэлт, анхаарах сурагч, эцэг эхийн холболт, ангигүй сурагч, зар, онлайн ангийн
 * даалгавар) «Хяналт» табын доод «Ангийн бусад мэдээлэл»-д.
 */
export default function TeacherDashboardClient({ link }: { link: BoardLink }) {
  // Ангигүй / хичээлдээ ирэхгүй хүүхэд — нүүрний хамгийн дээр тод (эзэн 2026-10-18).
  // Багш+/Админд л; бусад эрх, хоосон үед өөрөө нуугдана.
  return (
    <div className="space-y-3">
      <AttentionBanner />
      <Board link={link} />
    </div>
  );
}

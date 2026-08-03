"use client";

import { Delete, X } from "lucide-react";

/* ============================================================================
 * NumericKeypad — ЭЕШ-ийн "тоо нөхөх" (FILL_NUMBER) бодлогын хариу оруулагч.
 *
 * Хэрэглэгч зөвхөн 11 харагдах товчоор хариугаа бичнэ:
 *   0 1 2 3 4 5 6 7 8 9 - .
 * (цифр, хасах тэмдэг, аравтын таслал). Гар утас, компьютер хоёуланд ажиллана.
 *
 * Зарчим:
 *   - Сонгосон тэмдэгтийг хариуны төгсгөлд залгана.
 *   - Устгах ба бүгдийг арилгах (Цэвэрлэх) товчтой.
 *   - Хариуг тухайн бодлогын string утга болгож хадгална.
 *   - Гарын товчлуурын далд оролтод найдахгүй — 11 товч нь үндсэн арга.
 * ========================================================================== */

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "0", "."];

export default function NumericKeypad({
  value,
  onChange,
  theme = "navy",
}: {
  value: string;
  // Функцэн шинэчлэл — хурдан дарахад ч цифр алдагдахгүй (stale closure-аас сэргийлнэ)
  onChange: (update: (prev: string) => string) => void;
  theme?: "navy" | "light";
}) {
  const isLight = theme === "light";

  function press(key: string) {
    onChange((prev) => {
      // "-" зөвхөн эхэнд, "." зөвхөн нэг удаа орохыг хязгаарлана
      if (key === "-") return prev.includes("-") ? prev : "-" + prev;
      if (key === "." && prev.includes(".")) return prev;
      return prev + key;
    });
  }

  // Энэ keypad шалгалтын дэлгэцийн ("navy" эсвэл "light" гэсэн локал toggle)
  // паапер загварыг дуурайдаг тул НЭГ л сайттай ерөнхий theme-ээс тусдаа —
  // хоёул тогтмол (invariant) байх ёстой тул brand-navy/цагаан сурф зориулж
  // үргэлж адилхан харагдана (ProblemStudentPreview.tsx-ийн navy-theme
  // carve-out-той адил зарчим — theme-хамааралтай token биш).
  // hover:bg-white/10 нь bg-brand-navy-soft дээр — navy heritage дэвсгэр тул
  // ХОЁУЛАН theme-д харанхуй хэвээр үлддэг, text-on-* шилжүүлэх шаардлагагүй.
  const keyBase = isLight
    ? "border-black/15 bg-white text-brand-navy-soft hover:bg-black/5 active:bg-black/10"
    : "border-line bg-brand-navy-soft text-brand-soft hover:bg-white/10 active:bg-white/15";

  return (
    <div className="mt-5 max-w-xs">
      {/* Одоогийн хариу */}
      <div
        className={`mb-3 flex h-12 items-center rounded-xl border px-4 font-mono text-xl ${
          isLight
            ? "border-black/15 bg-black/5 text-brand-navy-soft"
            : "border-line bg-brand-navy text-brand-soft"
        }`}
        aria-label="Таны хариу"
      >
        {value || <span className="text-ink-dim">Хариу…</span>}
      </div>

      {/* 11 цифрэн товч */}
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className={`h-12 rounded-xl border text-lg font-bold transition ${keyBase}`}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Устгах ба цэвэрлэх */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange((prev) => prev.slice(0, -1))}
          disabled={!value}
          className={`flex items-center justify-center gap-1.5 h-11 rounded-xl border text-sm font-semibold transition disabled:opacity-30 ${keyBase}`}
          aria-label="Сүүлийн цифрийг устгах"
        >
          <Delete size={16} aria-hidden />
          <span className="hidden sm:inline">Устгах</span>
        </button>
        <button
          type="button"
          onClick={() => onChange(() => "")}
          disabled={!value}
          className={`flex items-center justify-center gap-1.5 h-11 rounded-xl border text-sm font-semibold transition disabled:opacity-30 ${keyBase}`}
          aria-label="Бүх хариуг устгах"
        >
          <X size={16} aria-hidden />
          <span className="hidden sm:inline">Цэвэрлэх</span>
        </button>
      </div>
    </div>
  );
}

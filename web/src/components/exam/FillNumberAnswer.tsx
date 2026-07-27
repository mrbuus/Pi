"use client";

import { useMemo, useRef, useState } from "react";
import NumericKeypad from "@/components/NumericKeypad";
import { parseFillSlots, slotsTotalLength, type FillSlotGroup } from "./fillSlots";

/* ============================================================================
 * FillNumberAnswer — "тоо нөхөх" (ЭЕШ Хэсэг II) бодлогын хариу оруулагч.
 *
 * ХОЁР горим, бодлогын текстээс АВТОМАТ тодорхойлогдоно:
 *
 *   1) ЦИФРИЙН НҮД (SlotFill) — бодлогын текстэд [a], [de], [fgh] мэт
 *      хаалттай тэмдэглэгээ байвал, тэдгээр ТУС БҮРИЙГ нэг бүлэг болгож,
 *      үсгийн тоогоор нь тусдаа нүд (1 нүд = 1 цифр) харуулна. Ингэснээр
 *      сурагч "хэдэн оронтой хариу бичих ёстой" гэдгээ ТҮГШИЛГҮЙ шууд харна.
 *      Нүднээс нүдэнд авто шилжинэ (дараагийн нүд рүү), Backspace хоосон
 *      нүднээс өмнөх рүү буцна, доод keypad зөвхөн ИДЭВХТЭЙ нүдийг л удирдана.
 *
 *   2) ЧӨЛӨӨТ ТАЛБАР (FreeformFill) — тэмдэглэгээгүй бол өмнөх шигээ л НЭГ
 *      талбар (зөвхөн keypad-аар бичигдэнэ) — хуучин бодлогуудад зохицно.
 *
 * ЧУХАЛ: гадагш харагдах `value`/`onChange` гэрээ ХЭВЭЭРЭЭ — нэг шулуун
 * стринг ("354"). Нүднүүд бол зөвхөн ХАРАГДАЦЫН давхарга; сервер рүү
 * илгээгдэх өгөгдлийн хэлбэр огт өөрчлөгдөөгүй тул дүн бодолтод зөрчилдөхгүй.
 * ========================================================================== */

export default function FillNumberAnswer({
  problemNumber,
  statementText,
  value,
  onChange,
  theme,
}: {
  problemNumber: number;
  statementText?: string | null;
  value: string;
  // Функцэн шинэчлэл — хурдан дарахад ч цифр алдагдахгүй (stale closure-аас сэргийлнэ)
  onChange: (update: (prev: string) => string) => void;
  theme?: "navy" | "light";
}) {
  const groups = useMemo(() => parseFillSlots(statementText), [statementText]);

  if (groups.length === 0) {
    return (
      <FreeformFill problemNumber={problemNumber} value={value} onChange={onChange} theme={theme} />
    );
  }
  return (
    <SlotFill
      problemNumber={problemNumber}
      groups={groups}
      value={value}
      onChange={onChange}
      theme={theme}
    />
  );
}

/* ---------------------------- 1) Чөлөөт талбар ---------------------------- */

function FreeformFill({
  problemNumber,
  value,
  onChange,
  theme,
}: {
  problemNumber: number;
  value: string;
  onChange: (update: (prev: string) => string) => void;
  theme?: "navy" | "light";
}) {
  const inputId = `fill-answer-${problemNumber}`;

  return (
    <div>
      {/* Дэлгэц дээр харагдах "түүхий текст оролт" ХЭЗЭЭ Ч байхгүй; гол
          харилцан үйлчлэл нь том товчлууртай keypad (NumericKeypad). Гэхдээ
          дэлгэц уншигч/бодит гар ашиглагчдад зориулж inputmode="numeric"
          бүхий ЖИНХЭНЭ <input> (label-тай) sr-only байдлаар нэмж өгсөн. */}
      <label htmlFor={inputId} className="sr-only">
        {problemNumber}-р бодлогын хариу (тоо)
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        pattern="-?[0-9]*\.?[0-9]*"
        value={value}
        onChange={(e) => onChange(() => e.target.value)}
        className="sr-only"
      />
      <NumericKeypad value={value} onChange={onChange} theme={theme} />
    </div>
  );
}

/* ------------------------------ 2) Цифрийн нүд ------------------------------ */

function firstEmptyOrLast(digits: string[]): number {
  const idx = digits.findIndex((d) => !d);
  return idx === -1 ? Math.max(0, digits.length - 1) : idx;
}

function SlotFill({
  problemNumber,
  groups,
  value,
  onChange,
  theme,
}: {
  problemNumber: number;
  groups: FillSlotGroup[];
  value: string;
  onChange: (update: (prev: string) => string) => void;
  theme?: "navy" | "light";
}) {
  const total = useMemo(() => slotsTotalLength(groups), [groups]);
  // digits нь `value` prop-оос ШУУД гаргаж авсан (дотоод давхар state биш) —
  // физик гарын товчлуур (page.tsx-ийн global keydown) шууд `value`-г
  // өөрчилсөн ч энд ЯЛГААГҮЙ шинэчлэгдэнэ (эх сурвалж ганц — divergence-гүй).
  const digits = useMemo(
    () => Array.from({ length: total }, (_, i) => value[i] ?? ""),
    [value, total],
  );
  const [activeIndex, setActiveIndex] = useState(() => firstEmptyOrLast(digits));
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  function commit(next: string[]) {
    onChange(() => next.join(""));
  }
  function setDigitAt(idx: number, ch: string) {
    const next = [...digits];
    next[idx] = ch;
    commit(next);
  }
  function focusBox(idx: number) {
    if (idx < 0 || idx >= total) return;
    setActiveIndex(idx);
    boxRefs.current[idx]?.focus();
  }

  function handleBoxChange(idx: number, raw: string) {
    const ch = raw.replace(/[^0-9]/g, "").slice(-1);
    setDigitAt(idx, ch);
    if (ch && idx + 1 < total) focusBox(idx + 1);
  }
  function handleBoxKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      e.preventDefault();
      setDigitAt(idx - 1, "");
      focusBox(idx - 1);
    } else if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      focusBox(idx - 1);
    } else if (e.key === "ArrowRight" && idx + 1 < total) {
      e.preventDefault();
      focusBox(idx + 1);
    }
  }

  // Доод numeric keypad ЗӨВХӨН идэвхтэй (сүүлд focus авсан) нүдийг удирдана.
  function applyKeypadUpdate(update: (prev: string) => string) {
    const idx = activeIndex;
    const prev = digits[idx] ?? "";
    const raw = update(prev);
    if (raw === "") {
      // ⌫ эсвэл "Цэвэрлэх": нүд аль хэдийн хоосон бол өмнөх рүү буцаж цэвэрлэнэ
      if (prev === "" && idx > 0) {
        setDigitAt(idx - 1, "");
        focusBox(idx - 1);
      } else {
        setDigitAt(idx, "");
      }
      return;
    }
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    if (!digitsOnly) return; // "-"/"." зэрэг цифр бус товч — нүдэнд хамаагүй тул орхино
    setDigitAt(idx, digitsOnly.slice(-1));
    if (idx + 1 < total) focusBox(idx + 1);
  }

  return (
    <div>
      <p className="mb-3 text-xs text-ink-dim">Хариугаа нүд бүрт нэг цифрээр бичнэ үү</p>
      <div
        className="flex flex-wrap items-end gap-3"
        role="group"
        aria-label={`${problemNumber}-р бодлогын хариу, ${total} цифр`}
      >
        {groups.map((g, gi) => {
          // Мутаци/render дундах өөрчлөлтгүйгээр (React Compiler-той нийцтэй)
          // эхлэх байрлалыг өмнөх бүлгүүдийн уртаас шууд бодно (бүлгийн тоо
          // маш цөөн тул O(n²) энд асуудалгүй).
          const start = groups.slice(0, gi).reduce((sum, gg) => sum + gg.length, 0);
          return (
            <div key={`${g.key}-${gi}`} className="flex items-end gap-1.5">
              {Array.from({ length: g.length }, (_, i) => {
                const idx = start + i;
                const filled = !!digits[idx];
                const isActive = idx === activeIndex;
                return (
                  <input
                    key={idx}
                    ref={(el) => {
                      boxRefs.current[idx] = el;
                    }}
                    id={`fill-${problemNumber}-slot-${idx}`}
                    aria-label={`${problemNumber}-р бодлого, ${idx + 1}-р цифр (${total}-с)`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength={1}
                    value={digits[idx] ?? ""}
                    onFocus={() => setActiveIndex(idx)}
                    onChange={(e) => handleBoxChange(idx, e.target.value)}
                    onKeyDown={(e) => handleBoxKeyDown(idx, e)}
                    className={`h-14 w-12 rounded-lg border-2 text-center font-mono text-xl font-bold tabular-nums transition ${
                      isActive
                        ? "border-brand-bright bg-brand-bright/10 text-ink"
                        : filled
                          ? "border-line bg-panel text-ink"
                          : "border-dashed border-line text-ink-dim"
                    }`}
                  />
                );
              })}
              {gi < groups.length - 1 && (
                <span aria-hidden className="mb-4 text-lg text-ink-dim">
                  ·
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <NumericKeypad value={digits[activeIndex] ?? ""} onChange={applyKeypadUpdate} theme={theme} />
      </div>
    </div>
  );
}

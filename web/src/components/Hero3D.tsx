"use client";

import { useEffect, useRef } from "react";
import { useHeroSlot } from "./hero3d/catalog";
import { DimensionLegend } from "./hero3d/DimensionLegend";
import { BODY_KEY, buildPaths, meshOfIndex } from "./hero3d/geometry";
import { useThemeColors } from "./hero3d/theme";
import MathText from "./MathText";

/* ============================================================================
 * Нүүр хуудасны биетийн үзэсгэлэн — 10 минут тутам сургалтын хөтөлбөрийн
 * дараагийн биет эргэлдэнэ (куб, конус, цилиндр, бөмбөрцөг…).
 *
 * Геометр нь geometry.ts дотор — оройг эргүүлж перспективээр проекцлодог
 * ЦЭВЭР функцууд (тесттэй). Энэ файл нь зөвхөн зурах ажилтай.
 *
 * ГҮЙЦЭТГЭЛ: кадр бүрт React дахин рендерлэвэл 60fps-д хэдэн зуун шинэчлэлт
 * болно. Иймд өнцгийг ref-д хадгалж, зөвхөн <path> элементийн `d`-г шууд
 * бичнэ — кадр бүрт 10-хан DOM бичилт.
 * ========================================================================== */

/** Ирмэгийн бүлгүүд — biеийн ирмэг + хэмжигдэхүүн 1..4 */
const KEYS = [BODY_KEY, "m1", "m2", "m3", "m4"] as const;
type Key = (typeof KEYS)[number];

/** Бүтэн эргэлт ойролцоогоор 14 секунд — анзаарагдах ч анхаарал сарниулахгүй */
const RADIANS_PER_MS = (Math.PI * 2) / 14_000;

export default function Hero3D() {
  const { solid, index } = useHeroSlot();
  const colors = useThemeColors();

  // Бүлэг бүрт урд/хойд гэсэн 2 зам — нийт 10 элемент
  const frontRefs = useRef<Partial<Record<Key, SVGPathElement | null>>>({});
  const backRefs = useRef<Partial<Record<Key, SVGPathElement | null>>>({});

  useEffect(() => {
    const mesh = meshOfIndex(index);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Хөдөлгөөн багасгах тохиргоотой хэрэглэгчид: эргэлдэхгүй, гэхдээ хоосон
    // биш — биетийг таниулах өнцөгт нэг удаа зурна.
    const draw = (angle: number) => {
      const { back, front } = buildPaths(mesh, angle);
      for (const key of KEYS) {
        // Хоосон бүлгийг "" болгож цэвэрлэнэ — өмнөх кадрын үлдэгдэл үлдэхгүй
        backRefs.current[key]?.setAttribute("d", back.get(key) ?? "");
        frontRefs.current[key]?.setAttribute("d", front.get(key) ?? "");
      }
    };

    if (reduced) {
      draw(0.7);
      return;
    }

    let raf = 0;
    let angle = 0.7;
    let last = performance.now();

    const tick = (now: number) => {
      // Таб нуугдаад буцаж ирэхэд том үсрэлт гаргахгүйн тулд алхмыг хязгаарлана
      const dt = Math.min(now - last, 64);
      last = now;
      angle += dt * RADIANS_PER_MS;
      draw(angle);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Нуугдсан таб дээр зурах нь батерей дэмий иддэг
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [index]);

  const colorOf = (key: Key) =>
    key === BODY_KEY ? colors.body : colors[key as "m1" | "m2" | "m3" | "m4"];

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full max-h-[300px] max-w-[300px]"
          aria-hidden
        >
          {/* Хойд ирмэгүүд — бүдэг. Гүний мэдрэмж ҮҮНЭЭС гарна: бүгдийг ижил
              тодоор зурвал дүрс «утсан бөмбөг» болж, ямар талаараа эргэж
              байгаа нь уншигдахгүй. */}
          <g strokeLinecap="round" strokeLinejoin="round" fill="none">
            {KEYS.map((key) => (
              <path
                key={`back-${key}`}
                ref={(el) => {
                  backRefs.current[key] = el;
                }}
                stroke={colorOf(key)}
                strokeWidth={key === BODY_KEY ? 1 : 1.6}
                opacity={0.22}
              />
            ))}
            {KEYS.map((key) => (
              <path
                key={`front-${key}`}
                ref={(el) => {
                  frontRefs.current[key] = el;
                }}
                stroke={colorOf(key)}
                strokeWidth={key === BODY_KEY ? 1.3 : 2.4}
                opacity={key === BODY_KEY ? 0.75 : 1}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Доод тайлбарын легенд */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl border border-line bg-panel/90 px-4 py-3 text-left shadow-xl shadow-black/20 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-bold text-ink">
            {solid.title}
          </p>
          <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-bold text-brand">
            <MathText>{solid.formula}</MathText>
          </span>
        </div>
        <DimensionLegend dims={solid.dims} colors={colors} />
      </div>
    </>
  );
}

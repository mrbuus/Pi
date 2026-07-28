"use client";

import { useEffect, useState } from "react";

/* ============================================================================
 * Тема (light/dark)-той уялдсан 3D-ийн өнгөнүүд.
 * canvas дотор Tailwind классуудыг ашиглаж чадахгүй тул globals.css-ийн CSS
 * хувьсагчдыг runtime-д getComputedStyle-ээр уншиж, Three.js материалд дамжуулна.
 *
 * m1..m4 нь ХЭМЖИГДЭХҮҮНИЙ өнгөнүүд — нэг биет дээр хэд хэдэн шугам зэрэг
 * зурагдахад тус бүр ӨӨР өнгөтэй, тод ялгарч харагдахын тулд globals.css-ийн
 * WCAG-шалгагдсан accent өнгүүдийг (teal/gold/violet/sky) ашигладаг — LIGHT ба
 * DARK хоёуланд тодорхой уншигдана.
 * ========================================================================== */

export interface ThemeColors {
  body: string; // биеийн wireframe — брэндийн хөх
  soft: string; // зөөлөн тодруулга — edges/particles/тэгш өнцгийн тэмдэг
  m1: string; // хэмжигдэхүүн 1 — teal
  m2: string; // хэмжигдэхүүн 2 — gold
  m3: string; // хэмжигдэхүүн 3 — violet
  m4: string; // хэмжигдэхүүн 4 — sky
}

const FALLBACK_COLORS: ThemeColors = {
  body: "#4f7fe6",
  soft: "#9db8f5",
  m1: "#34d6a8",
  m2: "#e8c468",
  m3: "#a78bfa",
  m4: "#5ec9f8",
};

function readThemeColors(): ThemeColors {
  if (typeof window === "undefined") return FALLBACK_COLORS;
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const value = style.getPropertyValue(name).trim();
    return value || fallback;
  };
  return {
    body: read("--brand-bright", FALLBACK_COLORS.body),
    soft: read("--brand-soft", FALLBACK_COLORS.soft),
    m1: read("--teal", FALLBACK_COLORS.m1),
    m2: read("--gold", FALLBACK_COLORS.m2),
    m3: read("--violet", FALLBACK_COLORS.m3),
    m4: read("--sky", FALLBACK_COLORS.m4),
  };
}

// Хэрэглэгчийн сонгосон загвар (light/system/dark) солигдоход канвасын
// материалын өнгийг шууд шинэчилнэ — дахин ачаалах шаардлагагүй.
export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(FALLBACK_COLORS);

  useEffect(() => {
    const update = () => setColors(readThemeColors());
    update();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", update);

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      media.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);

  return colors;
}

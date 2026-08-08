"use client";

import { useHeroSolid } from "./hero3d/catalog";
import { DimensionLegend } from "./hero3d/DimensionLegend";
import { useThemeColors } from "./hero3d/theme";
import MathText from "./MathText";
import { useMemo } from "react";

/* ============================================================================
 * Нүүр хуудасны 3D биетийн үзэсгэлэн — CSS 3D perspective + transform ашигла.
 *
 * Сүлжээнээс нэмэлт датаа татахгүй, WebGL хориотой. Эффект бүр цэвэр CSS.
 * ========================================================================== */

export default function Hero3D() {
  const solid = useHeroSolid();
  const colors = useThemeColors();

  // Хөдөлгөөн багасгах тохиргоотой хэрэглэгчид анимацгүй статик харагдац
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  return (
    <>
      {/* CSS 3D дүрсжүүлэлт: perspective + rotateY анимац */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          perspective: "1200px",
        }}
      >
        <div
          className="animate-spin-slow"
          style={{
            width: "280px",
            height: "280px",
            transformStyle: "preserve-3d",
            animation: reducedMotion ? "none" : "spin-y 8s linear infinite",
          } as React.CSSProperties}
        >
          {/* CSS дүрсжүүлэлтийн биет — SVG эсвэл div shapes */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{
              filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.1))",
            }}
          >
            {/* Геометрийн дүрс — хүрээлэлтээр сүүдэр */}
            <defs>
              <linearGradient
                id="grad1"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" style={{ stopColor: colors.body, stopOpacity: 0.8 }} />
                <stop offset="100%" style={{ stopColor: colors.m1, stopOpacity: 0.6 }} />
              </linearGradient>
            </defs>
            {/* Сфер эсвэл куб дүрсжүүлэлт */}
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="url(#grad1)"
              opacity="0.7"
            />
            <circle
              cx="50"
              cy="50"
              r="28"
              fill="none"
              stroke={colors.body}
              strokeWidth="1.5"
              opacity="0.5"
            />
            <circle
              cx="50"
              cy="50"
              r="20"
              fill="none"
              stroke={colors.m1}
              strokeWidth="1"
              opacity="0.4"
            />
          </svg>
        </div>

        {/* CSS анимацийн тодорхойлолт */}
        <style>{`
          @keyframes spin-y {
            from {
              transform: rotateY(0deg) rotateX(15deg);
            }
            to {
              transform: rotateY(360deg) rotateX(15deg);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-spin-slow {
              animation: none !important;
            }
          }
        `}</style>
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

"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import { useHeroSolid } from "./hero3d/catalog";
import { DimensionLegend } from "./hero3d/DimensionLegend";
import { Particles } from "./hero3d/primitives";
import { useThemeColors } from "./hero3d/theme";
import MathText from "./MathText";

/* ============================================================================
 * Нүүр хуудасны 3D биетийн үзэсгэлэн (Шийдвэр 10) — 10 минут тутам каталогийн
 * дараагийн биетийг детерминистикаар харуулна (хэрэглэгч бүрт ижил, сервер
 * дуудлагагүй). Биет тус бүрийн гол хэмжигдэхүүнүүд (r, h, a...) өөр өөр
 * өнгөөр тодруулагдаж, доод картанд нэр + томьёотойгоор тайлбарлагдана.
 *
 * Задаргаа: hero3d/theme.ts (өнгө), hero3d/primitives.tsx (хэмжилтийн шугам,
 * материал, тоос), hero3d/catalog.tsx (биетүүд + цагийн слот сонголт),
 * hero3d/DimensionLegend.tsx (доод легенд).
 * ========================================================================== */

export default function Hero3D() {
  const solid = useHeroSolid();
  const colors = useThemeColors();
  // Хөдөлгөөн багасгах тохиргоотой хэрэглэгчид авто эргэлтгүй, зөвхөн
  // өөрөө эргүүлэх үед рендерлэнэ (сул төхөөрөмжид ч хөнгөн)
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  return (
    <>
      {/* Canvas-ыг absolute давхаргад хийнэ: canvas инлайн px өргөнөө layout-д
          тулгаж grid баганыг томруулдаг (агшихад түгждэг) асуудлыг таслана —
          хэмжээ нь зөвхөн эцэг wrapper-ийн CSS-ээс тодорно */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0.4, 3.9], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
          frameloop={reducedMotion ? "demand" : "always"}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={80} color={colors.body} />
          <pointLight position={[-5, -3, 2]} intensity={40} color={colors.m1} />
          {/* Биетийг багасгаж дээшлүүлнэ — доод тайлбарын карт халхлахгүй (Ё) */}
          <group scale={0.72} position={[0, 0.55, 0]}>
            {solid.render(colors)}
          </group>
          {!reducedMotion && <Particles color={colors.soft} />}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={!reducedMotion}
            autoRotateSpeed={1.1}
          />
        </Canvas>
      </div>
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

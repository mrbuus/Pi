"use client";

import type { ReactNode } from "react";
import GeoField from "../core/GeoField";
import type { GeoKind } from "../core/geoInput";

/* ============================================================================
 * Дүрсийн хэмжээний талбар — гулсуургүй (эзэн 2026-11-02). Утсан дээр
 * геометрийн гар, компьютерт физик гар (core/GeoField.tsx).
 * step=1 ба нэгжгүй бол бүхэл тоо (олон өнцөгтийн өнцгийн тоо), «°» нэгжтэй бол өнцөг.
 * ========================================================================== */

interface Props {
  label: ReactNode;
  /** Дэлгэц уншигч ба гарын гарчиг */
  name: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  /** Хуучин гулсуурын алхам — одоо зөвхөн бүхэл тоо эсэхийг заана */
  step?: number;
  suffix?: ReactNode;
  kind?: GeoKind;
}

export default function Field({ label, name, value, onChange, min, max, step = 0.5, suffix, kind }: Props) {
  const k: GeoKind = kind ?? (suffix ? "angle" : step === 1 ? "integer" : "length");
  return <GeoField label={label} name={name} value={value} onChange={onChange} min={min} max={max} kind={k} suffix={suffix} />;
}

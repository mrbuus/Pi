/* ============================================================================
 * Зургийн «хэл»: загвар болон чөлөөт горим хоёулаа эдгээр анхдагч дүрсийг
 * үүсгэж, FigureSvg нэг л газар зурна. Координат математикийнх (y дээш).
 * Шошго, тэмдэг (өнцгийн нум, зураас) пикселээр тогтмол хэмжээтэй.
 * ========================================================================== */

import type { Pt } from "./geom.ts";
import type { Val } from "./fmt.ts";

/** ink — үндсэн хар; brand — нэмэлт шугам; dim — туслах; accent — онцлох */
export type Tone = "ink" | "brand" | "dim" | "accent";

export type Prim =
  /** Битүү олон өнцөгт (fill: маш зөөлөн --brand-tint) */
  | { k: "poly"; pts: Pt[]; fill?: boolean; tone?: Tone; dash?: boolean; w?: number }
  | { k: "seg"; a: Pt; b: Pt; tone?: Tone; dash?: boolean; w?: number }
  /** Төгсгөлгүй шулуун: p цэгээр d чиглэлд */
  | { k: "line"; p: Pt; d: Pt; tone?: Tone; dash?: boolean; w?: number }
  /** Цацраг: p-ээс d чиглэлд */
  | { k: "ray"; p: Pt; d: Pt; tone?: Tone; dash?: boolean; w?: number }
  | { k: "circle"; c: Pt; r: number; tone?: Tone; dash?: boolean; w?: number }
  /** Нум: a0-аас a1 хүртэл цагийн зүүний эсрэг (радиан, математик) */
  | { k: "arc"; c: Pt; r: number; a0: number; a1: number; tone?: Tone; dash?: boolean; w?: number }
  /** Будсан муж: sector — төв+нум, segment — хөвч+нум */
  | { k: "region"; kind: "sector" | "segment"; c: Pt; r: number; a0: number; a1: number; strong?: boolean }
  | { k: "dot"; p: Pt; tone?: Tone; hollow?: boolean; r?: number }
  /** Шошго: away цэгээс холдох чиглэлд px зайтай (оройн нэр) */
  | { k: "label"; p: Pt; text: string; away?: Pt; dir?: Pt; gap?: number; size?: number; tone?: Tone; italic?: boolean }
  /**
   * Өнцгийн тэмдэг v оройд: v→a цацрагаас v→b хүртэл.
   * ccw=true бол яг цагийн зүүний эсрэг (180-аас их байж болно), үгүй бол бага өнцөг.
   */
  | { k: "angle"; v: Pt; a: Pt; b: Pt; text?: string; right?: boolean; arcs?: number; tone?: Tone; ccw?: boolean; r?: number }
  /** Тэнцүү хэрчмийн зураас (n ширхэг) хэрчмийн дунд */
  | { k: "ticks"; a: Pt; b: Pt; n: number; tone?: Tone; at?: number }
  /** Талын шошго: inside цэгийн эсрэг талд, хэрчмийн дундаас холдуулна */
  | { k: "side"; a: Pt; b: Pt; text: string; inside: Pt; tone?: Tone; size?: number };

/**
 * Нэг үр дүнгийн мөр: sym = steps[0] = steps[1] = … = утга.
 * Дэлгэцэнд алхам бүр тусдаа мөрөнд (тэнцүүгээр тэгшилсэн), утга нь яг
 * хэлбэрээр, ойролцоо утга нь дор нь саарал.
 */
export interface Row {
  /** Зүүн тал: «S», «h_a», «\angle B» */
  sym: string;
  /** Томьёо ба орлуулалт (тэнцүүгийн тэмдэггүй) */
  steps?: string[];
  v: Val;
  /** Нэгжийн LaTeX залгавар */
  unit?: string;
}

export interface Metric {
  /** Монгол нэр («Талбай») */
  name: string;
  rows?: Row[];
  /** Энгийн бичвэр (төрөл г.м.) */
  text?: string;
  /** Гол үр дүн — эхэнд том картаар */
  key?: boolean;
  /** Гол картад зөвхөн энэ мөрийг харуулна (Герон: зөвхөн S) */
  brief?: number;
  /** Нэг мөрт LaTeX ($-гүй) — rows-оос үүснэ (хуучин хэлбэр, тест, хуулах) */
  tex?: string;
}

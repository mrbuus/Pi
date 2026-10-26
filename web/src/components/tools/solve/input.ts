/* ============================================================================
 * Хэрэглэгчийн бичвэрийг задлагчид ойлгогдох хэлбэрт:
 *   кирилл «х», «у» → x, y;  «:» → «/»;  доод индекс «log₂» → log_2;
 *   «30°» → градус;  C(n,k), A(n,k) → факториалын томьёо
 * ========================================================================== */

const SUB: Record<string, string> = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };

export class InputError extends Error {}

export function prepare(src: string, opts: { degrees?: boolean } = {}): string {
  let s = src
    .replace(/[хХ]/g, "x")
    .replace(/[уУ]/g, "y")
    .replace(/ /g, " ")
    .replace(/[₀-₉]+/g, (m) => `_${[...m].map((c) => SUB[c]).join("")}`)
    .replace(/(\d)\s*:\s*(?=[\d(a-zA-Z])/g, "$1/")
    .replace(/\)\s*:\s*(?=[\d(a-zA-Z])/g, ")/");
  if (/≠|!=/.test(s)) throw new InputError("«≠» тэмдгийг ойлгохгүй — тэгшитгэл эсвэл тэнцэтгэл биш оруулна уу");
  // градус
  s = opts.degrees ? s.replace(/°/g, "") : s.replace(/(\d+(?:\.\d+)?)\s*°/g, "($1*pi/180)");
  s = expandComb(s);
  return s;
}

/** C(n,k) → n!/(k!(n-k)!), A(n,k) → n!/(n-k)! — хаалт дотор хаалтгүй аргумент */
export function expandComb(s: string): string {
  return s
    .replace(/\bC\s*\(\s*([^,;()]+?)\s*[,;]\s*([^,;()]+?)\s*\)/g, "(($1)!/(($2)!*(($1)-($2))!))")
    .replace(/\bA\s*\(\s*([^,;()]+?)\s*[,;]\s*([^,;()]+?)\s*\)/g, "(($1)!/((($1)-($2))!))");
}

/** «C(10,3)», «A(5,2)», «20!» хэлбэр бол бүхэл аргументуудыг буцаана */
export function combPattern(src: string): { kind: "C" | "A" | "F"; n: number; k: number } | null {
  const s = src.replace(/\s/g, "");
  let m = /^([CA])\((\d+)[,;](\d+)\)$/.exec(s);
  if (m) return { kind: m[1] as "C" | "A", n: Number(m[2]), k: Number(m[3]) };
  m = /^(\d+)!$/.exec(s);
  if (m) return { kind: "F", n: Number(m[1]), k: 0 };
  return null;
}

/** Олон мөрийг тусгаарлах (систем): шинэ мөр эсвэл «;» (хаалтнаас гадна) */
export function splitLines(src: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of src) {
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    if (ch === ")" || ch === "]" || ch === "}") depth--;
    if ((ch === "\n" || ch === ";") && depth <= 0) { if (cur.trim()) out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

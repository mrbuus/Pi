/* ============================================================================
 * MathLive-ийн LaTeX → манай задлагчийн (core/expr.ts) бичвэр.
 *
 *   \frac{a}{b}        → ((a)/(b))          2\frac{1}{3} (холимог тоо) → (2+1/3)
 *   \sqrt{x}, \sqrt[3]{x}, \sqrt[n]{x} → sqrt(x), cbrt(x), root(n,x)
 *   x^{2}              → x^(2)              \left|x\right| → |x|
 *   \cdot \times \div  → * * /              \le \ge \ne    → <= >= !=
 *   \sin \operatorname{tg} \log_{2} \ln \lg → sin tg log_(2) ln lg
 *   \begin{cases}a\\b\end{cases}, a\\b      → мөр бүр шинэ мөрөнд (систем)
 *   C_{n}^{k}, \binom{n}{k} → C(n,k)        A_{n}^{k} → A(n,k)
 *
 * Латин үсэг бүрийг тусад нь (зайтай) гаргана — MathLive дээр «l», «n»-ийг
 * тус тусад нь бичвэл ln функц БИШ l·n. Функц зөвхөн \ln, \operatorname{..}-оос.
 *
 * Мөн матанализын бичлэгийг таньна (parseCalculus): \frac{d}{dx}(...),
 * \int ... dx, \int_a^b ... dx, \lim_{x\to a} ..., (...)'.
 *
 * Импортгүй цэвэр модуль — `node --test` шууд ачаална.
 * ========================================================================== */

export class LatexError extends Error {}
/** Оролт ДУТУУ (хоосон нүд, хаалт хаагдаагүй) — бичиж байх үед алдаа харуулахгүй */
export class IncompleteError extends LatexError {}

/** Алдаа нь «дутуу оролт» мөн эсэх (LaTeX эсвэл задлагчийн мессеж) */
export function isIncomplete(e: unknown): boolean {
  if (e instanceof IncompleteError) return true;
  const m = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  return /дутуу|хоосон|бөглөнө|бичнэ үү/i.test(m);
}

/* ---------- Таслал: аравтын таслал ба системийн тусгаарлагч ---------- */

/** Хаалт/бүлгээс гадуурх таслалаар хуваана */
function splitTopCommas(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && s[i + 1] === "{") { cur += "\\{"; i++; continue; }
    if (c === "{" || c === "(" || c === "[") depth++;
    if (c === "}" || c === ")" || c === "]") depth--;
    if (c === "," && depth === 0 && s.slice(i - 1, i + 2) !== "{,}") { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

const REL_RE = /=|<|>|\\(le|ge|leq|geq|lt|gt|leqslant|geqslant)(?![a-z])/;

/**
 * «2x+y=5, x-y=1» → систем (мөр бүр); «2,5» → 2.5 (Монголд аравтын таслал).
 * «12,18,30» (3+ бүхэл) жагсаалт хэвээр. Функцийн хаалт доторх таслал (C(10,3)) хэвээр.
 */
export function normalizeCommas(latex: string): string {
  const parts = splitTopCommas(latex);
  if (parts.length > 1 && parts.every((p) => REL_RE.test(p) && p.trim())) return parts.join("\\\\");
  let out = "";
  const stack: boolean[] = []; // true — функцийн аргументын хаалт
  for (let i = 0; i < latex.length; i++) {
    const c = latex[i];
    if (c === "(") {
      const before = out.replace(/\\(left|mleft|bigl|Bigl)\s*$/, "").trimEnd();
      stack.push(/[a-zA-Z}]$/.test(before) && !/\\(cdot|times|div|right|mright)$/.test(before));
    } else if (c === ")") stack.pop();
    if (c === "," && /\d/.test(latex[i - 1] ?? "") && /\d/.test(latex[i + 1] ?? "") && !stack[stack.length - 1]) {
      // Өмнө нь эсвэл хойно нь өөр «,цифр» байвал жагсаалт (12,18,30)
      let j = i - 1;
      while (j >= 0 && /\d/.test(latex[j])) j--;
      let k = i + 1;
      while (k < latex.length && /\d/.test(latex[k])) k++;
      const listBefore = latex[j] === "," && /\d/.test(latex[j - 1] ?? "");
      const listAfter = latex[k] === "," && /\d/.test(latex[k + 1] ?? "");
      if (!listBefore && !listAfter) {
        out += ".";
        continue;
      }
    }
    out += c;
  }
  return out;
}

type Tok =
  | { k: "cmd"; v: string } // \frac, \, , \\ г.м.
  | { k: "ch"; v: string } // ганц тэмдэгт (үсэг, цифр, + - ( ) …)
  | { k: "open" } // {
  | { k: "close" }; // }

/* ---------- Токен ---------- */

function tokenize(src: string): Tok[] {
  const s = src.replace(/\{,\}/g, ".").replace(/[−–]/g, "-");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      const m = /^\\([a-zA-Z]+)/.exec(s.slice(i));
      if (m) {
        out.push({ k: "cmd", v: m[1] });
        i += m[0].length;
      } else {
        out.push({ k: "cmd", v: s[i + 1] ?? "" });
        i += 2;
      }
      continue;
    }
    if (c === "{") { out.push({ k: "open" }); i++; continue; }
    if (c === "}") { out.push({ k: "close" }); i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    out.push({ k: "ch", v: c });
    i++;
  }
  return out;
}

const FUNCS = new Set([
  "sin", "cos", "tan", "cot", "sec", "csc", "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh",
  "ln", "lg", "log", "exp",
]);
/** \operatorname{..} / \mathrm{..} доторх нэр → задлагчийн нэр */
const OPNAMES: Record<string, string> = {
  tg: "tg", ctg: "ctg", cotg: "ctg", arctg: "arctg", arcctg: "arcctg", arccot: "arcctg", tan: "tg", cot: "ctg",
  sgn: "sgn", sign: "sgn", abs: "abs", sin: "sin", cos: "cos", ln: "ln", lg: "lg", log: "log", exp: "exp",
  arcsin: "arcsin", arccos: "arccos", arctan: "arctg",
};
const SPACES = new Set([",", ";", ":", "!", " ", "quad", "qquad", "enspace", "thinspace", "medspace", "thickspace", "displaystyle", "textstyle", "limits", "nolimits"]);
const MULS = new Set(["cdot", "times", "ast", "bullet"]);
const RELS: Record<string, string> = {
  le: "<=", leq: "<=", leqslant: "<=", ge: ">=", geq: ">=", geqslant: ">=", lt: "<", gt: ">", ne: "!=", neq: "!=",
};

/* ---------- Хөрвүүлэгч ---------- */

class Conv {
  t: Tok[];
  i = 0;
  constructor(t: Tok[]) {
    this.t = t;
  }
  peek(o = 0): Tok | undefined { return this.t[this.i + o]; }
  next(): Tok | undefined { return this.t[this.i++]; }

  /** Бүлэг { … } -ийн доторх токенууд (эсвэл ганц токен) */
  argTokens(): Tok[] {
    const t = this.next();
    if (!t) throw new IncompleteError("Илэрхийлэл дутуу байна");
    if (t.k === "open") {
      const start = this.i;
      let depth = 1;
      while (this.i < this.t.length) {
        const x = this.t[this.i];
        if (x.k === "open") depth++;
        if (x.k === "close" && --depth === 0) break;
        this.i++;
      }
      const inner = this.t.slice(start, this.i);
      this.i++; // }
      return inner;
    }
    if (t.k === "cmd") {
      // \frac12 гэх мэт: командыг аргументтай нь хамт авна
      const start = this.i - 1;
      this.i = start;
      this.one();
      return this.t.slice(start, this.i);
    }
    return [t];
  }

  /** Аргументыг хөрвүүлсэн бичвэр */
  arg(): string {
    return convertTokens(this.argTokens());
  }

  /** Бүлгийн доторх энгийн бичвэр (\operatorname{tg} → "tg") */
  rawArg(): string {
    return this.argTokens().map((x) => (x.k === "ch" ? x.v : x.k === "cmd" ? (x.v === " " ? " " : "") : "")).join("");
  }

  /** [n] сонголттой аргумент (\sqrt[3]) */
  optArg(): string | null {
    const t = this.peek();
    if (!t || t.k !== "ch" || t.v !== "[") return null;
    this.next();
    const start = this.i;
    let depth = 0;
    while (this.i < this.t.length) {
      const x = this.t[this.i];
      if (x.k === "open") depth++;
      if (x.k === "close") depth--;
      if (depth === 0 && x.k === "ch" && x.v === "]") break;
      this.i++;
    }
    const inner = this.t.slice(start, this.i);
    this.i++;
    return convertTokens(inner);
  }

  all(): string {
    let out = "";
    while (this.i < this.t.length) out += this.one();
    return out;
  }

  delim(t: Tok | undefined, side: "l" | "r"): string {
    if (!t) return "";
    if (t.k === "ch") {
      if (t.v === "(" || t.v === "[") return "(";
      if (t.v === ")" || t.v === "]") return ")";
      if (t.v === "|") return "|";
      if (t.v === ".") return "";
      return t.v;
    }
    if (t.k === "cmd") {
      if (t.v === "{" || t.v === "lbrace" || t.v === "lbrack" || t.v === "langle") return "(";
      if (t.v === "}" || t.v === "rbrace" || t.v === "rbrack" || t.v === "rangle") return ")";
      if (t.v === "vert" || t.v === "lvert" || t.v === "rvert" || t.v === "|" || t.v === "mid") return "|";
      if (t.v === "Vert" || t.v === "lVert" || t.v === "rVert") return "|";
    }
    return side === "l" ? "(" : ")";
  }

  /** Нэг нэгж хөрвүүлнэ */
  one(): string {
    const t = this.next()!;
    if (t.k === "open") {
      this.i--;
      const inner = this.arg();
      return inner.trim() ? `(${inner})` : "";
    }
    if (t.k === "close") return "";
    if (t.k === "ch") return this.char(t.v);
    return this.cmd(t.v);
  }

  char(c: string): string {
    if (/[a-zA-Z]/.test(c)) {
      // C_{n}^{k}, A_{n}^{k} — хослол, байрлал
      if ((c === "C" || c === "A") && this.isSubSup()) return this.comb(c);
      return ` ${c} `;
    }
    if (/[0-9.]/.test(c)) {
      // 2\frac{1}{3} — холимог тоо
      const nx = this.peek();
      if (/[0-9]/.test(c) && nx && nx.k === "cmd" && /^[dt]?frac$/.test(nx.v) && !/[0-9.]/.test(this.peekCh(1))) {
        const mixed = this.tryMixed();
        if (mixed) return `${c}${mixed}`;
      }
      return c;
    }
    if (c === "^") {
      const s = this.supArg();
      return /^[\u0001\u0002]/.test(s) ? s : `^${s}`;
    }
    if (c === "_") return `_(${this.arg()})`;
    if (c === "&") return "";
    if (c === "'") return "'";
    if (c === "·" || c === "×") return "*";
    if (c === "÷") return "/";
    if (c === "≤") return "<=";
    if (c === "≥") return ">=";
    return c;
  }

  peekCh(o: number): string {
    const t = this.t[this.i + o - 1];
    return t && t.k === "ch" ? t.v : "";
  }

  /** «2» дараа нь \frac{1}{3}: хүртвэр, хуваарь цэвэр бүхэл бол холимог тоо */
  tryMixed(): string | null {
    // өмнөх тэмдэгт цифр бол (12\frac..) эхний цифрээс шалгах шаардлагагүй — бүхэл хэсгийг char() аль хэдийн гаргасан
    const save = this.i;
    this.next(); // \frac
    const a = this.argTokens(), b = this.argTokens();
    const isInt = (ts: Tok[]) => ts.length > 0 && ts.every((x) => x.k === "ch" && /[0-9]/.test(x.v));
    if (isInt(a) && isInt(b)) {
      const num = a.map((x) => (x as { v: string }).v).join(""), den = b.map((x) => (x as { v: string }).v).join("");
      return `\u0000${num}/${den}`;
    }
    this.i = save;
    return null;
  }

  isSubSup(): boolean {
    const a = this.peek(), b = this.peek(1);
    if (!a || a.k !== "ch" || (a.v !== "_" && a.v !== "^")) return false;
    // _{..}^{..} эсвэл ^{..}_{..}
    let j = this.i + 1;
    const skip = () => {
      const x = this.t[j];
      if (!x) return false;
      if (x.k !== "open") { j++; return true; }
      let d = 0;
      for (; j < this.t.length; j++) {
        if (this.t[j].k === "open") d++;
        if (this.t[j].k === "close" && --d === 0) { j++; return true; }
      }
      return false;
    };
    if (!b) return false;
    if (!skip()) return false;
    const c = this.t[j];
    return !!c && c.k === "ch" && (c.v === "^" || c.v === "_") && c.v !== a.v;
  }

  comb(c: string): string {
    let n = "", k = "";
    for (let r = 0; r < 2; r++) {
      const op = this.next() as { v: string };
      const v = this.arg();
      if (op.v === "_") n = v; else k = v;
    }
    return ` ${c}(${n.trim()},${k.trim()}) `;
  }

  /** Зэргийн аргумент: ^{\circ} → градус, ^{\prime} → ' */
  supArg(): string {
    const ts = this.argTokens();
    if (ts.length === 1 && ts[0].k === "cmd" && (ts[0].v === "circ" || ts[0].v === "degree")) return "\u0001";
    if (ts.length >= 1 && ts.every((x) => x.k === "cmd" && (x.v === "prime" || x.v === "doubleprime"))) {
      return "\u0002".repeat(ts.reduce((s, x) => s + ((x as { v: string }).v === "doubleprime" ? 2 : 1), 0));
    }
    const inner = convertTokens(ts).trim();
    if (!inner) throw new IncompleteError("Зэргийн илтгэгчийг бичнэ үү");
    return /^[0-9]$|^[a-zA-Z]$/.test(inner) ? inner : `(${inner})`;
  }

  cmd(v: string): string {
    if (v === "frac" || v === "dfrac" || v === "tfrac" || v === "cfrac") {
      const a = this.arg().trim(), b = this.arg().trim();
      if (!a || !b) throw new IncompleteError("Бутархайн хүртвэр, хуваарийг бөглөнө үү");
      return `((${a})/(${b}))`;
    }
    if (v === "sqrt") {
      const n = this.optArg();
      const x = this.arg().trim();
      if (!x) throw new IncompleteError("Язгуурын доторх илэрхийллийг бичнэ үү");
      const nn = n?.trim();
      if (!nn || nn === "2") return ` sqrt(${x}) `;
      if (nn === "3") return ` cbrt(${x}) `;
      return ` root(${nn},${x}) `;
    }
    if (v === "binom" || v === "dbinom" || v === "tbinom") {
      const a = this.arg().trim(), b = this.arg().trim();
      return ` C(${a},${b}) `;
    }
    if (v === "left" || v === "mleft" || v === "bigl" || v === "Bigl" || v === "biggl") return this.delim(this.next(), "l");
    if (v === "right" || v === "mright" || v === "bigr" || v === "Bigr" || v === "biggr") return this.delim(this.next(), "r");
    if (v === "middle") return this.delim(this.next(), "l");
    if (MULS.has(v)) return "*";
    if (v === "div") return "/";
    if (v in RELS) return RELS[v];
    if (v === "pi") return " pi ";
    if (v === "infty" || v === "infin") return " inf ";
    if (v === "exponentialE") return " e ";
    if (v === "differentialD") return " d ";
    if (v === "imaginaryI") throw new LatexError("Комплекс тоог бодохгүй");
    if (v === "circ" || v === "degree") return "\u0001";
    if (v === "prime") return "\u0002";
    if (FUNCS.has(v)) return ` ${v} `;
    if (v === "operatorname" || v === "mathrm" || v === "mathit" || v === "mathbf" || v === "text" || v === "textrm" || v === "mathsf") {
      const raw = this.rawArg().trim();
      if (raw in OPNAMES) return ` ${OPNAMES[raw]} `;
      if (/^[a-zA-Z]$/.test(raw)) {
        if ((raw === "C" || raw === "A") && this.isSubSup()) return this.comb(raw);
        return ` ${raw} `;
      }
      if (!raw) return "";
      if (/^[a-zA-Z]+$/.test(raw)) return ` ${raw.split("").join(" ")} `;
      throw new LatexError(`«${raw}» гэдгийг ойлгосонгүй`);
    }
    if (v === "vert" || v === "lvert" || v === "rvert" || v === "|" || v === "mid") return "|";
    if (v === "{" || v === "lbrace") return "(";
    if (v === "}" || v === "rbrace") return ")";
    if (v === "%") return "/100";
    if (v === "\\" || v === "newline" || v === "cr") return "\n";
    if (v === "begin" || v === "end") {
      this.rawArg(); // орчны нэр (cases, aligned …)
      return v === "end" ? "\n" : "";
    }
    if (v === "displaylines") return this.arg();
    if (v === "placeholder") throw new IncompleteError("Хоосон нүдийг бөглөнө үү");
    if (SPACES.has(v)) return " ";
    if (v === "to" || v === "rightarrow" || v === "longrightarrow") return "\u0003";
    if (v === "lfloor" || v === "lceil") return " floor(";
    if (v === "rfloor" || v === "rceil") return ")";
    if (v === "pm" || v === "mp") throw new LatexError("«±» тэмдгийг ойлгохгүй — тус тусад нь бичнэ үү");
    if (v === "alpha" || v === "beta" || v === "gamma" || v === "theta" || v === "varphi" || v === "phi") {
      throw new LatexError("Грек үсгийн оронд латин үсэг ($x$, $a$ г.м.) хэрэглэнэ үү");
    }
    throw new LatexError(`«\\${v}» тэмдэгтийг ойлгосонгүй`);
  }
}

function convertTokens(t: Tok[]): string {
  return new Conv(t).all();
}

/** Дотоод тэмдэглэгээг (холимог тоо, градус, prime) задлагчийн бичлэгт */
function finish(s: string): string {
  let out = s
    // 2\u00001/3 → (2+1/3)
    .replace(/(\d+)\u0000(\d+)\/(\d+)/g, "($1+$2/$3)")
    .replace(/\u0001/g, "°")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
  if (/\u0002/.test(out)) throw new LatexError("Уламжлалын тэмдгийг ойлгосонгүй — «Уламжлал» товчийг ашиглана уу");
  if (/\u0003/.test(out)) throw new LatexError("Хязгаарын бичлэгийг ойлгосонгүй");
  out = out.replace(/\n{2,}/g, "\n").replace(/^\n+|\n+$/g, "");
  // Хоосон хаалт «()» — нүдийг бөглөөгүй
  if (/\(\s*\)|\|\s*\|/.test(out)) throw new IncompleteError("Хаалтын доторхыг бичнэ үү");
  return out;
}

/** LaTeX → задлагчийн бичвэр. Алдаа бол LatexError (монгол мессеж) */
export function latexToText(latex: string): string {
  if (!latex.trim()) return "";
  return finish(convertTokens(tokenize(normalizeCommas(latex))));
}

/* ---------- Матанализын бичлэг ---------- */

export interface CalcSpec {
  kind: "deriv" | "int" | "defint" | "lim";
  /** Функц (задлагчийн бичвэр) */
  body: string;
  order?: number;
  a?: string;
  b?: string;
  to?: string;
}

const isD = (t: Tok | undefined) => !!t && ((t.k === "ch" && t.v === "d") || (t.k === "cmd" && t.v === "differentialD"));

/** {d} {\mathrm{d}} {d^{2}} → эрэмбэ; биш бол null */
function dOrder(ts: Tok[], wantX: boolean): number | null {
  let i = 0;
  const skipRm = () => {
    // \mathrm{d} → d
    if (ts[i]?.k === "cmd" && ((ts[i] as { v: string }).v === "mathrm" || (ts[i] as { v: string }).v === "operatorname") && ts[i + 1]?.k === "open" && isD(ts[i + 2]) && ts[i + 3]?.k === "close") {
      i += 4;
      return true;
    }
    if (isD(ts[i])) { i++; return true; }
    return false;
  };
  if (!skipRm()) return null;
  if (wantX) {
    if (!(ts[i]?.k === "ch" && (ts[i] as { v: string }).v === "x")) return null;
    i++;
  }
  let order = 1;
  if (ts[i]?.k === "ch" && (ts[i] as { v: string }).v === "^") {
    i++;
    const g = ts[i]?.k === "open" ? ts.slice(i + 1, ts.findIndex((x, j) => j > i && x.k === "close")) : [ts[i]];
    const n = Number(g.map((x) => (x && x.k === "ch" ? x.v : "")).join(""));
    if (!Number.isInteger(n) || n < 1 || n > 9) return null;
    order = n;
    i += ts[i]?.k === "open" ? g.length + 2 : 1;
  }
  return i === ts.length ? order : null;
}

/** Төгсгөлийн «dx» (\,\mathrm{d}x, \differentialD x, dx)-г хасна */
function stripDx(ts: Tok[]): Tok[] {
  let j = ts.length;
  while (j > 0 && ts[j - 1].k === "cmd" && SPACES.has((ts[j - 1] as { v: string }).v)) j--;
  if (!(j > 0 && ts[j - 1].k === "ch" && (ts[j - 1] as { v: string }).v === "x")) return ts;
  j--;
  if (j > 0 && isD(ts[j - 1])) {
    j--;
  } else if (j >= 4 && ts[j - 1].k === "close" && isD(ts[j - 2]) && ts[j - 3].k === "open" && ts[j - 4].k === "cmd") {
    j -= 4;
  } else {
    return ts;
  }
  while (j > 0 && ts[j - 1].k === "cmd" && SPACES.has((ts[j - 1] as { v: string }).v)) j--;
  return ts.slice(0, j);
}

/** \frac{d}{dx}(…), \int …dx, \int_a^b …dx, \lim_{x\to a} …, (…)' — биш бол null */
export function parseCalculus(latex: string): CalcSpec | null {
  const ts = tokenize(normalizeCommas(latex));
  if (!ts.length) return null;
  const c = new Conv(ts);
  const first = ts[0];
  // d/dx
  if (first.k === "cmd" && /^[dt]?frac$/.test(first.v)) {
    c.next();
    const a = c.argTokens(), b = c.argTokens();
    const n1 = dOrder(a, false), n2 = dOrder(b, true);
    if (n1 !== null && n2 !== null && n1 === n2) {
      const body = finish(c.all());
      if (!body) throw new LatexError("Уламжлал авах функцийг бичнэ үү");
      return { kind: "deriv", body, order: n1 };
    }
    return null;
  }
  // ∫
  if (first.k === "cmd" && first.v === "int") {
    c.next();
    let a: string | undefined, b: string | undefined;
    for (let r = 0; r < 2; r++) {
      const t = c.peek();
      if (t?.k === "cmd" && (t.v === "limits" || t.v === "nolimits")) { c.next(); r--; continue; }
      if (t?.k === "ch" && (t.v === "_" || t.v === "^")) {
        c.next();
        const v = finish(c.arg());
        if (t.v === "_") a = v; else b = v;
      }
    }
    const rest = stripDx(ts.slice(c.i));
    const body = finish(convertTokens(rest));
    if (!body) throw new LatexError("Интегралын доторх функцийг бичнэ үү");
    if (a !== undefined || b !== undefined) {
      if (!a || !b) throw new LatexError("Интегралын доод, дээд хязгаарыг бөглөнө үү");
      return { kind: "defint", body, a, b };
    }
    return { kind: "int", body };
  }
  // lim
  if (first.k === "cmd" && first.v === "lim") {
    c.next();
    const t = c.peek();
    if (!(t?.k === "ch" && t.v === "_")) throw new LatexError("Хязгаарт $x$ хаашаа тэмүүлэхийг бичнэ үү");
    c.next();
    const sub = finish(c.arg().replace(/\u0003/g, "\u0004"));
    const m = /^x\s*\u0004\s*([\s\S]+)$/.exec(sub.replace(/\s+/g, " ").trim());
    if (!m) throw new LatexError("Хязгаарын доор $x \\to a$ хэлбэрээр бичнэ үү");
    const body = finish(c.all());
    if (!body) throw new LatexError("Хязгаар авах функцийг бичнэ үү");
    let to = m[1].replace(/\s+/g, "");
    if (to === "+inf") to = "inf";
    return { kind: "lim", body, to };
  }
  // (…)' эсвэл (…)^{\prime}
  let j = ts.length, primes = 0;
  while (j > 0 && ts[j - 1].k === "ch" && (ts[j - 1] as { v: string }).v === "'") { primes++; j--; }
  if (!primes && j >= 4 && ts[j - 1].k === "close" && ts[j - 3].k === "open" && ts[j - 4].k === "ch" && (ts[j - 4] as { v: string }).v === "^" && ts[j - 2].k === "cmd" && ((ts[j - 2] as { v: string }).v === "prime" || (ts[j - 2] as { v: string }).v === "doubleprime")) {
    primes = (ts[j - 2] as { v: string }).v === "doubleprime" ? 2 : 1;
    j -= 4;
  }
  if (primes) {
    const body = finish(convertTokens(ts.slice(0, j)));
    if (!body) return null;
    return { kind: "deriv", body, order: primes };
  }
  return null;
}

/** UI-ийн нэг цонх: эхлээд матанализын бичлэг, үгүй бол энгийн бичвэр */
export function readLatex(latex: string): { text: string; calc: CalcSpec | null } {
  const calc = parseCalculus(latex);
  return calc ? { text: calc.body, calc } : { text: latexToText(latex), calc: null };
}

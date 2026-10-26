/* ============================================================================
 * Хэрэглэгдэхүүний томьёо задлагч — График ба Бодогчийн НИЙТЛЭГ цөм.
 *
 * Бичвэр («2x^2-3x+1», «sin2x», «|x-1|», «log_2(8)») → мод (AST) →
 *   - compile(): хурдан тооцоо (графикт секундэд олон мянган удаа)
 *   - toLatex(): MathText-д харуулах
 *   - diff()/simplify(): тэмдэгт уламжлал
 *
 * Импортгүй цэвэр модуль — `node --test src/components/tools/core/` шууд ачаална.
 * ========================================================================== */

export type Node =
  | { t: "num"; v: number }
  | { t: "sym"; n: string }
  | { t: "neg"; a: Node }
  | { t: "add" | "sub" | "mul" | "div" | "pow"; a: Node; b: Node }
  | { t: "call"; f: string; args: Node[] }
  | { t: "fact"; a: Node };

export type RelOp = "=" | "<" | ">" | "<=" | ">=";
export interface Relation {
  lhs: Node;
  op: RelOp;
  rhs: Node;
}

export class ParseError extends Error {
  pos: number;
  constructor(message: string, pos = -1) {
    super(message);
    this.pos = pos;
  }
}

/* ---------- Танигдах нэрс ---------- */

/** Нэр → дотоод нэр (tg = tan г.м. монгол сурах бичгийн тэмдэглэгээ) */
const FUNC_ALIAS: Record<string, string> = {
  sin: "sin", cos: "cos", tan: "tan", tg: "tan", cot: "cot", ctg: "cot",
  arcsin: "asin", asin: "asin", arccos: "acos", acos: "acos",
  arctan: "atan", arctg: "atan", atan: "atan", arcctg: "acot", acot: "acot",
  sinh: "sinh", cosh: "cosh", tanh: "tanh",
  sqrt: "sqrt", cbrt: "cbrt", root: "root", abs: "abs",
  ln: "ln", lg: "lg", log: "log", exp: "exp",
  floor: "floor", ceil: "ceil", round: "round", sign: "sign", sgn: "sign",
  min: "min", max: "max",
};
const CONSTS = new Set(["pi", "e"]);
/** Урт нэрийг түрүүлж тааруулна (arcsin нь a·r·c·sin биш) */
const NAMES = [...Object.keys(FUNC_ALIAS), "pi"].sort((a, b) => b.length - a.length);

export const FUNCTIONS = Object.keys(FUNC_ALIAS);

/* ---------- Токен ---------- */

type Tok =
  | { k: "num"; v: number; p: number }
  | { k: "id"; v: string; p: number } // нэг хувьсагч
  | { k: "fn"; v: string; p: number } // функц
  | { k: "op"; v: string; p: number }
  | { k: "end"; p: number };

/** Гараар бичсэн unicode тэмдгийг ASCII болгоно */
export function normalizeInput(src: string): string {
  return src
    .replace(/[−–—]/g, "-")
    .replace(/[·×∙⋅]/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/∛/g, "cbrt")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/∞/g, "inf")
    .replace(/\*\*/g, "^");
}

function tokenize(input: string): Tok[] {
  const s = normalizeInput(input);
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
      if (!m) throw new ParseError("Тоо буруу бичигдсэн", i);
      // «2e» = 2·e тул зэргийн e-г зөвхөн араас нь цифр байвал авна
      out.push({ k: "num", v: parseFloat(m[0]), p: i });
      i += m[0].length;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      const word = s.slice(i, j);
      // Үгийг хэсэглэнэ: мэдэгдэх функц/тогтмол эсвэл ганц үсэг
      let k = 0;
      while (k < word.length) {
        const rest = word.slice(k).toLowerCase();
        const name = NAMES.find((n) => rest.startsWith(n));
        if (rest.startsWith("inf")) {
          out.push({ k: "num", v: Infinity, p: i + k });
          k += 3;
          continue;
        }
        if (name) {
          if (name === "pi") out.push({ k: "id", v: "pi", p: i + k });
          else out.push({ k: "fn", v: FUNC_ALIAS[name], p: i + k });
          k += name.length;
        } else {
          out.push({ k: "id", v: word[k], p: i + k });
          k++;
        }
      }
      i = j;
      continue;
    }
    const two = s.slice(i, i + 2);
    if (two === "<=" || two === ">=") { out.push({ k: "op", v: two, p: i }); i += 2; continue; }
    if ("+-*/^()!,|=<>_{}[];".includes(c)) {
      // [] {} -г хаалт гэж үзнэ; ; нь аргумент тусгаарлагч (монгол бичлэг)
      const v = c === "[" || c === "{" ? "(" : c === "]" || c === "}" ? ")" : c === ";" ? "," : c;
      out.push({ k: "op", v, p: i });
      i++;
      continue;
    }
    throw new ParseError(`«${c}» тэмдэгтийг ойлгосонгүй`, i);
  }
  out.push({ k: "end", p: s.length });
  return out;
}

/* ---------- Задлагч (Pratt) ---------- */

class Parser {
  i = 0;
  absDepth = 0;
  toks: Tok[];
  constructor(toks: Tok[]) {
    this.toks = toks;
  }
  peek(): Tok { return this.toks[this.i]; }
  next(): Tok { return this.toks[this.i++]; }
  isOp(v: string, t = this.peek()) { return t.k === "op" && t.v === v; }
  expect(v: string) {
    const t = this.next();
    if (!(t.k === "op" && t.v === v)) throw new ParseError(v === ")" ? "Хаалт дутуу байна" : `«${v}» дутуу`, t.p);
  }

  expr(): Node {
    let left = this.term();
    for (;;) {
      if (this.isOp("+")) { this.next(); left = { t: "add", a: left, b: this.term() }; }
      else if (this.isOp("-")) { this.next(); left = { t: "sub", a: left, b: this.term() }; }
      else return left;
    }
  }

  /** Үржвэр: тодорхой * / ба далд үржвэр (2x, 3(x+1), x sin x) */
  term(): Node {
    let left = this.unary();
    for (;;) {
      if (this.isOp("*")) { this.next(); left = { t: "mul", a: left, b: this.unary() }; }
      else if (this.isOp("/")) { this.next(); left = { t: "div", a: left, b: this.unary() }; }
      else if (this.startsPrimary()) left = { t: "mul", a: left, b: this.power() };
      else return left;
    }
  }

  /** Дараагийн токен далд үржвэр эхлүүлэх үү */
  startsPrimary(): boolean {
    const t = this.peek();
    if (t.k === "num" || t.k === "id" || t.k === "fn") return true;
    if (this.isOp("(")) return true;
    // |…| дотор байхгүй үед л | нь шинэ модуль эхлүүлнэ
    if (this.isOp("|") && this.absDepth === 0) return true;
    return false;
  }

  unary(): Node {
    if (this.isOp("-")) { this.next(); return { t: "neg", a: this.unary() }; }
    if (this.isOp("+")) { this.next(); return this.unary(); }
    return this.power();
  }

  power(): Node {
    const base = this.postfix();
    if (this.isOp("^")) {
      this.next();
      return { t: "pow", a: base, b: this.unary() }; // баруун тийш: 2^3^2 = 2^9
    }
    return base;
  }

  postfix(): Node {
    let n = this.primary();
    while (this.isOp("!")) { this.next(); n = { t: "fact", a: n }; }
    return n;
  }

  primary(): Node {
    const t = this.next();
    if (t.k === "num") return { t: "num", v: t.v };
    if (t.k === "id") return { t: "sym", n: t.v };
    if (t.k === "fn") return this.call(t.v);
    if (t.k === "op" && t.v === "(") {
      const e = this.expr();
      this.expect(")");
      return e;
    }
    if (t.k === "op" && t.v === "|") {
      this.absDepth++;
      const e = this.expr();
      this.absDepth--;
      this.expect("|");
      return { t: "call", f: "abs", args: [e] };
    }
    if (t.k === "end") throw new ParseError("Илэрхийлэл дутуу байна", t.p);
    throw new ParseError(`«${(t as { v: string }).v}» энд байж болохгүй`, t.p);
  }

  call(f: string): Node {
    // log_2(8), log_{2}8
    if (f === "log" && this.isOp("_")) {
      this.next();
      const base = this.postfix();
      const arg = this.isOp("(") ? this.paren() : this.power();
      return { t: "call", f: "log", args: [base, arg] };
    }
    // sin^2 x = (sin x)^2
    if (this.isOp("^")) {
      this.next();
      const ex = this.postfix();
      const inner = this.call(f);
      return { t: "pow", a: inner, b: ex };
    }
    if (this.isOp("(")) {
      this.next();
      const args = [this.expr()];
      while (this.isOp(",")) { this.next(); args.push(this.expr()); }
      this.expect(")");
      return { t: "call", f, args: normalizeArgs(f, args) };
    }
    // sin 2x = sin(2x): хаалтгүй бол дараагийн далд үржвэрийг аргумент болгоно
    let arg = this.power();
    while (this.startsPrimaryNoFn()) arg = { t: "mul", a: arg, b: this.power() };
    return { t: "call", f, args: [arg] };
  }

  startsPrimaryNoFn(): boolean {
    const t = this.peek();
    return t.k === "num" || t.k === "id";
  }

  paren(): Node {
    this.expect("(");
    const e = this.expr();
    this.expect(")");
    return e;
  }
}

/** log(x) = lg x; log(a, x) = log_a x; root(n, x) */
function normalizeArgs(f: string, args: Node[]): Node[] {
  const arity: Record<string, [number, number]> = { log: [1, 2], root: [2, 2], min: [1, 9], max: [1, 9] };
  const [lo, hi] = arity[f] ?? [1, 1];
  if (args.length < lo || args.length > hi) throw new ParseError("Функцийн аргументын тоо буруу");
  if (f === "log" && args.length === 1) return [{ t: "num", v: 10 }, args[0]];
  return args;
}

export function parse(src: string): Node {
  if (!src.trim()) throw new ParseError("Илэрхийлэл хоосон байна");
  const p = new Parser(tokenize(src));
  const e = p.expr();
  const t = p.peek();
  if (t.k !== "end") {
    if (t.k === "op" && t.v === ")") throw new ParseError("Илүү хаалт байна", t.p);
    throw new ParseError("Илэрхийллийг бүрэн ойлгосонгүй", t.p);
  }
  return e;
}

/** «y = x^2», «x^2+y^2=25», «2x-1 > 3» → харьцаа; харьцаагүй бол null */
export function parseRelation(src: string): Relation | null {
  const s = normalizeInput(src);
  const m = /(<=|>=|=|<|>)/.exec(s);
  if (!m) return null;
  const lhs = s.slice(0, m.index), rhs = s.slice(m.index + m[0].length);
  if (/(<=|>=|=|<|>)/.test(rhs)) throw new ParseError("Нэг л тэнцүүгийн тэмдэг байх ёстой");
  return { lhs: parse(lhs), op: m[0] as RelOp, rhs: parse(rhs) };
}

/* ---------- Тооцоо ---------- */

export type Scope = Record<string, number>;
export type Fn = (scope: Scope) => number;

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return gamma(n + 1);
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function gamma(z: number): number {
  // Lanczos ойролцоолол — бутархай n!-д
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

/** Сондгой язгуур сөрөг тоонд: ∛(-8) = -2, (-8)^(1/3) = -2 */
function realPow(a: number, b: number): number {
  if (a >= 0 || Number.isInteger(b)) return Math.pow(a, b);
  const inv = 1 / b;
  if (Math.abs(inv - Math.round(inv)) < 1e-9 && Math.round(inv) % 2 !== 0) return -Math.pow(-a, b);
  return NaN;
}

export interface CompileOptions {
  /** Тригонометрийг градусаар (тооцоолуурт) */
  degrees?: boolean;
}

export function compile(node: Node, opts: CompileOptions = {}): Fn {
  const k = opts.degrees ? Math.PI / 180 : 1;
  const go = (n: Node): Fn => {
    switch (n.t) {
      case "num": { const v = n.v; return () => v; }
      case "sym": {
        const name = n.n;
        if (name === "pi") return () => Math.PI;
        if (name === "e") return (s) => (s.e !== undefined ? s.e : Math.E);
        return (s) => { const v = s[name]; return v === undefined ? NaN : v; };
      }
      case "neg": { const a = go(n.a); return (s) => -a(s); }
      case "add": { const a = go(n.a), b = go(n.b); return (s) => a(s) + b(s); }
      case "sub": { const a = go(n.a), b = go(n.b); return (s) => a(s) - b(s); }
      case "mul": { const a = go(n.a), b = go(n.b); return (s) => a(s) * b(s); }
      case "div": { const a = go(n.a), b = go(n.b); return (s) => a(s) / b(s); }
      case "pow": { const a = go(n.a), b = go(n.b); return (s) => realPow(a(s), b(s)); }
      case "fact": { const a = go(n.a); return (s) => factorial(a(s)); }
      case "call": {
        const args = n.args.map(go);
        const a = args[0], b = args[1];
        switch (n.f) {
          case "sin": return (s) => Math.sin(a(s) * k);
          case "cos": return (s) => Math.cos(a(s) * k);
          case "tan": return (s) => Math.tan(a(s) * k);
          case "cot": return (s) => 1 / Math.tan(a(s) * k);
          case "asin": return (s) => Math.asin(a(s)) / k;
          case "acos": return (s) => Math.acos(a(s)) / k;
          case "atan": return (s) => Math.atan(a(s)) / k;
          case "acot": return (s) => (Math.PI / 2 - Math.atan(a(s))) / k;
          case "sinh": return (s) => Math.sinh(a(s));
          case "cosh": return (s) => Math.cosh(a(s));
          case "tanh": return (s) => Math.tanh(a(s));
          case "sqrt": return (s) => Math.sqrt(a(s));
          case "cbrt": return (s) => Math.cbrt(a(s));
          case "root": return (s) => realPow(b(s), 1 / a(s));
          case "abs": return (s) => Math.abs(a(s));
          case "ln": return (s) => Math.log(a(s));
          case "lg": return (s) => Math.log10(a(s));
          case "log": return (s) => Math.log(b(s)) / Math.log(a(s));
          case "exp": return (s) => Math.exp(a(s));
          case "floor": return (s) => Math.floor(a(s));
          case "ceil": return (s) => Math.ceil(a(s));
          case "round": return (s) => Math.round(a(s));
          case "sign": return (s) => Math.sign(a(s));
          case "min": return (s) => Math.min(...args.map((f) => f(s)));
          case "max": return (s) => Math.max(...args.map((f) => f(s)));
        }
        throw new ParseError(`«${n.f}» функцийг тооцоолж чадсангүй`);
      }
    }
  };
  return go(node);
}

/** Модонд орсон хувьсагчид (pi, e орохгүй) — графикийн гулсуурт */
export function freeSymbols(node: Node, acc = new Set<string>()): Set<string> {
  switch (node.t) {
    case "sym": if (!CONSTS.has(node.n)) acc.add(node.n); break;
    case "neg": case "fact": freeSymbols(node.a, acc); break;
    case "call": node.args.forEach((a) => freeSymbols(a, acc)); break;
    case "num": break;
    default: freeSymbols(node.a, acc); freeSymbols(node.b, acc);
  }
  return acc;
}

/* ---------- LaTeX ---------- */

const PREC: Record<Node["t"], number> = { add: 1, sub: 1, mul: 2, div: 2, neg: 3, pow: 4, fact: 5, call: 6, num: 6, sym: 6 };

const FN_TEX: Record<string, string> = {
  sin: "\\sin", cos: "\\cos", tan: "\\operatorname{tg}", cot: "\\operatorname{ctg}",
  asin: "\\arcsin", acos: "\\arccos", atan: "\\operatorname{arctg}", acot: "\\operatorname{arcctg}",
  sinh: "\\sinh", cosh: "\\cosh", tanh: "\\tanh", ln: "\\ln", lg: "\\lg", exp: "\\exp",
  sign: "\\operatorname{sign}", min: "\\min", max: "\\max",
};

export function numTex(v: number): string {
  if (v === Infinity) return "+\\infty";
  if (v === -Infinity) return "-\\infty";
  if (Number.isNaN(v)) return "\\text{тодорхойгүй}";
  if (Number.isInteger(v)) return String(v);
  const r = Math.abs(v) >= 1e6 || Math.abs(v) < 1e-4 ? v.toExponential(4) : String(Number(v.toFixed(6)));
  if (r.includes("e")) { const [m, e] = r.split("e"); return `${m}\\cdot 10^{${Number(e)}}`; }
  return r;
}

export function symTex(n: string): string {
  if (n === "pi") return "\\pi";
  return n;
}

export function toLatex(node: Node): string {
  const wrap = (child: Node, minPrec: number) => {
    const s = toLatex(child);
    return PREC[child.t] < minPrec || (child.t === "num" && child.v < 0) ? `\\left(${s}\\right)` : s;
  };
  switch (node.t) {
    case "num": return numTex(node.v);
    case "sym": return symTex(node.n);
    case "neg": return `-${wrap(node.a, 3)}`;
    case "add": return `${toLatex(node.a)}+${wrap(node.b, 1)}`;
    case "sub": {
      const b = node.b.t === "add" || node.b.t === "sub" ? `\\left(${toLatex(node.b)}\\right)` : wrap(node.b, 2);
      return `${toLatex(node.a)}-${b}`;
    }
    case "mul": {
      const a = wrap(node.a, 2), b = wrap(node.b, 2);
      // 2x, ab, 2\sin x — харин 2·3, x·2 үед цэг
      const bStartsDigit = /^[\d.]/.test(b) || b.startsWith("-");
      const sep = bStartsDigit || (node.a.t !== "num" && node.b.t === "num") ? "\\cdot " : node.b.t === "sym" && node.a.t === "sym" ? "" : " ";
      return `${a}${sep}${b}`.replace(/ \\left/g, "\\left");
    }
    case "div": return `\\frac{${toLatex(node.a)}}{${toLatex(node.b)}}`;
    case "pow": {
      if (node.a.t === "call" && FN_TEX[node.a.f]) {
        // sin^2 x
        return `${FN_TEX[node.a.f]}^{${toLatex(node.b)}}${fnArg(node.a.args[0])}`;
      }
      return `${wrap(node.a, 5)}^{${toLatex(node.b)}}`;
    }
    case "fact": return `${wrap(node.a, 6)}!`;
    case "call": {
      const [a, b] = node.args;
      switch (node.f) {
        case "sqrt": return `\\sqrt{${toLatex(a)}}`;
        case "cbrt": return `\\sqrt[3]{${toLatex(a)}}`;
        case "root": return `\\sqrt[${toLatex(a)}]{${toLatex(b)}}`;
        case "abs": return `\\left|${toLatex(a)}\\right|`;
        case "floor": return `\\left\\lfloor ${toLatex(a)}\\right\\rfloor`;
        case "ceil": return `\\left\\lceil ${toLatex(a)}\\right\\rceil`;
        case "round": return `\\operatorname{round}\\left(${toLatex(a)}\\right)`;
        case "exp": return `e^{${toLatex(a)}}`;
        case "log":
          if (a.t === "num" && a.v === 10) return `\\lg${fnArg(b)}`;
          return `\\log_{${toLatex(a)}}${fnArg(b)}`;
        case "min": case "max":
          return `${FN_TEX[node.f]}\\left(${node.args.map(toLatex).join(";\\ ")}\\right)`;
      }
      return `${FN_TEX[node.f] ?? `\\operatorname{${node.f}}`}${fnArg(a)}`;
    }
  }
}

/** sin x (ганц тэмдэгт) эсвэл sin(2x+1) */
function fnArg(a: Node): string {
  if (a.t === "sym" || (a.t === "num" && a.v >= 0)) return ` ${toLatex(a)}`;
  return `\\left(${toLatex(a)}\\right)`;
}

export function relationLatex(r: Relation): string {
  const op = { "=": "=", "<": "<", ">": ">", "<=": "\\le ", ">=": "\\ge " }[r.op];
  return `${toLatex(r.lhs)}${op}${toLatex(r.rhs)}`;
}

/* ---------- Хялбарчлах ---------- */

const num = (v: number): Node => ({ t: "num", v });
const isNum = (n: Node, v?: number): boolean => n.t === "num" && (v === undefined || n.v === v);
const V = (n: Node): number => (n.t === "num" ? n.v : NaN);

/** Тогтмолыг нэгтгэх, 0/1-ийн ижилсэл, давхар хасах тэмдэг — хэт ухаалаг биш, аюулгүй */
export function simplify(node: Node): Node {
  switch (node.t) {
    case "num": case "sym": return node;
    case "neg": {
      const a = simplify(node.a);
      if (isNum(a)) return num(-V(a));
      if (a.t === "neg") return a.a;
      return { t: "neg", a };
    }
    case "fact": return { t: "fact", a: simplify(node.a) };
    case "call": {
      const args = node.args.map(simplify);
      if (args.every((x) => isNum(x)) && ["abs", "floor", "ceil", "round", "sign", "min", "max"].includes(node.f)) {
        return num(compile({ t: "call", f: node.f, args })({}));
      }
      if (node.f === "sqrt" && isNum(args[0])) {
        const r = Math.sqrt(V(args[0]));
        if (Number.isInteger(r)) return num(r);
      }
      if (node.f === "ln" && args[0].t === "sym" && args[0].n === "e") return num(1);
      if (node.f === "ln" && isNum(args[0], 1)) return num(0);
      return { t: "call", f: node.f, args };
    }
  }
  const a = simplify(node.a), b = simplify(node.b);
  const both = isNum(a) && isNum(b);
  switch (node.t) {
    case "add":
      if (both) return num(V(a) + V(b));
      if (isNum(a, 0)) return b;
      if (isNum(b, 0)) return a;
      if (b.t === "neg") return simplify({ t: "sub", a, b: b.a });
      if (isNum(b) && V(b) < 0) return { t: "sub", a, b: num(-V(b)) };
      return { t: "add", a, b };
    case "sub":
      if (both) return num(V(a) - V(b));
      if (isNum(b, 0)) return a;
      if (isNum(a, 0)) return simplify({ t: "neg", a: b });
      if (b.t === "neg") return simplify({ t: "add", a, b: b.a });
      if (isNum(b) && V(b) < 0) return { t: "add", a, b: num(-V(b)) };
      if (same(a, b)) return num(0);
      return { t: "sub", a, b };
    case "mul":
      if (both) return num(V(a) * V(b));
      if (isNum(a, 0) || isNum(b, 0)) return num(0);
      if (isNum(a, 1)) return b;
      if (isNum(b, 1)) return a;
      if (isNum(a, -1)) return simplify({ t: "neg", a: b });
      if (isNum(b, -1)) return simplify({ t: "neg", a });
      if (isNum(b) && !isNum(a)) return simplify({ t: "mul", a: b, b: a }); // тоог урд
      if (isNum(a) && b.t === "mul" && isNum(b.a)) return simplify({ t: "mul", a: num(V(a) * V(b.a)), b: b.b });
      if (a.t === "neg") return simplify({ t: "neg", a: { t: "mul", a: a.a, b } });
      if (b.t === "neg") return simplify({ t: "neg", a: { t: "mul", a, b: b.a } });
      if (same(a, b)) return { t: "pow", a, b: num(2) };
      return { t: "mul", a, b };
    case "div":
      if (both && Number.isInteger(V(a)) && Number.isInteger(V(b)) && V(b) !== 0) {
        const g = gcd(V(a), V(b)), s = V(b) < 0 ? -1 : 1;
        if (Math.abs(V(b) / g) === 1) return num((s * V(a)) / g);
        return { t: "div", a: num((s * V(a)) / g), b: num(Math.abs(V(b)) / g) };
      }
      if (isNum(a, 0)) return num(0);
      if (isNum(b, 1)) return a;
      if (same(a, b)) return num(1);
      return { t: "div", a, b };
    case "pow":
      if (both && Number.isInteger(V(b)) && Math.abs(V(b)) < 64) return num(Math.pow(V(a), V(b)));
      if (isNum(b, 0)) return num(1);
      if (isNum(b, 1)) return a;
      if (isNum(a, 1)) return num(1);
      if (a.t === "pow" && isNum(a.b) && isNum(b)) return { t: "pow", a: a.a, b: num(V(a.b) * V(b)) };
      return { t: "pow", a, b };
  }
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** Бүтцийн тэнцүү эсэх */
export function same(a: Node, b: Node): boolean {
  if (a.t !== b.t) return false;
  switch (a.t) {
    case "num": return a.v === (b as typeof a).v;
    case "sym": return a.n === (b as typeof a).n;
    case "neg": case "fact": return same(a.a, (b as typeof a).a);
    case "call": {
      const bb = b as typeof a;
      return a.f === bb.f && a.args.length === bb.args.length && a.args.every((x, i) => same(x, bb.args[i]));
    }
    default: {
      const bb = b as { a: Node; b: Node };
      return same(a.a, bb.a) && same(a.b, bb.b);
    }
  }
}

/* ---------- Уламжлал ---------- */

function dependsOn(n: Node, v: string): boolean {
  return freeSymbols(n).has(v);
}

/** Тэмдэгт уламжлал d/dv. Үр дүнг simplify() хийж буцаана */
export function diff(node: Node, v = "x"): Node {
  return simplify(d(node, v));
}

function d(n: Node, v: string): Node {
  if (!dependsOn(n, v)) return num(0);
  const mul = (a: Node, b: Node): Node => ({ t: "mul", a, b });
  const div = (a: Node, b: Node): Node => ({ t: "div", a, b });
  const pow = (a: Node, b: Node): Node => ({ t: "pow", a, b });
  const call = (f: string, ...args: Node[]): Node => ({ t: "call", f, args });
  switch (n.t) {
    case "num": return num(0);
    case "sym": return num(n.n === v ? 1 : 0);
    case "neg": return { t: "neg", a: d(n.a, v) };
    case "add": return { t: "add", a: d(n.a, v), b: d(n.b, v) };
    case "sub": return { t: "sub", a: d(n.a, v), b: d(n.b, v) };
    case "mul": return { t: "add", a: mul(d(n.a, v), n.b), b: mul(n.a, d(n.b, v)) };
    case "div":
      return div({ t: "sub", a: mul(d(n.a, v), n.b), b: mul(n.a, d(n.b, v)) }, pow(n.b, num(2)));
    case "pow": {
      const fa = dependsOn(n.a, v), fb = dependsOn(n.b, v);
      if (fa && !fb) return mul(mul(n.b, pow(n.a, simplify({ t: "sub", a: n.b, b: num(1) }))), d(n.a, v));
      if (!fa && fb) return mul(mul(n, call("ln", n.a)), d(n.b, v));
      // u^w = e^{w ln u}
      return mul(n, d({ t: "mul", a: n.b, b: call("ln", n.a) }, v));
    }
    case "fact": throw new ParseError("Факториалын уламжлал тодорхойлогдохгүй");
    case "call": {
      const u = n.args[0], du = d(u, v);
      const chain = (outer: Node) => mul(outer, du);
      switch (n.f) {
        case "sin": return chain(call("cos", u));
        case "cos": return chain({ t: "neg", a: call("sin", u) });
        case "tan": return chain(div(num(1), pow(call("cos", u), num(2))));
        case "cot": return chain({ t: "neg", a: div(num(1), pow(call("sin", u), num(2))) });
        case "asin": return chain(div(num(1), call("sqrt", { t: "sub", a: num(1), b: pow(u, num(2)) })));
        case "acos": return chain({ t: "neg", a: div(num(1), call("sqrt", { t: "sub", a: num(1), b: pow(u, num(2)) })) });
        case "atan": return chain(div(num(1), { t: "add", a: num(1), b: pow(u, num(2)) }));
        case "acot": return chain({ t: "neg", a: div(num(1), { t: "add", a: num(1), b: pow(u, num(2)) }) });
        case "sinh": return chain(call("cosh", u));
        case "cosh": return chain(call("sinh", u));
        case "tanh": return chain(div(num(1), pow(call("cosh", u), num(2))));
        case "sqrt": return chain(div(num(1), mul(num(2), call("sqrt", u))));
        case "cbrt": return chain(div(num(1), mul(num(3), pow(call("cbrt", u), num(2)))));
        case "abs": return chain(div(u, call("abs", u)));
        case "ln": return chain(div(num(1), u));
        case "lg": return chain(div(num(1), mul(u, call("ln", num(10)))));
        case "exp": return chain(call("exp", u));
        case "log": {
          const [b, x] = n.args;
          if (dependsOn(b, v)) return d(div(call("ln", x), call("ln", b)), v);
          return mul(div(num(1), mul(x, call("ln", b))), d(x, v));
        }
        case "root": return d(pow(n.args[1], div(num(1), n.args[0])), v);
      }
      throw new ParseError(`«${n.f}» функцийн уламжлалыг олж чадсангүй`);
    }
  }
}

/* ---------- Тоог «гоё» харуулах ---------- */

/** Ойролцоо бутархай: 0.333333 → [1, 3]. Олдохгүй бол null */
export function toFraction(x: number, maxDen = 1000, eps = 1e-9): [number, number] | null {
  if (!Number.isFinite(x)) return null;
  if (Number.isInteger(x)) return [x, 1];
  const sign = x < 0 ? -1 : 1;
  let a = Math.abs(x);
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1;
  for (let i = 0; i < 32; i++) {
    const ai = Math.floor(a);
    const h2 = ai * h1 + h0, k2 = ai * k1 + k0;
    if (k2 > maxDen) break;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if (Math.abs(Math.abs(x) - h1 / k1) < eps * Math.max(1, Math.abs(x))) return [sign * h1, k1];
    const frac = a - ai;
    if (frac < 1e-15) break;
    a = 1 / frac;
  }
  return null;
}

/**
 * Тоог хамгийн «цэвэр» LaTeX хэлбэрт: бүхэл, бутархай, a\sqrt{b}, \frac{a\sqrt b}{c}, k\pi.
 * Олдохгүй бол аравтын 4 орон.
 */
export function niceTex(x: number): string {
  if (!Number.isFinite(x)) return numTex(x);
  if (Math.abs(x) < 1e-12) return "0";
  const f = toFraction(x, 1000);
  if (f) return fracTex(f[0], f[1]);
  // k·π/q
  const fp = toFraction(x / Math.PI, 24);
  if (fp) {
    const [p, q] = fp;
    const sign = p < 0 ? "-" : "";
    const top = Math.abs(p) === 1 ? "\\pi" : `${Math.abs(p)}\\pi`;
    return q === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${q}}`;
  }
  // (a√b)/c, b ≤ 200 язгуургүй
  const sq = x * x;
  const fs = toFraction(sq, 400, 1e-9);
  if (fs) {
    const [p, q] = fs; // x² = p/q → |x| = √(pq)/q
    const [out, inn] = splitSqrt(p * q);
    if (inn > 1 && inn <= 10000) {
      const g = gcd(out, q), o = out / g, den = q / g;
      const sign = x < 0 ? "-" : "";
      const top = `${o === 1 ? "" : o}\\sqrt{${inn}}`;
      return den === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${den}}`;
    }
  }
  return numTex(Number(x.toFixed(4)));
}

export function fracTex(p: number, q: number): string {
  if (q === 1) return String(p);
  return `${p < 0 ? "-" : ""}\\frac{${Math.abs(p)}}{${q}}`;
}

/** n = out²·in, in нь квадратгүй */
export function splitSqrt(n: number): [number, number] {
  let out = 1, inn = Math.round(n);
  for (let k = 2; k * k <= inn; k++) {
    while (inn % (k * k) === 0) { inn /= k * k; out *= k; }
  }
  return [out, inn];
}

/** Тоог энгийн бичвэрээр (координатын шошгонд): 2.5, -1.333 */
export function fmt(x: number, digits = 3): string {
  if (!Number.isFinite(x)) return x > 0 ? "∞" : x < 0 ? "-∞" : "—";
  if (Math.abs(x) < 10 ** -digits / 2) return "0";
  return String(Number(x.toFixed(digits)));
}

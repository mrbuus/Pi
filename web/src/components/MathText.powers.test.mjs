// MathText-ийн зэргийн нормчлолыг ЯГ эх кодын дагуу давтаж шалгана.
const POWER_RE = /([a-zA-Z\u{1D400}-\u{1D7FF}])(?:\^\{?([+-]?\d+)\}?|\s?(\d))/gu;
const DIMENSION_RE = /\d+\s*[xх]\s*\d+/gi;
const DIM_MARK = "\uE000";

function normalizeMath(text) {
  const dims = [];
  const masked = text.replace(DIMENSION_RE, (m) => { dims.push(m); return DIM_MARK; });
  const powered = masked.replace(POWER_RE, (_m, base, caretExp, bareDigit) =>
    `$${base}^{${caretExp ?? bareDigit ?? ""}}$`);
  let i = 0;
  return powered.replace(new RegExp(DIM_MARK, "g"), () => dims[i++] ?? "");
}

function parse(input) {
  const segments = [];
  const regex = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let lastIndex = 0, match;
  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) segments.push({ type: "text", value: input.slice(lastIndex, match.index) });
    segments.push(match[1] !== undefined
      ? { type: "display", value: match[1] }
      : { type: "inline", value: match[2] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < input.length) segments.push({ type: "text", value: input.slice(lastIndex) });
  return segments;
}

function parseWithPowers(input) {
  return parse(input).flatMap((seg) => {
    if (seg.type !== "text") return [seg];
    const fixed = normalizeMath(seg.value);
    return fixed === seg.value ? [seg] : parse(fixed);
  });
}

const show = (s) => parseWithPowers(s)
  .map((x) => (x.type === "text" ? x.value : `[${x.value}]`)).join("");

// [оролт, хүлээгдэж буй гаралт, тайлбар]
const CASES = [
  ["x2 + y2 = z2",        "[x^{2}] + [y^{2}] = [z^{2}]", "docx-оос алдагдсан зэрэг"],
  ["x 2",                 "[x^{2}]",                     "үсэг + сул зай + цифр"],
  ["a^2 + b^-3",          "[a^{2}] + [b^{-3}]",          "caret тэмдэглэгээ"],
  ["x^{12}",              "[x^{12}]",                    "олон оронтой зэрэг"],
  ["функцийн 2 язгуур",   "функцийн 2 язгуур",           "КИРИЛЛ — хөндөгдөх ЁСГҮЙ"],
  ["$\\sqrt{2}$ гэсэн",   "[\\sqrt{2}] гэсэн",           "хэдийн LaTeX — хөндөгдөх ЁСГҮЙ"],
  ["$\\frac{a}{2}$ ба x2","[\\frac{a}{2}] ба [x^{2}]",   "LaTeX + текст холимог"],
  ["100x100 ном",         "100x100 ном",                 "НОМЫН НЭР — эвдрэх ЁСГҮЙ"],
  ["200 x 200 цуврал",    "200 x 200 цуврал",            "зайтай хэмжээ"],
  ["300x300 ба x2",       "300x300 ба [x^{2}]",          "ном + зэрэг зэрэг"],
  ["24x24 сүлжээ",        "24x24 сүлжээ",                "дүрсний хэмжээ"],
  ["2x + 3 = 0",          "2x + 3 = 0",                  "коэффициент — хөндөгдөхгүй"],
  ["Сорил 22B хувилбар",  "Сорил 22B хувилбар",          "кирилл + латин холимог"],
  ["",                    "",                            "хоосон"],
  ["Ердийн монгол өгүүлбэр.", "Ердийн монгол өгүүлбэр.", "математикгүй текст"],
];

let pass = 0, fail = 0;
for (const [input, expected, label] of CASES) {
  const got = show(input);
  const ok = got === expected;
  ok ? pass++ : fail++;
  console.log(`${ok ? "ЗӨВ " : "БУРУУ"} │ ${label}`);
  if (!ok) {
    console.log(`      оролт:    ${JSON.stringify(input)}`);
    console.log(`      хүлээсэн: ${expected}`);
    console.log(`      гарсан:   ${got}`);
  }
}
console.log(`\n${pass}/${pass + fail} өнгөрлөө`);
process.exit(fail ? 1 : 0);

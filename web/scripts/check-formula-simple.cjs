#!/usr/bin/env node
/* ============================================================================
 * Томьёоны «энгийн тайлбар» (simple) талбарыг шалгана.
 *
 *   node web/scripts/check-formula-simple.cjs                 бүх файл
 *   node web/scripts/check-formula-simple.cjs plane-geometry   нэг файл
 *
 * Бүтэц (docs/v2/TOMYO-ENGIIN-TAILBAR.md):
 *   simple: { say, formula, parts[{tex, mean}], steps[], example{problem, steps[], answer}, watch? }
 * Өнгө: \colA{…} \colB{…} \colC{…} \colD{…} (хөх, ягаан, ногоон, нил ягаан — шар ХОРИОТОЙ)
 * ========================================================================== */
const fs = require("fs");
const path = require("path");
const katex = require(path.join(__dirname, "..", "node_modules", "katex"));

const DIR = path.join(__dirname, "..", "..", "api", "prisma", "data", "formulas");
const only = process.argv[2];
const files = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .filter((f) => !only || f.replace(/\.json$/, "") === only);

const COLOR_RE = /\\col([A-Z])\{/g;
const toKatex = (tex) => tex.replace(COLOR_RE, (_m, c) => `\\textcolor{#000}{`);

function renders(tex) {
  try {
    katex.renderToString(toKatex(tex), { throwOnError: true, strict: "ignore" });
    return null;
  } catch (e) {
    return e.message.split("\n")[0];
  }
}

/** «Текст $x^2$ текст» — $…$ хэсэг бүрийг шалгана */
function mixedErrors(s) {
  const out = [];
  const parts = s.split("$");
  if (parts.length % 2 === 0) out.push("$ тэмдэг хос биш");
  for (let i = 1; i < parts.length; i += 2) {
    const e = renders(parts[i]);
    if (e) out.push(`томьёо «${parts[i]}»: ${e}`);
  }
  return out;
}

const badColor = (s) => {
  const m = [...s.matchAll(COLOR_RE)].map((x) => x[1]).filter((c) => !"ABCD".includes(c));
  return m.length ? `зөвшөөрөгдөөгүй өнгө \\col${m[0]}` : null;
};
const endsWithPeriod = (s) => /[.。]\s*$/.test(s.replace(/\$[^$]*\$\s*$/, "x"));
// Энгийн хэл: багшийн хуурай нэр томьёо биш
const HEAVY = /(үл доройтсон|тодорхойлогдох муж|изоморф|аксиом|леммa|∀|∃)/i;

let total = 0, filled = 0;
const errors = [];
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
  for (const f of data.formulas) {
    total++;
    const s = f.simple;
    const at = `${file}:${f.slug}`;
    if (!s) continue;
    filled++;
    const err = (m) => errors.push(`${at}: ${m}`);
    for (const k of ["say", "formula", "parts", "steps", "example"]) if (s[k] == null) err(`${k} дутуу`);
    if (typeof s.say === "string") {
      if (s.say.length > 160) err(`say хэт урт (${s.say.length})`);
      if (endsWithPeriod(s.say)) err("say төгсгөлд цэг");
      mixedErrors(s.say).forEach(err);
    }
    if (typeof s.formula === "string") {
      const e = renders(s.formula);
      if (e) err(`formula: ${e}`);
      if (!/\\col[A-D]\{/.test(s.formula)) err("formula-д өнгөтэй хэсэг алга");
      const b = badColor(s.formula);
      if (b) err(b);
    }
    if (Array.isArray(s.parts)) {
      if (s.parts.length < 1 || s.parts.length > 6) err(`parts тоо ${s.parts.length} (1-6)`);
      s.parts.forEach((p, i) => {
        if (!p || typeof p.tex !== "string" || typeof p.mean !== "string") return err(`parts[${i}] бүтэц буруу`);
        const e = renders(p.tex);
        if (e) err(`parts[${i}].tex: ${e}`);
        if (endsWithPeriod(p.mean)) err(`parts[${i}].mean төгсгөлд цэг`);
        mixedErrors(p.mean).forEach(err);
      });
    }
    if (Array.isArray(s.steps)) {
      if (s.steps.length < 2 || s.steps.length > 6) err(`steps тоо ${s.steps.length} (2-6)`);
      s.steps.forEach((t, i) => {
        if (typeof t !== "string") return err(`steps[${i}] бичвэр биш`);
        if (endsWithPeriod(t)) err(`steps[${i}] төгсгөлд цэг`);
        mixedErrors(t).forEach((m) => err(`steps[${i}] ${m}`));
        if (HEAVY.test(t)) err(`steps[${i}] хүнд нэр томьёо`);
      });
    }
    const ex = s.example;
    if (ex) {
      if (typeof ex.problem !== "string" || !Array.isArray(ex.steps) || typeof ex.answer !== "string") err("example бүтэц буруу");
      else {
        mixedErrors(ex.problem).forEach((m) => err(`example.problem ${m}`));
        if (ex.steps.length < 1 || ex.steps.length > 6) err(`example.steps тоо ${ex.steps.length}`);
        ex.steps.forEach((t, i) => {
          if (endsWithPeriod(t)) err(`example.steps[${i}] төгсгөлд цэг`);
          mixedErrors(t).forEach((m) => err(`example.steps[${i}] ${m}`));
        });
        mixedErrors(ex.answer).forEach((m) => err(`example.answer ${m}`));
      }
    }
    if (s.watch != null) {
      if (typeof s.watch !== "string") err("watch бичвэр биш");
      else {
        if (endsWithPeriod(s.watch)) err("watch төгсгөлд цэг");
        mixedErrors(s.watch).forEach(err);
      }
    }
    const all = JSON.stringify(s);
    const b = badColor(all.replace(/\\\\/g, "\\"));
    if (b) err(b);
    if (/[•·]/.test(all)) err("«•» эсвэл «·» тэмдэгт — \\cdot ашигла");
  }
}

console.log(`Энгийн тайлбартай: ${filled}/${total}`);
if (errors.length) {
  console.log(`Алдаа ${errors.length}:`);
  errors.slice(0, 200).forEach((e) => console.log("  " + e));
  process.exit(1);
}
console.log("Алдаагүй");

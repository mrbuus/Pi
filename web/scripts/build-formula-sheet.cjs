#!/usr/bin/env node
/* ============================================================================
 * Нийтийн «Томьёо» хэрэгслийн хөнгөн өгөгдөл үүсгэнэ.
 *
 *   Эх:    api/prisma/data/formulas/*.json  (`_`-ээр эхэлсэн файлыг алгасна)
 *   Гаралт: web/public/tools/formulas.json   (гараар ЗАСАХГҮЙ — дахин үүсгэнэ)
 *
 * Ажиллуулах (web/ хавтаснаас):
 *   node scripts/build-formula-sheet.cjs
 *
 * Яагаад: томьёоны API нэвтрэлт шаарддаг, харин хэрэглэгдэхүүн нэвтрэлтгүй
 * хүнд ч нээлттэй. Иймээс статик файл болгож, зөвхөн таб нээхэд нэг удаа татна.
 * Хүнд талбар (derivation, quiz, related) орохгүй.
 *
 * Зөвхөн `fs`/`path` — гадны сан хэрэггүй. Алдаатай өгөгдөл олдвол 1 кодоор
 * гарч, файл бичихгүй.
 * ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "../../api/prisma/data/formulas");
const OUT = path.resolve(__dirname, "../public/tools/formulas.json");

const str = (v) => (typeof v === "string" ? v.trim() : "");
const strArr = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()) : []);

function main() {
  const files = fs
    .readdirSync(SRC)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .sort();
  if (!files.length) fail(`Эх файл олдсонгүй: ${SRC}`);

  const errors = [];
  const sections = [];
  const formulas = [];
  const seen = new Map();

  for (const file of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(SRC, file), "utf8"));
    } catch (e) {
      errors.push(`${file}: JSON уншиж чадсангүй (${e.message})`);
      continue;
    }
    const sec = data && data.section;
    if (!sec || !str(sec.slug) || !str(sec.title) || !Array.isArray(data.formulas)) {
      errors.push(`${file}: section эсвэл formulas дутуу`);
      continue;
    }
    const sectionSlug = str(sec.slug);
    sections.push({
      slug: sectionSlug,
      title: str(sec.title),
      order: Number.isInteger(sec.order) ? sec.order : 999,
      description: str(sec.description),
      count: 0,
    });

    data.formulas.forEach((f, i) => {
      const at = `${file}#${i}`;
      const slug = str(f && f.slug);
      if (!slug) return errors.push(`${at}: slug хоосон`);
      if (seen.has(slug)) return errors.push(`${at}: slug давхардсан «${slug}» (${seen.get(slug)})`);
      seen.set(slug, at);
      const latex = str(f.latex);
      if (!latex) errors.push(`${at}: latex хоосон`);
      if (!str(f.title)) errors.push(`${at}: гарчиг хоосон`);
      if (!Number.isInteger(f.grade) || f.grade < 7 || f.grade > 12) errors.push(`${at}: анги 7-12 биш`);
      if (f.level !== "CORE" && f.level !== "EXTRA") errors.push(`${at}: түвшин CORE/EXTRA биш`);

      const examples = (Array.isArray(f.examples) ? f.examples : [])
        .filter((e) => e && str(e.problem))
        .map((e) => ({ problem: str(e.problem), steps: strArr(e.steps), answer: str(e.answer) }));
      const variants = (Array.isArray(f.variants) ? f.variants : [])
        .filter((v) => v && str(v.latex))
        .map((v) => ({ label: str(v.label), latex: str(v.latex) }));

      const out = {
        slug,
        title: str(f.title),
        section: sectionSlug,
        order: Number.isInteger(f.order) ? f.order : 0,
        grade: f.grade,
        level: f.level,
        latex,
        conditions: strArr(f.conditions),
        explanation: str(f.explanation),
        mnemonic: str(f.mnemonic),
        eeshTip: str(f.eeshTip),
        examples,
        commonMistakes: strArr(f.commonMistakes),
        // Ихэнх түлхүүр үг нь гарчигтай ижил — давхардлыг хасна
        keywords: strArr(f.keywords).filter((k) => k !== str(f.title)),
        widget: str(f.widget) || null,
      };
      const general = str(f.general);
      if (general && general !== latex) out.general = general;
      if (variants.length) out.variants = variants;
      // Энгийн тайлбар (web/scripts/check-formula-simple.cjs-ээр шалгагдсан)
      const sm = f.simple;
      if (sm && str(sm.say) && str(sm.formula) && Array.isArray(sm.steps) && sm.example) {
        out.simple = {
          say: str(sm.say),
          formula: str(sm.formula),
          parts: (Array.isArray(sm.parts) ? sm.parts : []).filter((x) => x && str(x.tex)).map((x) => ({ tex: str(x.tex), mean: str(x.mean) })),
          steps: strArr(sm.steps),
          example: { problem: str(sm.example.problem), steps: strArr(sm.example.steps), answer: str(sm.example.answer) },
        };
        if (str(sm.watch)) out.simple.watch = str(sm.watch);
      }
      formulas.push(out);
    });
  }

  if (errors.length) fail(`Өгөгдөлд ${errors.length} алдаа:\n  ${errors.join("\n  ")}`);

  sections.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
  const secOrder = new Map(sections.map((s, i) => [s.slug, i]));
  formulas.sort(
    (a, b) => secOrder.get(a.section) - secOrder.get(b.section) || a.order - b.order || a.slug.localeCompare(b.slug),
  );
  for (const s of sections) s.count = formulas.filter((f) => f.section === s.slug).length;

  // Хоёр хуваана (эзэн 2026-11-02: «томьёо руу орсон хүн л хүлээлтийг мэдэрнэ»):
  //   formulas.json            — жагсаалт: гарчиг, томьёо, нөхцөл, энгийн тайлбарын эхний хэсэг (Томьёо таб нээхэд)
  //   formulas-detail/<бүлэг>.json — алхам, жишээ, нэмэлт тайлбар («Алхамаар ойлгох»/«Нэмэлт» анх дарахад)
  const DETAIL = ["explanation", "examples", "commonMistakes", "mnemonic", "eeshTip", "conditions", "general", "variants"];
  const details = new Map();
  const light = formulas.map((f) => {
    const l = { ...f };
    const d = {};
    for (const k of DETAIL) {
      if (k in l) d[k] = l[k];
      delete l[k];
    }
    if (l.simple) {
      const { steps, example, watch, ...head } = l.simple;
      d.simpleMore = { steps, example, ...(watch ? { watch } : {}) };
      l.simple = head;
    }
    if (!details.has(f.section)) details.set(f.section, {});
    details.get(f.section)[f.slug] = d;
    return l;
  });
  const sheet = { version: 2, detail: true, count: formulas.length, sections, formulas: light };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(sheet) + "\n", "utf8");
  const dir = path.join(path.dirname(OUT), "formulas-detail");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const [sec, map] of details) fs.writeFileSync(path.join(dir, `${sec}.json`), JSON.stringify(map) + "\n", "utf8");
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  const dkb = [...details.keys()].reduce((a, s) => a + fs.statSync(path.join(dir, `${s}.json`)).size, 0) / 1024;
  console.log(`formulas.json: ${formulas.length} томьёо, ${sections.length} бүлэг, ${kb} KB; дэлгэрэнгүй ${details.size} файл ${dkb.toFixed(0)} KB -> ${path.relative(process.cwd(), OUT)}`);
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

main();

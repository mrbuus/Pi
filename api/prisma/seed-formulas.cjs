/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { validateFormulaFiles } = require('./formula-validator.cjs');
const root = path.join(__dirname, 'data', 'formulas');
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).trim() : null;
const commit = process.argv.includes('--commit');
if (onlyArg && !only) throw new Error('--only requires a section slug');
const files = fs.existsSync(root) ? fs.readdirSync(root).filter((name) => name.endsWith('.json') && !name.startsWith('_')).map((name) => path.join(root, name)) : [];
const validation = validateFormulaFiles(files);
if (validation.errors.length) {
  validation.errors.forEach((error) => console.error(error));
  throw new Error('Formula files failed schema or KaTeX validation; no database writes were made.');
}
validation.warnings.forEach((warning) => console.warn(`warning: ${warning}`));
const parsed = files.map((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
const selected = parsed.filter((data) => !only || data.section?.slug === only);
if (only && selected.length === 0) throw new Error(`No formula data found for section ${only}; no database writes were made.`);
const sections = new Map();
const formulas = [];
for (const data of selected) {
  sections.set(data.section.slug, data.section);
  formulas.push(...data.formulas.map((formula) => ({ ...formula, section: data.section })));
}
console.log(`Validated ${validation.filesChecked} source file(s), ${validation.formulasChecked} formula(s) with schema and KaTeX.`);
console.log(`Formula seed: ${sections.size} section(s), ${formulas.length} formula(s)${only ? ` for ${only}` : ''}.`);
if (!commit) {
  console.log('DRY-RUN: database unchanged. Add --commit to upsert.');
  process.exit(0);
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required with --commit');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    await prisma.$transaction(async (tx) => {
      for (const section of sections.values()) {
        await tx.formulaSection.upsert({ where: { slug: section.slug }, create: section, update: section });
      }
      for (const formula of formulas) {
        const data = {
          name: formula.title, slug: formula.slug, sectionSlug: formula.section.slug,
          order: formula.order, level: formula.level, grade: formula.grade,
          topicSlugs: formula.topicSlugs, latex: formula.latex, general: formula.general,
          variants: formula.variants, conditions: formula.conditions,
          explanation: formula.explanation, derivation: formula.derivation,
          mnemonic: formula.mnemonic, examples: formula.examples,
          commonMistakes: formula.commonMistakes, eeshTip: formula.eeshTip,
          relatedSlugs: formula.related, keywords: formula.keywords,
          widget: formula.widget, quiz: formula.quiz,
        };
        const bySlug = await tx.formula.findUnique({ where: { slug: formula.slug }, select: { id: true, slug: true } });
        const byName = await tx.formula.findUnique({ where: { name: formula.title }, select: { id: true, slug: true } });
        if (byName && byName.slug !== null && byName.slug !== formula.slug) {
          throw new Error(`Formula title collision: ${formula.title} already belongs to slug ${byName.slug}`);
        }
        if (bySlug && byName && bySlug.id !== byName.id) {
          throw new Error(`Formula slug/title point to different database rows: ${formula.slug}`);
        }
        const existing = bySlug ?? byName;
        if (existing) await tx.formula.update({ where: { id: existing.id }, data });
        else await tx.formula.create({ data });
      }
    });
    console.log(`Upserted ${sections.size} section(s), ${formulas.length} formula(s).`);
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exit(1); });

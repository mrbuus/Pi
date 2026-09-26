/* eslint-disable */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, 'data', 'formulas');
const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);
const commit = process.argv.includes('--commit');
const files = fs.existsSync(root) ? fs.readdirSync(root).filter((name) => name.endsWith('.json') && !name.startsWith('_')).map((name) => path.join(root, name)) : [];
const sections = new Map();
const formulas = [];
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (only && data.section?.slug !== only) continue;
  sections.set(data.section.slug, data.section);
  formulas.push(...data.formulas.map((formula) => ({ ...formula, section: data.section })));
}
const slugs = new Set();
for (const formula of formulas) {
  if (!formula.slug || slugs.has(formula.slug)) throw new Error(`Missing or duplicate slug: ${formula.slug}`);
  slugs.add(formula.slug);
}
for (const formula of formulas) for (const related of formula.related ?? []) {
  if (!slugs.has(related)) console.warn(`Warning: ${formula.slug} references formula not included in this seed run: ${related}`);
}
console.log(`Formula seed: ${sections.size} section(s), ${formulas.length} formula(s)${only ? ` for ${only}` : ''}.`);
if (!commit) {
  console.log('DRY-RUN: database unchanged. Add --commit to upsert.');
  process.exit(0);
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    for (const section of sections.values()) {
      await prisma.formulaSection.upsert({ where: { slug: section.slug }, create: section, update: section });
    }
    for (const formula of formulas) {
      const data = {
        name: formula.title, slug: formula.slug, sectionSlug: formula.section.slug,
        order: formula.order, level: formula.level, grade: formula.grade ?? null,
        topicSlugs: formula.topicSlugs, latex: formula.latex, general: formula.general,
        variants: formula.variants ?? undefined, conditions: formula.conditions ?? undefined,
        explanation: formula.explanation ?? null, derivation: formula.derivation ?? undefined,
        mnemonic: formula.mnemonic ?? null, examples: formula.examples,
        commonMistakes: formula.commonMistakes ?? undefined, eeshTip: formula.eeshTip ?? null,
        relatedSlugs: formula.related ?? [], keywords: formula.keywords ?? [],
        widget: formula.widget ?? null, quiz: formula.quiz,
      };
      const bySlug = await prisma.formula.findUnique({ where: { slug: formula.slug }, select: { id: true } });
      const byName = bySlug ?? await prisma.formula.findUnique({ where: { name: formula.title }, select: { id: true } });
      if (byName) await prisma.formula.update({ where: { id: byName.id }, data });
      else await prisma.formula.create({ data });
    }
    console.log(`Upserted ${sections.size} section(s), ${formulas.length} formula(s).`);
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exit(1); });

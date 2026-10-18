/* eslint-disable */
/**
 * Fix book 1000 content issues:
 * 1. Remove score text (/1 оноо/, (1 оноо))
 * 2. Convert Unicode math alphanumerics to text
 * 3. Convert Unicode math symbols to LaTeX
 * 4. Recover missing choices for CHOICE format problems (from statement text)
 * 5. Clean PDF extraction artifacts (excess whitespace)
 * 6. Fix odd-dollar issues
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const katex = require(path.join(__dirname, '..', '..', 'web', 'node_modules', 'katex'));
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/src/generated/prisma/client');

const COMMIT = process.argv.includes('--commit');
const AUDIT_FILE = '/private/tmp/claude-501/audit-1000.json';

// === KaTeX validation ===
function validateKaTeX(text) {
  if (!text || typeof text !== 'string') return { valid: true };
  const dollars = (text.match(/\$/g) || []).length;
  if (dollars % 2) return { valid: false, error: 'Odd number of $ symbols' };

  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const math = m[1] !== undefined ? m[1] : m[2];
    try {
      katex.renderToString(math, { throwOnError: true, strict: 'ignore', displayMode: m[1] !== undefined, maxSize: 20, maxExpand: 1000 });
    } catch (e) {
      return { valid: false, error: `KaTeX error: ${String(e.message).slice(0, 100)}` };
    }
  }
  return { valid: true };
}

// === Remove score text ===
function removeScoreText(text) {
  if (!text) return text;
  return text
    .replace(/\/\s*\d+\s*оноо\s*\//gu, '')
    .replace(/\(\s*\d+\s*оноо\s*\)/gu, '')
    .trim();
}

// === Segment math/text (same as audit) ===
function segments(input) {
  const out = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let last = 0, m;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) out.push({ t: 'text', v: input.slice(last, m.index) });
    out.push({ t: 'math', v: m[1] !== undefined ? m[1] : m[2], display: m[1] !== undefined });
    last = re.lastIndex;
  }
  if (last < input.length) out.push({ t: 'text', v: input.slice(last) });
  return out;
}

// === Convert Unicode math symbols to LaTeX ===
function fixUnicodeMathSymbols(text) {
  if (!text) return text;

  const map = {
    '√': '\\sqrt{}',
    '∛': '\\sqrt[3]{}',
    '∜': '\\sqrt[4]{}',
    '×': '\\cdot',
    '÷': '\\div',
    '·': '\\cdot',
    '∙': '\\cdot',
    '•': '\\cdot',
    '≤': '\\leq',
    '≥': '\\geq',
    '≠': '\\neq',
    '≈': '\\approx',
    '±': '\\pm',
    '∓': '\\mp',
    '∞': '\\infty',
    '∠': '\\angle',
    '°': '^{\\circ}',
    '′': "'",
    '″': "''",
    '→': '\\to',
    '⇒': '\\Rightarrow',
    '⇔': '\\Leftrightarrow',
    '∈': '\\in',
    '∉': '\\notin',
    '⊂': '\\subset',
    '⊆': '\\subseteq',
    '∪': '\\cup',
    '∩': '\\cap',
    '∑': '\\sum',
    '∫': '\\int',
    '△': '\\triangle',
    '⊥': '\\perp',
    '∥': '\\parallel',
    '²': '^{2}',
    '³': '^{3}',
    '⁴': '^{4}',
    '⁵': '^{5}',
    '⁰': '^{0}',
    '¹': '^{1}',
    'π': '\\pi',
    '−': '-',
  };

  let result = text;
  for (const [uni, latex] of Object.entries(map)) {
    result = result.split(uni).join(latex);
  }
  return result;
}

// === Convert Unicode math alphanumeric to text ===
function fixUnicodeMathAlphanumeric(text) {
  if (!text) return text;

  const mathAlphanumMap = {
    '𝐀': 'A', '𝐁': 'B', '𝐂': 'C', '𝐃': 'D', '𝐄': 'E',
    '𝐅': 'F', '𝐆': 'G', '𝐇': 'H', '𝐈': 'I', '𝐉': 'J',
    '𝐊': 'K', '𝐋': 'L', '𝐌': 'M', '𝐍': 'N', '𝐎': 'O',
    '𝐏': 'P', '𝐐': 'Q', '𝐑': 'R', '𝐒': 'S', '𝐓': 'T',
    '𝐔': 'U', '𝐕': 'V', '𝐖': 'W', '𝐗': 'X', '𝐘': 'Y', '𝐙': 'Z',
    '𝐚': 'a', '𝐛': 'b', '𝐜': 'c', '𝐝': 'd', '𝐞': 'e',
    '𝐟': 'f', '𝐠': 'g', '𝐡': 'h', '𝐢': 'i', '𝐣': 'j',
    '𝐤': 'k', '𝐥': 'l', '𝐦': 'm', '𝐧': 'n', '𝐨': 'o',
    '𝐩': 'p', '𝐪': 'q', '𝐫': 'r', '𝐬': 's', '𝐭': 't',
    '𝐮': 'u', '𝐯': 'v', '𝐰': 'w', '𝐱': 'x', '𝐲': 'y', '𝐳': 'z',
    '𝐴': 'A', '𝐵': 'B', '𝐶': 'C', '𝐷': 'D', '𝐸': 'E',
    '𝐹': 'F', '𝐺': 'G', '𝐻': 'H', '𝐼': 'I', '𝐽': 'J',
    '𝐾': 'K', '𝐿': 'L', '𝑀': 'M', '𝑁': 'N', '𝑂': 'O',
    '𝑃': 'P', '𝑄': 'Q', '𝑅': 'R', '𝑆': 'S', '𝑇': 'T',
    '𝑈': 'U', '𝑉': 'V', '𝑊': 'W', '𝑋': 'X', '𝑌': 'Y', '𝑍': 'Z',
    '𝑎': 'a', '𝑏': 'b', '𝑐': 'c', '𝑑': 'd', '𝑒': 'e',
    '𝑓': 'f', '𝑔': 'g', '𝒉': 'h', '𝑖': 'i', '𝑗': 'j',
    '𝑘': 'k', '𝑙': 'l', '𝑚': 'm', '𝑛': 'n', '𝑜': 'o',
    '𝑝': 'p', '𝑞': 'q', '𝑟': 'r', '𝑠': 's', '𝑡': 't',
    '𝑢': 'u', '𝑣': 'v', '𝑤': 'w', '𝑥': 'x', '𝑦': 'y', '𝑧': 'z',
  };

  let result = text;
  for (const [uni, plain] of Object.entries(mathAlphanumMap)) {
    result = result.split(uni).join(plain);
  }

  result = result.replace(/[\u{1D400}-\u{1D7FF}]/gu, 'X');
  return result;
}

// === Clean PDF whitespace and odd dollars ===
function cleanText(text) {
  if (!text) return text;
  // Remove 4+ spaces
  text = text.replace(/ {4,}/g, ' ');
  // Remove 3+ spaces after newline
  text = text.replace(/\n[ \t]{3,}/g, '\n');
  // Clean up multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  // Fix odd-dollar by removing stray $ at start if it's after garbage
  text = text.replace(/^[#\s]*\$(?=\d+!)/g, '');
  return text.trim();
}

// === Extract choices from statement ===
function extractChoicesFromStatement(statement) {
  // Pattern: (A). text (B). text (C). text (D). text (E). text
  // Also handle Unicode: (𝐀), (𝐁), etc.
  // Normalize Unicode to ASCII first
  let normalized = statement;
  const uniMap = { '𝐀': 'A', '𝐁': 'B', '𝐂': 'C', '𝐃': 'D', '𝐄': 'E' };
  for (const [u, a] of Object.entries(uniMap)) {
    normalized = normalized.split(u).join(a);
  }

  // Look for A-E with parentheses/dots
  const re = /\(([A-E])\)\s*\.?\s*([^\(]*?)(?=\([A-E]\)|$)/g;
  const matches = [...normalized.matchAll(re)];

  if (matches.length >= 5) {
    const choices = {};
    const startIdx = normalized.indexOf(matches[0][0]);

    for (const m of matches) {
      const label = m[1];
      let text = m[2].trim();
      text = text.replace(/[.,;:!?]+\s*$/, '').trim();
      choices[label] = text;
    }

    const cleanStatement = statement.slice(0, startIdx).trim();
    return { statement: cleanStatement, choices, found: true };
  }

  return { statement, choices: {}, found: false };
}

// === Main fix logic ===
async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  const auditData = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
  const tokenToIssues = {};
  for (const item of auditData) {
    tokenToIssues[item.token] = item.issues;
  }

  const book = await prisma.book.findFirst({ where: { code: '1000' }, select: { id: true } });
  if (!book) throw new Error('Book 1000 not found');

  const problems = await prisma.problem.findMany({
    where: { chapter: { bookId: book.id, deletedAt: null } },
    select: {
      id: true,
      token: true,
      format: true,
      statementText: true,
      choices: true,
      correctAnswer: true,
      choiceOptions: { select: { id: true, label: true, text: true, isCorrect: true } },
    },
  });

  let totalFixed = 0;
  let scoreTextRemoved = 0;
  let choicesRecovered = 0;
  let mathCleaned = 0;
  const fixedTokens = [];
  const unfixableIssues = [];

  for (const p of problems) {
    if (!tokenToIssues[p.token]) continue;

    const issues = tokenToIssues[p.token];
    let needsUpdate = false;

    // Fix statement
    let newStatement = p.statementText;

    // Remove score text
    const beforeScore = newStatement;
    newStatement = removeScoreText(newStatement);
    if (newStatement !== beforeScore) scoreTextRemoved++;

    // Clean whitespace and odd dollars
    const beforeClean = newStatement;
    newStatement = cleanText(newStatement);
    if (newStatement !== beforeClean) needsUpdate = true;

    // Try to extract choices if they're in statement
    const extracted = extractChoicesFromStatement(newStatement);
    if (extracted.found) {
      newStatement = extracted.statement;
      needsUpdate = true;
    }

    // Fix Unicode
    const beforeMath = newStatement;
    newStatement = fixUnicodeMathSymbols(newStatement);
    newStatement = fixUnicodeMathAlphanumeric(newStatement);
    if (newStatement !== beforeMath) mathCleaned++;

    // Validate statement
    const stmtVal = validateKaTeX(newStatement);
    if (!stmtVal.valid) {
      unfixableIssues.push({
        token: p.token,
        issue: `Statement: ${stmtVal.error}`,
      });
      continue;
    }

    // Fix choices
    let newChoiceOptions = p.choiceOptions;

    // For CHOICE with missing choices, use extracted ones
    if (p.format === 'CHOICE' && p.choiceOptions.length === 0 && extracted.found) {
      const labels = ['A', 'B', 'C', 'D', 'E'];
      let allValid = true;
      for (const l of labels) {
        const text = extracted.choices[l] || '';
        const val = validateKaTeX(text);
        if (!val.valid) {
          unfixableIssues.push({
            token: p.token,
            issue: `Choice ${l}: ${val.error}`,
          });
          allValid = false;
          break;
        }
      }
      if (allValid) {
        newChoiceOptions = labels.map((label) => ({
          label,
          text: extracted.choices[label] || '',
          isCorrect: false,
        }));
        choicesRecovered++;
        needsUpdate = true;
      }
    } else if (newChoiceOptions.length > 0) {
      // Fix existing choices
      const fixed = [];
      for (const c of newChoiceOptions) {
        let text = c.text;
        text = removeScoreText(text);
        text = cleanText(text);
        text = fixUnicodeMathSymbols(text);
        text = fixUnicodeMathAlphanumeric(text);
        const val = validateKaTeX(text);
        if (!val.valid) {
          unfixableIssues.push({
            token: p.token,
            issue: `Choice ${c.label}: ${val.error}`,
          });
          break;
        }
        if (text !== c.text) needsUpdate = true;
        fixed.push({ ...c, text });
      }
      newChoiceOptions = fixed;
    }

    if (!needsUpdate && newStatement === p.statementText) continue;

    // Print diff
    if (newStatement !== p.statementText || extracted.found) {
      console.log('\n' + '='.repeat(70));
      console.log(`${p.token} (${p.format})`);
      console.log('='.repeat(70));
      if (newStatement !== p.statementText) {
        const old = p.statementText.slice(0, 100).replace(/\n/g, ' ');
        const newS = newStatement.slice(0, 100).replace(/\n/g, ' ');
        console.log('STATEMENT:', old !== newS ? `${old} → ${newS}` : '(no change)');
      }
      if (extracted.found) {
        console.log(`CHOICES EXTRACTED: A,B,C,D,E`);
      }
    }

    totalFixed++;
    fixedTokens.push(p.token);

    // Commit if requested
    if (COMMIT) {
      try {
        await prisma.problem.update({
          where: { id: p.id },
          data: {
            statementText: newStatement,
            choiceOptions: newChoiceOptions.length > 0 ? {
              deleteMany: {},
              create: newChoiceOptions.map((c, idx) => ({
                label: c.label,
                text: c.text,
                isCorrect: c.isCorrect || false,
                order: idx,
              })),
            } : undefined,
            version: { increment: 1 },
          },
        });
        console.log('✓ COMMITTED');
      } catch (e) {
        console.error(`✗ FAILED: ${e.message}`);
        unfixableIssues.push({ token: p.token, issue: `Update: ${e.message}` });
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
  console.log(`Problems fixed: ${totalFixed}`);
  console.log(`Score text removed: ${scoreTextRemoved}`);
  console.log(`Choices recovered: ${choicesRecovered}`);
  console.log(`Math cleaned: ${mathCleaned}`);
  console.log(`\nFixed tokens (${fixedTokens.length}): ${fixedTokens.join(', ')}`);

  if (unfixableIssues.length > 0) {
    console.log(`\n⚠️  UNFIXABLE (${unfixableIssues.length}):`);
    for (const u of unfixableIssues) {
      console.log(`  ${u.token}: ${u.issue}`);
    }
  }

  if (!COMMIT) {
    console.log('\n📝 DRY-RUN - Run with --commit to apply');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});

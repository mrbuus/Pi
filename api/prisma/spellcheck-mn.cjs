#!/usr/bin/env node
/**
 * Монгол кирилл бичвэрийн үсгийн алдаа шалгагч — `dict-mn` (Hunspell) толь дээр.
 *
 * ЯАГААД ЭНЭ ХЭРЭГТЭЙ БОЛСОН БЭ (2026-08-26)
 * 100x100-ын шинэ хэвлэлийг PDF-ээс зургаар задлахад монгол үг өргөн эвдэрсэн:
 * «уржвэрийг» (үржвэрийг), «хуваагчын» (хуваагчийн), «тооүүдын» (тоонуудын),
 * «тооғ» (тоог — ғ нь монгол үсэг ч биш), «уттагал» (утгыг)… Гар аргаар зохиосон
 * «утгагүй үгсийн жагсаалт»-аар шүүхэд 831 бодлого «цэвэр» гэж гарсан ч, энэ
 * толиор шалгахад мөн 139 танихгүй үг үлдсэн байв. Өөрөөр хэлбэл нүдээр
 * зохиосон шүүлтүүр хангалтгүй — толь хэрэгтэй.
 *
 * ХАМРАХ ХҮРЭЭ
 * ЗӨВХӨН `$...$`-ийн ГАДНАХ монгол кирилл үгийг шалгана. Математикийн доторх
 * `\frac`, `\log`, хувьсагч зэрэг нь монгол үг биш тул шалгавал бүхэлдээ хуурамч
 * дохио болно. Энэ бол `web/src/components/MathText.tsx`-ийн хэрэглэдэг ЯГ ижил
 * дүрэм (`$`-аар хуваахад тэгш индекс = текст, сондгой = LaTeX) — хоёр газарт
 * ижил байлгах нь чухал, эс бөгөөс UI-д харагдаж байгаа зүйл шалгагдахгүй.
 *
 * ⚠️ Толь бүрэн ГҮЙЦЭД БИШ. Монгол хэл нөхцөл залгавартай тул нэг үндэснээс
 * маш олон хэлбэр үүсдэг; ховор хэлбэр, нэр томьёо, гадаад үг толинд байхгүй
 * байж болно. Тиймээс гаралт нь «алдаа» биш, «ШАЛГАХ НЭР ДЭВШИГЧ».
 *
 * ХЭРЭГЛЭЭ
 *   node prisma/spellcheck-mn.cjs <file.jsonl> [--field statement] [--json]
 *   node prisma/spellcheck-mn.cjs --db 100x100        # DB-ийн номыг шалгах
 *   echo "тэгшитгэлийг бод" | node prisma/spellcheck-mn.cjs -
 *
 * Толь олдохгүй бол статус 2-оор гарна (алдаа биш — тохиргоо дутуу).
 * Алдаатай үг олдвол статус 1 — pre-commit/CI-д шууд хэрэглэж болно.
 */

require('dotenv/config');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const DICT_CANDIDATES = [
  process.env.DICT_MN_PATH,
  path.join(os.homedir(), '.claude/skills/dict-mn/mn_MN'),
  path.join(__dirname, '../dict/mn_MN'),
  '/usr/share/hunspell/mn_MN',
];

function findDict() {
  for (const d of DICT_CANDIDATES) {
    if (d && fs.existsSync(`${d}.dic`) && fs.existsSync(`${d}.aff`)) return d;
  }
  return null;
}

/**
 * Төслийн цагаан жагсаалт — толинд байхгүй ч ЗӨВ гэж баталсан үгс.
 * Хүний нэр, нэр томьёо энд орно. Дэлгэрэнгүйг `dict-mn-allow.txt`-ээс үз.
 */
function loadAllowList() {
  const f = path.join(__dirname, 'dict-mn-allow.txt');
  if (!fs.existsSync(f)) return new Set();
  return new Set(
    fs
      .readFileSync(f, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.toLowerCase()),
  );
}

function findHunspell() {
  try {
    return execFileSync('which', ['hunspell'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/**
 * `$...$`-ийн гаднах монгол үгсийг салгаж авна.
 * Индекс тэгш = энгийн текст, сондгой = LaTeX (MathText.tsx-тэй ижил).
 */
function mongolianWords(text) {
  const out = [];
  const parts = String(text || '').split('$');
  for (let i = 0; i < parts.length; i += 2) {
    for (const w of parts[i].match(/[А-Яа-яӨөҮүЁё]+/g) || []) out.push(w);
  }
  return out;
}

function collect(argv) {
  const src = argv[0];
  const fieldIdx = argv.indexOf('--field');
  const field = fieldIdx !== -1 ? argv[fieldIdx + 1] : 'statement';

  if (src === '-') {
    return [{ id: 'stdin', text: fs.readFileSync(0, 'utf8') }];
  }
  if (!src || !fs.existsSync(src)) {
    console.error(`Файл олдсонгүй: ${src || '(заагаагүй)'}`);
    process.exit(2);
  }
  if (src.endsWith('.jsonl')) {
    return fs
      .readFileSync(src, 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l, i) => {
        const r = JSON.parse(l);
        const parts = [r[field]];
        // Сонголтууд дотор ч монгол үг байдаг («утгагүй», «шийдгүй»)
        if (r.choices && typeof r.choices === 'object') parts.push(...Object.values(r.choices));
        if (r.solution) parts.push(r.solution);
        return { id: r.token || `${src}:${i + 1}`, text: parts.filter(Boolean).join(' \n ') };
      });
  }
  return [{ id: src, text: fs.readFileSync(src, 'utf8') }];
}

function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');

  const dict = findDict();
  if (!dict) {
    console.error('⛔ dict-mn толь олдсонгүй. Хайсан замууд:');
    for (const d of DICT_CANDIDATES.filter(Boolean)) console.error(`   ${d}.dic`);
    console.error('   DICT_MN_PATH орчны хувьсагчаар зааж болно.');
    process.exit(2);
  }
  const hunspell = findHunspell();
  if (!hunspell) {
    console.error('⛔ `hunspell` бинар олдсонгүй.  brew install hunspell  (эсвэл apt install hunspell)');
    process.exit(2);
  }

  const allow = loadAllowList();
  const items = collect(argv);

  // Бүх ялгаатай үгийг НЭГ удаа шалгана — hunspell-ийн толь ачаалах зардал
  // (~1.4 сек) удаа бүр давтагдвал файл бүрд минут алдана.
  const perWord = new Map(); // үг -> [item id...]
  for (const it of items) {
    for (const w of mongolianWords(it.text)) {
      if (!perWord.has(w)) perWord.set(w, new Set());
      perWord.get(w).add(it.id);
    }
  }
  const words = [...perWord.keys()];
  if (!words.length) {
    console.log('Шалгах монгол үг олдсонгүй.');
    return;
  }

  const tmp = path.join(os.tmpdir(), `spellmn-${process.pid}.txt`);
  fs.writeFileSync(tmp, words.join('\n'), 'utf8');
  let bad = [];
  try {
    const out = execFileSync(hunspell, ['-d', dict, '-l', tmp], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    bad = [...new Set(out.split('\n').filter(Boolean))].filter((w) => !allow.has(w.toLowerCase()));
  } finally {
    fs.unlinkSync(tmp);
  }

  // Санал болгох засварыг зөвхөн алдаатай үгсэд авна (-a горим удаан тул цөөхөн дээр)
  const suggestions = {};
  if (bad.length) {
    const t2 = path.join(os.tmpdir(), `spellmn-s-${process.pid}.txt`);
    fs.writeFileSync(t2, bad.join('\n'), 'utf8');
    try {
      const out = execFileSync(hunspell, ['-d', dict, '-a', t2], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
      for (const line of out.split('\n')) {
        const m = /^&\s+(\S+)\s+\d+\s+\d+:\s*(.+)$/.exec(line);
        if (m) suggestions[m[1]] = m[2].split(', ').slice(0, 5);
      }
    } finally {
      fs.unlinkSync(t2);
    }
  }

  const freq = new Map();
  for (const it of items) {
    for (const w of mongolianWords(it.text)) {
      if (bad.includes(w)) freq.set(w, (freq.get(w) || 0) + 1);
    }
  }

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          dict,
          checked_items: items.length,
          distinct_words: words.length,
          issues: bad
            .map((w) => ({
              word: w,
              count: freq.get(w) || 0,
              suggestions: suggestions[w] || [],
              in: [...(perWord.get(w) || [])].slice(0, 20),
            }))
            .sort((a, b) => b.count - a.count),
        },
        null,
        1,
      ),
    );
  } else {
    console.log(`Толь: ${dict}   цагаан жагсаалт: ${allow.size} үг`);
    console.log(`Шалгасан бичлэг: ${items.length}   ялгаатай монгол үг: ${words.length}`);
    console.log(`Толинд БАЙХГҮЙ: ${bad.length}\n`);
    const sorted = bad.sort((a, b) => (freq.get(b) || 0) - (freq.get(a) || 0));
    for (const w of sorted.slice(0, 60)) {
      const s = suggestions[w]?.length ? `  →  ${suggestions[w].slice(0, 4).join(', ')}` : '';
      console.log(`  ${String(freq.get(w) || 0).padStart(4)}×  ${w}${s}`);
    }
    if (sorted.length > 60) console.log(`  … бас ${sorted.length - 60} үг`);
    console.log(
      '\n⚠️ Эдгээр нь «алдаа» биш «шалгах нэр дэвшигч» — нэр, гадаад үг, ховор хэлбэр толинд байхгүй байж болно.',
    );
  }

  process.exit(bad.length ? 1 : 0);
}

main();

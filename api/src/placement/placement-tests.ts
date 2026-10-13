// Түвшин тогтоох шалгалтын бодлогууд ба хариуны түлхүүр.
// Эх сурвалж: эзний «Түвшин шалгах.pdf» (Desktop/Books, 2026-10-13).
// ⚠️ Хариу (`answer`) зөвхөн серверт — publicTest() үүнийг хасаж илгээнэ.
// ⚠️ PDF-ийн 6 ба 8-р бодлого ижил (x^2-4x-21=0) — эх сурвалжийн дагуу үлдээв.

export type PlacementChoice = 'A' | 'B' | 'C' | 'D' | 'E';

export interface PlacementProblem {
  n: number;
  statement: string;
  kind: 'choice' | 'boxes';
  choices?: Record<PlacementChoice, string>;
  /** boxes: нүдний нэр ба хэдэн оронтой ([de] = 2 орон) */
  boxes?: { key: string; digits: number }[];
  answer: PlacementChoice | Record<string, string>;
  points: number;
}

export interface PlacementTest {
  key: string;
  title: string;
  minutes: number;
  instructions: string;
  problems: PlacementProblem[];
}

/** Хүүхдэд харагдах заавар — «Удирдлага»-аас засварлана */
export const DEFAULT_INSTRUCTIONS = [
  'Бодлого бүрийг цаасан дээр бодож, бодолтоо бүтэн бич',
  'Утсаараа бодолтынхоо зургийг аваад тухайн бодлогын доорх «Бодолтын зураг» товчоор оруул',
  'Хариугаа сонгох эсвэл нүдэнд бич',
  'Бодолтын зураггүй бодлогыг чадаагүй гэж үзнэ, тиймээс чадахаараа бүгдийг нь бод',
  'Хугацаа дуусахад шалгалт автоматаар илгээгдэнэ, эрт дуусвал «Илгээх» товчийг дар',
].join('\n');

const eq = (tex: string) => `$${tex}$ тэгшитгэлийг бод.`;

export const PLACEMENT_TESTS: Record<string, PlacementTest> = {
  'math-v1': {
    key: 'math-v1',
    title: 'Түвшин шалгах тест',
    minutes: 40,
    instructions: DEFAULT_INSTRUCTIONS,
    problems: [
      { n: 1, kind: 'choice', points: 1, answer: 'E', statement: eq('6-\\dfrac{2}{x}=10'),
        choices: { A: '$-4$', B: '$-1$', C: '$2$', D: '$4$', E: '$-0.5$' } },
      { n: 2, kind: 'choice', points: 1, answer: 'C', statement: eq('5-\\dfrac{3x}{4}=8x'),
        choices: { A: '$\\dfrac{3}{7}$', B: '$\\dfrac{5}{11}$', C: '$\\dfrac{4}{7}$', D: '$\\dfrac{4}{11}$', E: '$\\dfrac{7}{4}$' } },
      { n: 3, kind: 'choice', points: 1, answer: 'D', statement: eq('\\dfrac{3x+6}{2}-\\dfrac{7x-14}{3}=\\dfrac{x+1}{9}'),
        choices: { A: '$1$', B: '$2$', C: '$4$', D: '$8$', E: '$16$' } },
      { n: 4, kind: 'choice', points: 1, answer: 'A', statement: eq('x^2=16x'),
        choices: { A: '$0;\\ 16$', B: '$0;\\ 4$', C: '$\\pm 8$', D: '$\\pm 4$', E: '$-16;\\ 0$' } },
      { n: 5, kind: 'choice', points: 1, answer: 'E', statement: eq('32-2x^2=0'),
        choices: { A: '$0;\\ 16$', B: '$-16$', C: '$\\pm 8$', D: '$\\pm 6$', E: '$\\pm 4$' } },
      { n: 6, kind: 'choice', points: 1, answer: 'D', statement: eq('x^2-4x-21=0'),
        choices: { A: '$-7;\\ 3$', B: '$-6;\\ 14$', C: '$-7;\\ 6$', D: '$-3;\\ 7$', E: '$3;\\ 7$' } },
      { n: 7, kind: 'choice', points: 1, answer: 'C', statement: '$(2x-5)(x+4)=0$ тэгшитгэлийн шийдүүдийн нийлбэрийг ол.',
        choices: { A: '$6.5$', B: '$1.5$', C: '$-1.5$', D: '$-6.5$', E: '$-1$' } },
      { n: 8, kind: 'choice', points: 1, answer: 'D', statement: eq('x^2-4x-21=0'),
        choices: { A: '$-7;\\ 3$', B: '$-6;\\ 14$', C: '$-7;\\ 6$', D: '$-3;\\ 7$', E: '$3;\\ 7$' } },
      { n: 9, kind: 'choice', points: 1, answer: 'E', statement: eq('3x^2-5x-2=0'),
        choices: { A: '$-1;\\ 6$', B: '$-6;\\ 1$', C: '$-3;\\ 2$', D: '$-\\dfrac{1}{3};\\ \\dfrac{1}{2}$', E: '$-\\dfrac{1}{3};\\ 2$' } },
      { n: 10, kind: 'boxes', points: 2, answer: { a: '6', b: '2', c: '2', de: '12', fg: '28' },
        statement:
          'Тэгш өнцөгтийн талууд $3x+6$; $2x-2$ ба талбай нь $24$ бол периметрийг ол.\n\n' +
          'Тэгш өнцөгтийн талуудыг ашиглан талбайг олж өгсөн өгөгдөлтэй тэнцүүлж эмхэтгэвэл ' +
          '$x^2+x-[a]=0$ гэсэн тэгшитгэл гарах ба шийдийг олбол $x_1=[b]$, $x_2=-3$ гарна. ' +
          'Эндээс тэгш өнцөгтийн талын уртуудыг олбол $[c]$, $[de]$ байна. Иймд периметр $P=[fg]$ байна.',
        boxes: [{ key: 'a', digits: 1 }, { key: 'b', digits: 1 }, { key: 'c', digits: 1 }, { key: 'de', digits: 2 }, { key: 'fg', digits: 2 }] },
    ],
  },
};

export const DEFAULT_PLACEMENT_TEST = 'math-v1';

/** Хүүхдэд илгээх хэлбэр — хариугүй */
export function publicTest(t: PlacementTest) {
  return {
    key: t.key,
    title: t.title,
    minutes: t.minutes,
    instructions: t.instructions,
    problems: t.problems.map(({ answer: _answer, ...p }) => p),
  };
}

export type PlacementAnswers = Record<string, string | Record<string, string>>;

/** Бодлого бүрийн зөв эсэх ба нийт оноо. Хоосон хариу = буруу. */
export function gradePlacement(t: PlacementTest, answers: PlacementAnswers) {
  const perProblem: Record<string, boolean> = {};
  let score = 0, max = 0;
  for (const p of t.problems) {
    max += p.points;
    const given = answers[String(p.n)];
    let ok = false;
    if (p.kind === 'choice') ok = typeof given === 'string' && given === p.answer;
    else if (given && typeof given === 'object' && typeof p.answer === 'object') {
      const key = p.answer;
      ok = Object.keys(key).every((k) => String(given[k] ?? '').trim() === key[k]);
    }
    perProblem[String(p.n)] = ok;
    if (ok) score += p.points;
  }
  return { perProblem, score, max };
}

const CHOICE_KEYS: PlacementChoice[] = ['A', 'B', 'C', 'D', 'E'];
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** «Удирдлага»-аас ирсэн бодлогуудыг шалгаж цэвэрлэнэ; буруу бол алдааны мессеж */
export function parseProblems(raw: unknown): PlacementProblem[] | string {
  if (!Array.isArray(raw) || !raw.length) return 'Дор хаяж нэг бодлого оруулна уу';
  if (raw.length > 40) return '40-өөс олон бодлого оруулах боломжгүй';
  const out: PlacementProblem[] = [];
  for (const [i, r] of raw.entries()) {
    const n = i + 1, p = (r ?? {}) as Record<string, unknown>;
    const statement = str(p.statement, 4000);
    if (!statement) return `${n}-р бодлогын нөхцөл хоосон байна`;
    const points = Math.round(Number(p.points ?? 1));
    if (!(points >= 1 && points <= 10)) return `${n}-р бодлогын оноо 1–10 байх ёстой`;
    if (p.kind === 'boxes') {
      const boxes = (Array.isArray(p.boxes) ? p.boxes : []).map((b) => ({
        key: str((b as Record<string, unknown>)?.key, 3).toLowerCase(),
        digits: Math.round(Number((b as Record<string, unknown>)?.digits ?? 1)),
      }));
      if (!boxes.length) return `${n}-р бодлогод нүд алга`;
      if (boxes.some((b) => !/^[a-z]{1,3}$/.test(b.key) || !(b.digits >= 1 && b.digits <= 3))) return `${n}-р бодлогын нүдний нэр a–z, 1–3 оронтой байх ёстой`;
      const ans = (p.answer ?? {}) as Record<string, unknown>, answer: Record<string, string> = {};
      for (const b of boxes) {
        const v = str(ans[b.key], 4);
        if (!/^-?[0-9]+$/.test(v)) return `${n}-р бодлогын [${b.key}] нүдний хариу тоо байх ёстой`;
        answer[b.key] = v;
      }
      out.push({ n, kind: 'boxes', statement, points, boxes, answer });
    } else {
      const src = (p.choices ?? {}) as Record<string, unknown>, choices = {} as Record<PlacementChoice, string>;
      for (const k of CHOICE_KEYS) choices[k] = str(src[k], 400);
      if (CHOICE_KEYS.filter((k) => choices[k]).length < 2) return `${n}-р бодлогод дор хаяж 2 сонголт хэрэгтэй`;
      const answer = str(p.answer, 1) as PlacementChoice;
      if (!CHOICE_KEYS.includes(answer) || !choices[answer]) return `${n}-р бодлогын зөв хариу хоосон сонголт байна`;
      out.push({ n, kind: 'choice', statement, points, choices, answer });
    }
  }
  return out;
}

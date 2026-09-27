/** Deterministic suggestions, not a proof of which method a learner must use.
 * No database, network, answer key, randomness, or mutation of caller objects.
 */
export interface TagProblem {
  token?: string;
  statementText?: string | null;
  choices?: unknown;
  chapterTitle?: string | null;
  analysis?: {
    topic?: string | null;
    formulas?: unknown;
    methods?: unknown;
  } | null;
}
export interface TagFormula {
  slug: string;
  topicSlugs: string[];
  keywords: string[];
  level?: string;
  name?: string;
  title?: string;
  latex?: string | null;
}
export interface FormulaSuggestion {
  slug: string;
  score: number;
  reasons: string[];
}
export interface TagRule {
  id: string;
  topics: string[];
  pattern: RegExp;
  target: RegExp;
  reason: string;
}
const rule = (
  id: string,
  topics: string,
  pattern: RegExp,
  target: RegExp,
  reason: string,
): TagRule => ({ id, topics: topics.split(','), pattern, target, reason });

// One row is one explainable mathematical signal, not 60 arbitrary keyword weights.
export const TAG_RULES: readonly TagRule[] = [
  rule(
    'log-product',
    'LOGEXP,LOGEQ,LOGINEQ',
    /\\log.*(?:ab|xy|\\cdot)/i,
    /log.*product|үржвэр.*лог|лог.*үржвэр/i,
    'Үржвэрийн логарифмын хэв маяг',
  ),
  rule(
    'log-quotient',
    'LOGEXP,LOGEQ,LOGINEQ',
    /\\log.*\\(?:d?frac|tfrac)/i,
    /log.*quotient|ногдвор|харьцааны лог/i,
    'Бутархайн логарифмын хэв маяг',
  ),
  rule(
    'log-power',
    'LOGEXP,LOGEQ,LOGINEQ',
    /\\log.*\^/i,
    /log.*power|лог.*зэрэг|зэргийн лог/i,
    'Зэргийн логарифмын хэв маяг',
  ),
  rule(
    'log-base',
    'LOGEXP,LOGEQ,LOGINEQ',
    /\\(?:log|ln|lg)(?:_|\b)/i,
    /log.*(?:base|definition)|логарифмын тодорхойлолт|суурь сол/i,
    'Логарифмын суурь ба тодорхойлолт',
  ),
  rule(
    'log-equation',
    'LOGEQ',
    /\\(?:log|ln|lg).*=/i,
    /log.*equation|логарифм.*тэгшитгэл/i,
    'Логарифм оролцсон тэгшитгэл',
  ),
  rule(
    'log-inequality',
    'LOGINEQ',
    /\\(?:log|ln|lg).*(?:[<>]|\\(?:le|ge))/i,
    /log.*inequal|логарифм.*тэнцэтгэл биш/i,
    'Логарифм оролцсон тэнцэтгэл биш',
  ),
  rule(
    'exponential-equation',
    'EXPEQ',
    /\^\{?[^}\s]*x[^}]*\}?.*=/i,
    /exp.*equation|илтгэгч.*тэгшитгэл/i,
    'Хувьсагч илтгэгчтэй тэгшитгэл',
  ),
  rule(
    'exponential-inequality',
    'EXPINEQ',
    /\^\{?[^}\s]*x[^}]*\}?.*(?:[<>]|\\(?:le|ge))/i,
    /exp.*inequal|илтгэгч.*тэнцэтгэл биш/i,
    'Хувьсагч илтгэгчтэй тэнцэтгэл биш',
  ),
  rule(
    'radical-equation',
    'IRREQ',
    /\\sqrt[^\n]*=/i,
    /radical.*equation|irr.*equation|иррационал.*тэгшитгэл/i,
    'Язгуур оролцсон тэгшитгэл; муж шалгана',
  ),
  rule(
    'radical-domain',
    'IRREQ,IRRINEQ,FUNC',
    /\\sqrt/i,
    /radical.*domain|square-root|язгуур.*муж|квадрат язгуур/i,
    'Язгуурын тодорхойлогдох муж',
  ),
  rule(
    'absolute-equation',
    'ABSEQ',
    /(?:\|[^|]*x[^|]*\||\\(?:lvert|left\|)).*=/i,
    /abs.*equation|модул.*тэгшитгэл/i,
    'Модультай тэгшитгэл',
  ),
  rule(
    'absolute-inequality',
    'ABSINEQ',
    /(?:\|[^|]*x[^|]*\||\\(?:lvert|left\|)).*(?:[<>]|\\(?:le|ge))/i,
    /abs.*inequal|модул.*тэнцэтгэл биш/i,
    'Модультай тэнцэтгэл биш',
  ),
  rule(
    'quadratic-roots',
    'RATEQ',
    /x\^\{?2\}?[^\n]*=\s*0/i,
    /quadratic.*(?:root|formula)|квадрат тэгшитгэл/i,
    'Квадрат тэгшитгэлийн язгуур',
  ),
  rule(
    'quadratic-vieta',
    'RATEQ',
    /x\^\{?2\}?[^\n]*=\s*0/i,
    /vieta|виет/i,
    'Язгууруудын нийлбэр ба үржвэрийг холбох Виет',
  ),
  rule(
    'discriminant',
    'RATEQ,PARAM',
    /дискриминант|давхар язгуур|ялгаатай.*язгуур|b\^\{?2\}?\s*-\s*4ac/i,
    /discriminant|дискриминант/i,
    'Квадрат тэгшитгэлийн язгуурын тоо',
  ),
  rule(
    'linear-equation',
    'RATEQ',
    /шугаман тэгшитгэл|ax\s*\+\s*b\s*=\s*0/i,
    /linear.*equation|шугаман.*тэгшитгэл/i,
    'Шугаман тэгшитгэлийн бүтэц',
  ),
  rule(
    'rational-domain',
    'RATEQ,RATINEQ,FUNC',
    /\\(?:d?frac|tfrac)\{[^}]+\}\{[^}]*x/i,
    /rational.*(?:domain|equation)|бутархай.*муж|рационал.*тэгшитгэл/i,
    'Хуваарь дахь хувьсагчийн хориглох утга',
  ),
  rule(
    'interval-sign',
    'RATINEQ,IRRINEQ',
    /интервал|тэмдгийн арга|\([^)]*x[^)]*\)\s*\([^)]*x[^)]*\).*?[<>]/i,
    /sign|interval|интервал|тэмдгийн арга/i,
    'Үржигдэхүүний тэмдгийн интервал',
  ),
  rule(
    'system-linear',
    'SYSTEM',
    /\\begin\{(?:cases|array)\}|систем/i,
    /system.*linear|cramer|шугаман систем|крамер/i,
    'Тэгшитгэлийн системийн арга',
  ),
  rule(
    'square-sum',
    'ALG',
    /\([^)]*\+[^)]*\)\s*\^\{?2\}?/i,
    /square.*sum|нийлбэрийн квадрат/i,
    'Нийлбэрийн квадрат',
  ),
  rule(
    'square-difference',
    'ALG',
    /\([^)]*-[^)]*\)\s*\^\{?2\}?/i,
    /square.*difference|ялгаврын квадрат/i,
    'Ялгаврын квадрат',
  ),
  rule(
    'difference-squares',
    'ALG',
    /[a-z]\^\{?2\}?\s*-\s*[a-z]\^\{?2\}?/i,
    /difference.*squares|квадратуудын ялгавар/i,
    'Квадратуудын ялгаврыг үржигдэхүүн болгох',
  ),
  rule(
    'cube-sum',
    'ALG',
    /\([^)]*\+[^)]*\)\s*\^\{?3\}?/i,
    /cube.*sum|нийлбэрийн куб/i,
    'Нийлбэрийн куб',
  ),
  rule(
    'power-product',
    'ALG,TOO',
    /a\^\{?m\}?\s*(?:a|\\cdot\s*a)\^\{?n\}?/i,
    /power.*product|зэрэг.*үржих|зэргийн чанар/i,
    'Ижил суурьтай зэргийг үржүүлэх',
  ),
  rule(
    'power-quotient',
    'ALG,TOO',
    /\\frac\{a\^.*\}\{a\^/i,
    /power.*quotient|зэрэг.*хуваах|зэргийн чанар/i,
    'Ижил суурьтай зэргийг хуваах',
  ),
  rule(
    'percent',
    'RATEQ,TOO',
    /%|хув(?:ь(?!сагч)|ийн|иар|ийг)|процент/i,
    /percent|хувь/i,
    'Хувь, хувийн өөрчлөлт',
  ),
  rule(
    'gcd',
    'TOO',
    /хиех|хамгийн их ерөнхий хуваагч/i,
    /gcd|хиех|ерөнхий хуваагч/i,
    'Хамгийн их ерөнхий хуваагч',
  ),
  rule(
    'lcm',
    'TOO',
    /хбех|хамгийн бага ерөнхий крат/i,
    /lcm|хбех|ерөнхий крат/i,
    'Хамгийн бага ерөнхий крат',
  ),
  rule(
    'sin-double',
    'TRIG,TRIGEQ',
    /\\sin\s*(?:\(?2\s*[a-z]|\{2[a-z])/i,
    /double.*sin|sin.*double|синусын давхар|давхар өнцгийн синус/i,
    'Давхар өнцгийн синус',
  ),
  rule(
    'cos-double',
    'TRIG,TRIGEQ',
    /\\cos\s*(?:\(?2\s*[a-z]|\{2[a-z])/i,
    /double.*cos|cos.*double|косинусын давхар|давхар өнцгийн косинус/i,
    'Давхар өнцгийн косинус',
  ),
  rule(
    'trig-identity',
    'TRIG,TRIGEQ',
    /\\sin\^\{?2\}?.*\\cos\^\{?2\}?/i,
    /pythagorean|үндсэн адилтгал/i,
    'Синус ба косинусын квадратын холбоо',
  ),
  rule(
    'sin-add',
    'TRIG,TRIGEQ',
    /\\sin\s*\([^)]*\+[^)]*\)/i,
    /sin.*add|синус.*нийлбэр|нийлбэр.*синус/i,
    'Нийлбэр өнцгийн синус',
  ),
  rule(
    'cos-add',
    'TRIG,TRIGEQ',
    /\\cos\s*\([^)]*\+[^)]*\)/i,
    /cos.*add|косинус.*нийлбэр|нийлбэр.*косинус/i,
    'Нийлбэр өнцгийн косинус',
  ),
  rule(
    'trig-basic',
    'TRIG,TRIGEQ',
    /\\(?:sin|cos|tan)\b|\\operatorname\{(?:tg|ctg)\}/i,
    /unit.circle|trig.*values|нэгж тойрог|онцгой өнцөг/i,
    'Тригонометрийн үндсэн утга ба нэгж тойрог',
  ),
  rule(
    'sin-equation',
    'TRIGEQ',
    /\\sin[^\n]*=/i,
    /sine.*equation|sin.*equation|синус.*тэгшитгэл/i,
    'Синусын тэгшитгэлийн ерөнхий шийд',
  ),
  rule(
    'cos-equation',
    'TRIGEQ',
    /\\cos[^\n]*=/i,
    /cosine.*equation|cos.*equation|косинус.*тэгшитгэл/i,
    'Косинусын тэгшитгэлийн ерөнхий шийд',
  ),
  rule(
    'tan-equation',
    'TRIGEQ',
    /(?:\\tan|\\operatorname\{tg\})[^\n]*=/i,
    /tangent.*equation|тангенс.*тэгшитгэл/i,
    'Тангенсын тэгшитгэлийн үе',
  ),
  rule(
    'half-angle',
    'TRIG',
    /\\(?:sin|cos).*\\frac\{[a-z]\}\{2\}|хагас өнцөг/i,
    /half|хагас өнцөг/i,
    'Хагас өнцгийн томьёо',
  ),
  rule(
    'radians',
    'TRIG',
    /радиан|градус|\^\\circ/i,
    /radian|радиан|градус/i,
    'Градус ба радианы шилжүүлэг',
  ),
  rule(
    'arithmetic-term',
    'SEQ',
    /арифметик|a_\{?n\}?\s*=.*\(n-1\).*d/i,
    /arith.*(?:term|general)|арифметик.*ерөнхий/i,
    'Арифметик прогрессийн ерөнхий гишүүн',
  ),
  rule(
    'arithmetic-sum',
    'SEQ',
    /(?:арифметик.*нийлбэр|S_\{?n\}?.*a_1)/i,
    /arith.*sum|арифметик.*нийлбэр/i,
    'Арифметик прогрессийн нийлбэр',
  ),
  rule(
    'geometric-term',
    'SEQ',
    /геометр прогресс|a_\{?n\}?\s*=.*q\^/i,
    /geom.*(?:term|general)|геометр.*ерөнхий/i,
    'Геометр прогрессийн ерөнхий гишүүн',
  ),
  rule(
    'geometric-sum',
    'SEQ',
    /геометр.*нийлбэр|S_\{?n\}?.*q\^/i,
    /geom.*sum|геометр.*нийлбэр/i,
    'Геометр прогрессийн нийлбэр',
  ),
  rule(
    'infinite-series',
    'SEQ',
    /хязгааргүй.*нийлбэр|\\sum.*\\infty/i,
    /infinite|хязгааргүй/i,
    'Нийлдэг хязгааргүй прогресс',
  ),
  rule(
    'factorial',
    'COMB',
    /\b[a-z0-9]+!|факториал/i,
    /factorial|факториал/i,
    'Факториалын тоолол',
  ),
  rule(
    'combination',
    'COMB',
    /C_.*\^|хэсэглэл|хэдэн аргаар.*сонго/i,
    /combination|choose|хэсэглэл/i,
    'Дараалал хамаарахгүй сонголт',
  ),
  rule(
    'arrangement',
    'COMB',
    /A_.*\^|байрлал/i,
    /arrangement|байрлал/i,
    'Дараалалтай хэсэг сонгох',
  ),
  rule(
    'permutation',
    'COMB',
    /сэлгэмэл|байрлуул|эрэмбэл/i,
    /permutation|сэлгэмэл/i,
    'Бүх элементийг эрэмбэлэх',
  ),
  rule(
    'binomial',
    'COMB,ALG',
    /бином|\(a\+b\)\^\{?n/i,
    /binomial|бином/i,
    'Биномын коэффициент',
  ),
  rule(
    'classical-probability',
    'PROB',
    /магадлал|P\([A-Z]\)/i,
    /classical|сонгодог|probability.*definition/i,
    'Тэнцүү боломжтой үр дүнгийн магадлал',
  ),
  rule(
    'conditional-probability',
    'PROB',
    /P\([^)]*\||нөхцөлт магадлал|өгөгдсөн нөхцөл/i,
    /conditional|нөхцөлт/i,
    'Нөхцөлт магадлал',
  ),
  rule(
    'independence',
    'PROB',
    /үл хамаарах|хараат бус/i,
    /independen|үл хамаарах|хараат бус/i,
    'Үл хамаарах үзэгдлийн үржвэр',
  ),
  rule(
    'complement',
    'PROB',
    /эсрэг үзэгдэл|дор хаяж нэг|P\(.*\\overline/i,
    /complement|эсрэг үзэгдэл/i,
    'Эсрэг үзэгдлээр бодох',
  ),
  rule(
    'bayes',
    'PROB',
    /байес|bayes|урвуу магадлал/i,
    /bayes|байес/i,
    'Байесын нөхцөл шинэчлэх томьёо',
  ),
  rule(
    'mean',
    'STAT',
    /дундаж|\\bar\{?x/i,
    /mean|дундаж/i,
    'Арифметик буюу жигнэсэн дундаж',
  ),
  rule(
    'variance',
    'STAT,PROB',
    /дисперс|variance|D\(X\)/i,
    /variance|дисперс/i,
    'Тархалтын дисперс',
  ),
  rule(
    'median',
    'STAT',
    /медиан|median/i,
    /median|медиан/i,
    'Эрэмбэлсэн өгөгдлийн медиан',
  ),
  rule(
    'limit',
    'LIMIT',
    /\\lim|хязгаар.*ол/i,
    /limit|хязгаар/i,
    'Функцийн хязгаарын дүрэм',
  ),
  rule(
    'derivative-power',
    'DERIV',
    /уламжлал|f\s*'\s*\(|\\frac\{d[yf]\}\{dx\}/i,
    /derivative.*power|power.*derivative|зэрэг.*уламжлал|уламжлал.*зэрэг/i,
    'Зэргийн функцийн уламжлал',
  ),
  rule(
    'derivative-product',
    'DERIV',
    /\(.*\\cdot.*\)\s*'|үржвэрийн уламжлал/i,
    /product.*derivative|derivative.*product|үржвэр.*уламжлал/i,
    'Үржвэрийн уламжлал',
  ),
  rule(
    'derivative-chain',
    'DERIV',
    /давхар функц|chain|f\(g\(x\)\)/i,
    /chain|давхар/i,
    'Давхар функцийн уламжлал',
  ),
  rule(
    'tangent',
    'DERIV,COORD',
    /шүргэгч.*тэгшитгэл|tangent line/i,
    /tangent|шүргэгч/i,
    'Уламжлалаар шүргэгчийн налалт',
  ),
  rule(
    'integral',
    'INTEG',
    /\\int/i,
    /integral|интеграл/i,
    'Интегралын үндсэн дүрэм',
  ),
  rule(
    'integral-parts',
    'INTEG',
    /хэсэгчлэн интеграл|\\int\s*[a-z]\s*d[a-z]/i,
    /parts|хэсэгчлэн/i,
    'Хэсэгчлэн интегралчлах',
  ),
  rule(
    'pythagoras',
    'PLANE',
    /пифагор|тэгш өнцөгт гурвалж/i,
    /pythagoras|пифагор/i,
    'Тэгш өнцөгт гурвалжны талууд',
  ),
  rule(
    'triangle-area',
    'PLANE',
    /гурвалж.*талбай/i,
    /triangle.*area|гурвалж.*талбай/i,
    'Гурвалжны талбай',
  ),
  rule(
    'heron',
    'PLANE',
    /герон|гурван тал.*талбай/i,
    /heron|герон/i,
    'Гурван талаас талбай олох',
  ),
  rule(
    'circle-area',
    'PLANE',
    /тойргийн талбай|дугуйн талбай/i,
    /circle.*area|дугуйн талбай|тойргийн талбай/i,
    'Дугуйн талбай',
  ),
  rule(
    'cosine-rule',
    'PLANE,TRIG',
    /косинусын теорем|хоёр тал.*завсрын өнцөг/i,
    /cosine.*rule|косинусын теорем/i,
    'Хоёр тал ба завсрын өнцгийн холбоо',
  ),
  rule(
    'sphere-volume',
    'SOLID',
    /бөмбөрц.*эзлэхүүн/i,
    /sphere.*volume|бөмбөрц.*эзлэхүүн/i,
    'Бөмбөрцгийн эзлэхүүн',
  ),
  rule(
    'cone-volume',
    'SOLID',
    /конус.*эзлэхүүн/i,
    /cone.*volume|конус.*эзлэхүүн/i,
    'Конусын эзлэхүүн',
  ),
  rule(
    'cylinder-volume',
    'SOLID',
    /цилиндр.*эзлэхүүн/i,
    /cylinder.*volume|цилиндр.*эзлэхүүн/i,
    'Цилиндрийн эзлэхүүн',
  ),
  rule(
    'prism-volume',
    'SOLID',
    /призм.*эзлэхүүн/i,
    /prism.*volume|призм.*эзлэхүүн/i,
    'Призмийн суурь ба өндөр',
  ),
  rule(
    'dot-product',
    'VECTOR',
    /скаляр үржвэр|\\vec.*\\cdot.*\\vec/i,
    /dot.*product|скаляр/i,
    'Векторын скаляр үржвэр',
  ),
  rule(
    'vector-length',
    'VECTOR',
    /вектор.*урт|\\lVert.*\\vec/i,
    /vector.*(?:length|norm)|вектор.*урт/i,
    'Векторын урт',
  ),
  rule(
    'distance',
    'COORD',
    /хоёр цэг.*зай|цэгүүдийн хоорондох зай/i,
    /distance|цэг.*зай/i,
    'Координатаас зай олох',
  ),
  rule(
    'line-slope',
    'COORD',
    /налалт|шулууны тэгшитгэл|y\s*=\s*kx\s*\+\s*b/i,
    /line.*slope|line.*equation|налалт|шулууны тэгшитгэл/i,
    'Шулууны налалт ба тэгшитгэл',
  ),
];

function strings(value: unknown): string[] {
  // Bound both traversal and retained text, including malformed/cyclic objects.
  const queue: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  const result: string[] = [];
  let remaining = 20_000;
  for (
    let visited = 0;
    queue.length && visited < 200 && remaining > 0;
    visited++
  ) {
    const item = queue.shift()!;
    if (item.depth > 5 || item.value == null) continue;
    if (typeof item.value === 'string') {
      const text = item.value.slice(0, remaining);
      result.push(text);
      remaining -= text.length;
    } else if (typeof item.value === 'object') {
      for (const child of Object.values(item.value).slice(0, 30)) {
        if (queue.length < 200)
          queue.push({ value: child, depth: item.depth + 1 });
      }
    }
  }
  return result;
}
function normalized(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\\(?:left|right)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\$+|\$+$/g, '')
    .trim();
}
const CODES = new Set([
  'TOO',
  'ALG',
  'RATEQ',
  'RATINEQ',
  'ABSEQ',
  'ABSINEQ',
  'IRREQ',
  'IRRINEQ',
  'EXPEQ',
  'EXPINEQ',
  'LOGEXP',
  'LOGEQ',
  'LOGINEQ',
  'FUNC',
  'TRIG',
  'TRIGEQ',
  'SEQ',
  'COMB',
  'PROB',
  'STAT',
  'LIMIT',
  'DERIV',
  'INTEG',
  'PLANE',
  'SOLID',
  'VECTOR',
  'COORD',
  'SYSTEM',
  'PARAM',
]);
export function problemTopic(problem: TagProblem): string {
  const token = problem.token?.match(/^100V3-([A-Z]+)-/i)?.[1].toUpperCase();
  if (token && CODES.has(token)) return token;
  const text = `${problem.chapterTitle ?? ''} ${problem.analysis?.topic ?? ''}`;
  const explicit = text
    .toUpperCase()
    .split(/[^A-Z]+/)
    .find((word) => CODES.has(word));
  if (explicit) return explicit;
  const hints: [RegExp, string][] = [
    [/логарифм.*тэгшитгэл/i, 'LOGEQ'],
    [/логарифм/i, 'LOGEXP'],
    [/иррационал/i, 'IRREQ'],
    [/тригонометр/i, 'TRIG'],
    [/прогресс/i, 'SEQ'],
    [/комбинаторик/i, 'COMB'],
    [/магадлал/i, 'PROB'],
    [/статистик/i, 'STAT'],
    [/уламжлал/i, 'DERIV'],
    [/интеграл/i, 'INTEG'],
    [/хязгаар/i, 'LIMIT'],
    [/огторгуй/i, 'SOLID'],
    [/геометр/i, 'PLANE'],
    [/вектор/i, 'VECTOR'],
    [/координат/i, 'COORD'],
    [/тэгшитгэл/i, 'RATEQ'],
    [/алгебр/i, 'ALG'],
  ];
  return hints.find(([pattern]) => pattern.test(text))?.[1] ?? 'UNKNOWN';
}

export function tagProblem(
  problem: TagProblem,
  formulas: readonly TagFormula[],
  options: { threshold?: number; limit?: number } = {},
): FormulaSuggestion[] {
  const threshold = options.threshold ?? 0.5;
  const limit = options.limit ?? 4;
  if (
    !Number.isFinite(threshold) ||
    threshold < 0.5 ||
    threshold > 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 4
  )
    throw new RangeError('threshold must be 0.5..1 and limit 1..4');
  const statement = normalized((problem.statementText ?? '').slice(0, 20_000));
  const methods = normalized(strings(problem.analysis?.methods).join(' '));
  const choices = normalized(strings(problem.choices).join(' '));
  const explicit = strings(problem.analysis?.formulas).map(normalized);
  const topic = problemTopic(problem);
  const result = new Map<string, FormulaSuggestion>();
  for (const formula of formulas) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formula.slug)) continue;
    const haystack = normalized(
      [formula.slug, formula.title, formula.name, ...formula.keywords]
        .filter(Boolean)
        .join(' '),
    );
    let score = 0;
    const reasons: string[] = [];
    const add = (amount: number, reason: string) => {
      score += amount;
      reasons.push(reason);
    };
    if (
      topic !== 'UNKNOWN' &&
      formula.topicSlugs.includes(topic) &&
      (!formula.level || formula.level === 'CORE')
    )
      add(0.25, `Сэдэв ${topic}: суурь томьёо`);
    const names = [formula.slug, formula.title, formula.name, formula.latex]
      .filter((value): value is string => !!value)
      .map(normalized);
    const explicitlyNamed = explicit.some((value) => names.includes(value));
    if (explicitlyNamed) add(1, 'Бодлогын шинжилгээнд энэ томьёог нэрлэсэн');
    let matching = 0;
    for (const current of TAG_RULES) {
      if (
        !formula.topicSlugs.some((code) => current.topics.includes(code)) ||
        !current.target.test(haystack)
      )
        continue;
      if (current.pattern.test(statement)) {
        matching++;
        if (matching <= 2) add(0.55, `${current.id}: ${current.reason}`);
      } else if (current.pattern.test(methods)) {
        matching++;
        if (matching <= 2) add(0.4, `${current.id}: шинжилгээний арга`);
      }
    }
    // Long phrases only; a distractor or generic one-word hint cannot tag by itself.
    const generic = new Set([
      'алгебр',
      'математик',
      'томьёо',
      'бодлого',
      'геометр',
      'тэгшитгэл',
      'хувьсагч',
      'тригонометр',
      'прогресс',
      'функц',
    ]);
    const phrases = formula.keywords
      .map(normalized)
      .filter((word) => word.length >= 4 && !generic.has(word));
    if (phrases.some((word) => statement.includes(word)))
      add(0.3, 'Бодлогын өгүүлбэрт түлхүүр үг таарсан');
    if (phrases.some((word) => choices.includes(word)))
      add(0.05, 'Сонголтын нэмэлт дохио');
    score = Math.min(explicitlyNamed ? 1 : 0.9, Math.round(score * 100) / 100);
    if (score < threshold) continue;
    const suggestion = { slug: formula.slug, score, reasons };
    const previous = result.get(formula.slug);
    if (!previous || previous.score < score)
      result.set(formula.slug, suggestion);
  }
  return [...result.values()]
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug, 'en'))
    .slice(0, limit);
}

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_SOURCE_DIR = '/Users/mr.buus/Desktop/future/100x100 V2';
const CHOICES = ['A', 'B', 'C', 'D', 'E'];

const CIRCLED = {
  '①': 1,
  '②': 2,
  '③': 3,
  '④': 4,
  '⑤': 5,
  '⑥': 6,
  '⑦': 7,
  '⑧': 8,
  '⑨': 9,
  '⑩': 10,
  '⑪': 11,
  '⑫': 12,
  '⑬': 13,
  '⑭': 14,
  '⑮': 15,
  '⑯': 16,
  '⑰': 17,
  '⑱': 18,
  '⑲': 19,
  '⑳': 20,
};

const TOPICS = [
  {
    filePrefix: 'Тоо-тоолол',
    answerTopic: 'ТОО ТООЛОЛ',
    title: 'Тоо тоолол',
    slug: 'TOO',
    order: 1,
    baseTimeLimitMin: 15,
  },
  {
    filePrefix: 'Тэгшитгэл',
    answerTopic: 'РАЦИОНАЛЬ ТЭГШИТГЭЛ',
    title: 'Рациональ тэгшитгэл',
    slug: 'RATEQ',
    order: 2,
    baseTimeLimitMin: 40,
  },
  {
    filePrefix: 'Тэнцэтгэл-биш',
    answerTopic: 'РАЦИОНАЛЬ ТЭНЦЭТГЭЛ БИШ',
    title: 'Рациональ тэнцэтгэл биш',
    slug: 'RATINEQ',
    order: 3,
    baseTimeLimitMin: 40,
  },
  {
    filePrefix: 'Модультай-тэгшитгэл',
    answerTopic: 'МОДУЛЬТАЙ ТЭГШИТГЭЛ',
    title: 'Модультай тэгшитгэл',
    slug: 'ABSEQ',
    order: 4,
    baseTimeLimitMin: 45,
  },
  {
    filePrefix: 'Модультай-тэнцэтгэл-биш',
    answerTopic: 'МОДУЛЬТАЙ ТЭНЦЭТГЭЛ БИШ',
    title: 'Модультай тэнцэтгэл биш',
    slug: 'ABSINEQ',
    order: 5,
    baseTimeLimitMin: 45,
  },
  {
    filePrefix: 'Иррациональ-тэгшитгэл',
    answerTopic: 'ИРРАЦИОНАЛЬ ТЭГШИТГЭЛ',
    title: 'Иррациональ тэгшитгэл',
    slug: 'IRREQ',
    order: 6,
    baseTimeLimitMin: 45,
  },
  {
    filePrefix: 'Иррациональ-тэнцэтгэл-биш',
    answerTopic: 'ИРРАЦИОНАЛЬ ТЭНЦЭТГЭЛ БИШ',
    title: 'Иррациональ тэнцэтгэл биш',
    slug: 'IRRINEQ',
    order: 7,
    baseTimeLimitMin: 45,
  },
  {
    filePrefix: 'Илтгэгч-тэгшитгэл',
    answerTopic: 'ИЛТГЭГЧ ТЭГШИТГЭЛ',
    title: 'Илтгэгч тэгшитгэл',
    slug: 'EXPEQ',
    order: 8,
    baseTimeLimitMin: 50,
  },
  {
    filePrefix: 'Илтгэгч-тэнцэтгэл-биш',
    answerTopic: 'ИЛТГЭГЧ ТЭНЦЭТГЭЛ БИШ',
    title: 'Илтгэгч тэнцэтгэл биш',
    slug: 'EXPINEQ',
    order: 9,
    baseTimeLimitMin: 50,
  },
  {
    filePrefix: 'Логарифм-илэрхийлэл',
    answerTopic: 'ЛОГАРИФМ ИЛЭРХИЙЛЭЛ',
    title: 'Логарифм илэрхийлэл',
    slug: 'LOGEXP',
    order: 10,
    baseTimeLimitMin: 45,
  },
  {
    filePrefix: 'Логарифм-тэгшитгэл',
    answerTopic: 'ЛОГАРИФМ ТЭГШИТГЭЛ',
    title: 'Логарифм тэгшитгэл',
    slug: 'LOGEQ',
    order: 11,
    baseTimeLimitMin: 50,
  },
  {
    filePrefix: 'Логарифм-тэнцэтгэл-биш',
    answerTopic: 'ЛОГАРИФМ ТЭНЦЭТГЭЛ БИШ',
    title: 'Логарифм тэнцэтгэл биш',
    slug: 'LOGINEQ',
    order: 12,
    baseTimeLimitMin: 60,
  },
];

const TOPIC_BY_ANSWER = new Map(TOPICS.map((topic) => [topic.answerTopic, topic]));

function normalizeText(value) {
  return value.normalize('NFC').replace(/\r/g, '');
}

function cleanText(text) {
  return normalizeText(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function commandPath(name, fallback) {
  if (fallback && fs.existsSync(fallback)) return fallback;
  try {
    return execFileSync('which', [name], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function readDocxText(filePath) {
  const textutil = commandPath('textutil');
  if (!textutil || !fs.existsSync(filePath)) return '';
  try {
    return execFileSync(textutil, ['-convert', 'txt', '-stdout', filePath], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    console.warn(`DOCX уншиж чадсангүй: ${filePath}`, error.message);
    return '';
  }
}

function readPdfText(filePath) {
  const pdftotext = commandPath('pdftotext', '/opt/homebrew/bin/pdftotext');
  if (!pdftotext || !fs.existsSync(filePath)) return '';
  try {
    return execFileSync(pdftotext, ['-layout', filePath, '-'], {
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch (error) {
    console.warn(`PDF уншиж чадсангүй: ${filePath}`, error.message);
    return '';
  }
}

function parseAnswerKey(text) {
  const answers = new Map();
  let currentTopic = null;
  let currentTest = null;
  let currentVariant = null;

  for (const rawLine of normalizeText(text).split('\n')) {
    const line = rawLine.trim();
    if (!line || line === 'ХАРИУ') continue;

    const topic = TOPIC_BY_ANSWER.get(line);
    if (topic) {
      currentTopic = topic.answerTopic;
      currentTest = null;
      currentVariant = null;
      continue;
    }

    const testMatch = line.match(/^Тест\s+(\d+)\s*-\s*([AB])$/i);
    if (testMatch && currentTopic) {
      currentTest = Number(testMatch[1]);
      currentVariant = testMatch[2].toUpperCase();
      const key = answerKey(currentTopic, currentTest, currentVariant);
      if (!answers.has(key)) answers.set(key, new Map());
      continue;
    }

    const answerMatch = line.match(/^(\d+)\.\s*([A-E])?\s*$/i);
    if (answerMatch && currentTopic && currentTest && currentVariant) {
      const key = answerKey(currentTopic, currentTest, currentVariant);
      answers.get(key).set(Number(answerMatch[1]), answerMatch[2]?.toUpperCase() ?? null);
    }
  }

  return answers;
}

function answerKey(topic, testNumber, variant) {
  return `${topic}|${testNumber}|${variant}`;
}

function locateTestMarker(text, testNumber, variant, fromIndex = 0) {
  const variantClass = variant === 'A' ? '[AА]' : '[BВ]';
  const markerRe = new RegExp(`Тест\\s*:?\\s*${testNumber}\\s*-\\s*${variantClass}`, 'u');
  const match = markerRe.exec(text.slice(fromIndex));
  return match ? fromIndex + match.index : -1;
}

function sectionForVariant(text, testNumber, variant) {
  const start = locateTestMarker(text, testNumber, variant);
  if (start < 0) return '';
  const nextVariant = variant === 'A' ? 'B' : null;
  const end = nextVariant ? locateTestMarker(text, testNumber, nextVariant, start + 1) : -1;
  return end < 0 ? text.slice(start) : text.slice(start, end);
}

function splitCircledQuestions(section) {
  const markerRe = /([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\s*\.?/gu;
  const markers = [];
  let match;
  while ((match = markerRe.exec(section))) {
    const number = CIRCLED[match[1]];
    if (number) markers.push({ number, index: match.index, marker: match[0] });
  }
  const byNumber = new Map();
  for (const [index, marker] of markers.entries()) {
    const next = markers[index + 1]?.index ?? section.length;
    const question = {
      number: marker.number,
      text: cleanText(section.slice(marker.index + marker.marker.length, next)),
    };
    const existing = byNumber.get(question.number);
    if (!existing || question.text.length > existing.text.length) {
      byNumber.set(question.number, question);
    }
  }
  return [...byNumber.values()].sort((a, b) => a.number - b.number);
}

function topicForPdf(fileName) {
  const normalized = normalizeText(fileName).replace(/\.pdf$/i, '').replace(/\s+copy$/i, '');
  for (const topic of TOPICS) {
    const prefix = normalizeText(topic.filePrefix);
    if (normalized.startsWith(`${prefix}-`)) {
      const testNumber = Number(normalized.slice(prefix.length + 1));
      if (Number.isInteger(testNumber)) return { topic, testNumber };
    }
  }
  return null;
}

function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function addFormula(formulas, name, latex, rationale) {
  formulas.push({ name, latex, rationale });
}

function hasChoiceOptions(text) {
  return /𝐀/u.test(text) && /𝐁/u.test(text) && /𝐂/u.test(text);
}

function hasFillPlaceholders(text) {
  return /\[[^\]]*[𝑎𝑏𝑐𝑑𝑒𝑓𝑔a-z][^\]]*\]/iu.test(text) || text.includes('Бодолт:');
}

function detectProblemFormat(text, answerKeyStatus) {
  if (hasChoiceOptions(text) || answerKeyStatus === 'VERIFIED') return 'CHOICE';
  if (hasFillPlaceholders(text)) return 'FILL_NUMBER';
  return 'OPEN';
}

function addQuestionForm(tags, skills, form) {
  tags.push({ type: 'QUESTION_FORM', name: form });
  skills.push(form);
}

function analyzeProblem({ topic, question, answerKeyStatus, auditNotes }) {
  const text = question.text;
  const normalized = normalizeText(text);
  const isInequality = includesAny(normalized, ['<', '>', '≤', '≥', 'тэнцэтгэл биш']);
  const asksInteger = normalized.includes('бүхэл');
  const asksCount = normalized.includes('хэдэн');
  const asksSum = normalized.includes('нийлбэрийг ол');
  const asksProduct = normalized.includes('үржвэрийг ол');
  const asksLeastInteger = normalized.includes('хамгийн бага бүхэл');
  const asksGreatestInteger = normalized.includes('хамгийн их бүхэл');
  const asksComplement = normalized.includes('үл хангах');
  const asksIntervalLength = normalized.includes('интервалын урт');
  const asksParameterRange = normalized.includes('утгын муж') || normalized.includes('параметр');
  const hasGraph = normalized.includes('график') || normalized.includes('𝑓(𝑥)') || normalized.includes('𝑔(𝑥)');
  const hasLog = normalized.includes('log') || normalized.includes('lg');
  const hasRadical = normalized.includes('√');
  const hasAbsolute = normalized.includes('|') || topic.slug.startsWith('ABS');
  const hasNaturalDomain = normalized.includes('∈ 𝑁') || normalized.includes('𝜖𝑁');
  const hasQuadratic = /𝑥\s*2|𝑥2|x\s*2/iu.test(normalized);
  const hasCubic = /𝑥\s*3|𝑥3|x\s*3/iu.test(normalized);
  const hasQuartic = /𝑥\s*4|𝑥4|x\s*4/iu.test(normalized);
  const hasParameter = /[𝑎𝑘]/u.test(normalized) || /\bk\b/i.test(normalized);
  const hasVariableBaseLog = hasLog && (/log\s*[𝑥x]|log\s*\|/iu.test(normalized) || /log[0-9+−\-]*𝑥/u.test(normalized));
  const isFillStyle = hasFillPlaceholders(normalized) && !hasChoiceOptions(normalized);

  const skills = [];
  const methods = [];
  const formulas = [];
  const domainNotes = [];
  const signRules = [];
  const commonMistakes = [];
  const tags = [
    { type: 'SUBTOPIC', name: topic.title },
    { type: 'SKILL', name: 'Source-based бодлого шинжилгээ' },
  ];
  let subtopic = topic.title;
  let solutionOutline = 'Эхлээд нөхцөл ба тодорхойлох мужийг ялгаж, дараа нь тухайн сэдвийн үндсэн хувиргалтаар бодоод гарсан хариуг source-ийн сонголтуудтай тулгана.';

  if (isFillStyle) {
    addQuestionForm(tags, skills, 'Нөхөх бодолтын даалгавар');
    methods.push('алхамчилсан бодолтын хоосон нүд нөхөх');
    commonMistakes.push('Бодолтын [a], [ab] зэрэг нүдний орны тоог буруу унших.');
  }
  if (hasGraph) {
    subtopic = `${topic.title} · график унших`;
    addQuestionForm(tags, skills, 'График унших');
    methods.push('графикаас тэмдэг унших', 'огтлолцол ба тэг болох утгаар завсар ялгах');
    addFormula(formulas, 'Функцийн тэмдгийн завсар', 'f(x)\\gtrless0', 'График x-тэнхлэгийн дээр/доор байгаа завсруудыг уншина.');
    domainNotes.push('График дээр тасралттай/тасархай цэг, босоо асимптот, тодорхойгүй цэг байвал шийдэд оруулахгүй.');
    commonMistakes.push('Графикийн нээлттэй/хаалттай цэгийг завсрын хаалттай андуурах.');
  }
  if (hasQuadratic) {
    methods.push('квадрат гурван гишүүнт задлах', 'дискриминант ашиглах');
    addFormula(formulas, 'Квадрат тэгшитгэлийн дискриминант', 'D=b^2-4ac', 'Шийдийн тоо, язгуур, тэмдгийн завсар тогтооход хэрэглэнэ.');
  }
  if (hasCubic || hasQuartic) {
    methods.push('олон гишүүнтийг үржвэр болгон задлах', 'рациональ язгуур шалгах');
    addFormula(formulas, 'Рациональ язгуурын шалгуур', 'x=\\frac{p}{q}', 'Бүхэл коэффициенттэй олон гишүүнтийн боломжит рациональ язгуурыг шалгана.');
  }
  if (hasParameter || asksParameterRange) {
    addQuestionForm(tags, skills, 'Параметрийн нөхцөл олох');
    methods.push('параметрийн муж ялгах');
    commonMistakes.push('Параметрийн нөхцөлийг шийдийн x-мужтай хольж бичих.');
  }

  if (topic.slug === 'TOO') {
    skills.push('Тоон олонлог ялгах', 'Тоон харьцуулалт', 'Нарийн тооцоолол');
    methods.push('тооны шинжээр ангилах', 'тоон завсар шалгах');
    addFormula(formulas, 'Анхны тооны тодорхойлолт', 'p>1, d(p)=2', 'Завсарт байгаа анхны тоог ялгах бодлогод хэрэглэнэ.');
    if (hasNaturalDomain) {
      addFormula(formulas, 'Натурал тооны нөхцөл', 'x\\in\\mathbb{N}', 'Өгөгдсөн үл мэдэгдэгчийг зөвхөн натурал утгаар шалгана.');
      domainNotes.push('𝑁 нөхцөлтэй бол зөвхөн натурал тоон шийдүүдийг авч үзнэ.');
    }
    if (normalized.includes('иррациональ')) {
      subtopic = 'Рациональ ба иррациональ тоо';
      addFormula(formulas, 'Иррациональ тооны шалгуур', 'x\\notin\\mathbb{Q}', '√n, π, e зэрэг тоонууд рациональ эсэхийг ялгана.');
      commonMistakes.push('Төгс квадрат биш язгуурыг рациональ гэж андуурах.');
    }
    if (normalized.includes('рациональ')) {
      addFormula(formulas, 'Рациональ тооны тодорхойлолт', 'x=\\frac{m}{n},\\ n\\ne0', 'Бутархай болон төгсгөлтэй/үелэх аравтын бутархайг ялгана.');
    }
    commonMistakes.push('Завсрын төгсгөл хаалттай эсэхийг анзаарахгүй тоо илүү/дутуу тоолох.');
    commonMistakes.push('Эсрэг тоо ба урвуу тоог хооронд нь солих.');
  }

  if (topic.slug === 'RATEQ') {
    skills.push('Алгебрийн хувиргалт', 'Тэгшитгэлийн язгуур шалгах');
    methods.push('үржвэр болгон задлах', 'ерөнхий хуваарьт оруулах', 'шийдийг эх тэгшитгэлд шалгах');
    addFormula(formulas, 'Рациональ тэгшитгэлийн тодорхойлох муж', 'Q(x)\\ne0', 'Хуваарь тэгтэй болох утгыг шийдээс заавал хасна.');
    addFormula(formulas, 'Тэгшитгэлийн эквивалент хувиргалт', 'A(x)=B(x)', 'Ижил илэрхийллээр үржүүлэхдээ тодорхойлох мужийн хязгаарлалт хадгална.');
    domainNotes.push('Хуваарьтай илэрхийлэл байвал бүх хуваарь 0 болох утгыг эхэнд нь хориглоно.');
    commonMistakes.push('Хуваарь тэглэх утгыг язгуур гэж үлдээх.');
    commonMistakes.push('Хоёр талыг илэрхийллээр үржүүлээд нэмэлт язгуур үүссэнийг шалгахгүй орхих.');
  }

  if (topic.slug === 'RATINEQ') {
    skills.push('Тэмдгийн хүснэгт байгуулах', 'Завсар дээр тэмдэг шалгах');
    methods.push('тэг болох утгуудыг олох', 'тэмдгийн хүснэгт', 'завсруудыг нэгтгэх/огтлуулах');
    addFormula(formulas, 'Тоологч ба хуваарийн тэг болох утгууд', 'P(x)=0,\\ Q(x)=0', 'Тоологчийн тэг ба хуваарийн тэгийг ялгаж тэмдгийн хүснэгт байгуулна.');
    addFormula(formulas, 'Завсар дээр тэмдэг шалгах', '\\frac{P(x)}{Q(x)}\\gtrless0', 'Тэг болох утгуудаар шулууныг хувааж тэмдэг шалгана.');
    domainNotes.push('Хуваарь 0 болох цэгийг шийдэд оруулахгүй, нээлттэй цэгээр тэмдэглэнэ.');
    signRules.push('Сөрөг тоонд үржүүлэх/хуваах үед <, >, ≤, ≥ тэмдэг эсрэг чиглэлд эргэнэ.');
    signRules.push('Хоёр талыг үл мэдэгдэх илэрхийллээр үржүүлэхээс өмнө түүний тэмдгийг мэдэх шаардлагатай.');
    commonMistakes.push('Хуваарийн тэгийг ≤ эсвэл ≥ үед хаалттай цэг болгож оруулах.');
    commonMistakes.push('Тэмдгийн хүснэгтийн завсрын төгсгөлүүдийг буруу хаах.');
  }

  if (topic.slug === 'ABSEQ' || topic.slug === 'ABSINEQ') {
    skills.push('Модуль задлах', 'Кейсээр бодох');
    methods.push('тэглэх цэгээр хуваах', 'кейсийн нөхцөл шалгах', 'зайн утгаар тайлбарлах');
    addFormula(formulas, 'Модулийн тодорхойлолт', '|A|=\\begin{cases}A,&A\\ge0\\\\-A,&A<0\\end{cases}', 'Модультай илэрхийллийг тэмдгийн мужаар задлах үндэс.');
    domainNotes.push('Модуль өөрөө бүх бодит дээр тодорхой боловч доторх хуваарь/язгуур/лог байвал тухайн илэрхийллийн тодорхойлох мужийг давхар шалгана.');
    if (topic.slug === 'ABSEQ') {
      addFormula(formulas, 'Модультай тэгшитгэл', '|A|=b\\Rightarrow A=b\\ \\text{эсвэл}\\ A=-b,\\ b\\ge0', 'Баруун тал сөрөг бол шийдгүй болох эрсдэлийг шалгана.');
      commonMistakes.push('|A| = b үед b < 0 эсэхийг шалгахгүй хоёр шийд бичих.');
    } else {
      addFormula(formulas, 'Модультай тэнцэтгэл биш', '|A|<b\\Rightarrow -b<A<b', 'b эерэг үед завсрын огтлолцол үүсгэнэ.');
      signRules.push('|A| > b ба |A| < b хэлбэрүүдийн нэгдэл/огтлолцол солигдохгүй эсэхийг шалгана.');
      commonMistakes.push('|A| < b-г A < b гэж ганц талын нөхцөл болгож орхих.');
    }
  }

  if (topic.slug === 'IRREQ' || topic.slug === 'IRRINEQ') {
    skills.push('Язгуурын тодорхойлох муж', 'Квадрат зэрэгт дэвшүүлсний дараах шалгалт');
    methods.push('радикандын нөхцөл тавих', 'хоёр талыг квадрат зэрэгт дэвшүүлэх', 'гарсан шийдийг эх нөхцөлд шалгах');
    addFormula(formulas, 'Квадрат язгуурын тодорхойлох муж', 'A(x)\\ge0', '√A(x) илэрхийлэл бодит байх үндсэн нөхцөл.');
    addFormula(formulas, 'Квадрат зэрэгт дэвшүүлсний дараах шалгалт', 'A=B\\Rightarrow A^2=B^2', 'Квадрат зэрэгт дэвшүүлэхэд нэмэлт шийд үүсгэж болдог тул эх тэгшитгэлд шалгана.');
    domainNotes.push('Язгуур доорх илэрхийлэл бүр ≥ 0 байх ёстой.');
    commonMistakes.push('Квадрат зэрэгт дэвшүүлсний дараа гарсан нэмэлт шийдийг эх бодлогод буцааж шалгахгүй авах.');
    if (topic.slug === 'IRRINEQ') {
      signRules.push('Тэнцэтгэл бишийг квадрат зэрэгт дэвшүүлэхдээ хоёр талын тэмдэг/эерэг эсэхийг тусад нь баталгаажуулна.');
      commonMistakes.push('Сөрөг байж болох хоёр талыг шууд квадрат зэрэгт дэвшүүлээд эквивалент гэж үзэх.');
    }
  }

  if (topic.slug === 'EXPEQ' || topic.slug === 'EXPINEQ') {
    skills.push('Илтгэгчийн хууль', 'Монотон чанар ашиглах');
    methods.push('ижил суурьт шилжүүлэх', 'орлуулах', 'монотон чанараар харьцуулах');
    addFormula(formulas, 'Ижил суурьтай илтгэгч', 'a^{f(x)}=a^{g(x)}\\Rightarrow f(x)=g(x),\\ a>0,\\ a\\ne1', 'Илтгэгч тэгшитгэлийг зэрэгтээс буулгана.');
    addFormula(formulas, 'Илтгэгчийн хууль', 'a^{m+n}=a^m a^n', 'Ижил суурьт хувиргах үед хэрэглэнэ.');
    domainNotes.push('Илтгэгчийн суурь тогтмол бол a > 0, a ≠ 1 нөхцөлтэй.');
    if (topic.slug === 'EXPINEQ') {
      signRules.push('a > 1 бол a^x өсөх тул тэнцэтгэл бишийн чиг хадгалагдана.');
      signRules.push('0 < a < 1 бол a^x буурах тул тэнцэтгэл бишийн тэмдэг эргэнэ.');
      commonMistakes.push('Суурь 0 ба 1-ийн хооронд байхад тэмдгийг эргүүлэхгүй бодох.');
    }
    commonMistakes.push('Суурийг ижил болгохын өмнө эерэг, 1 биш нөхцөлийг мартдаг.');
  }

  if (topic.slug === 'LOGEXP' || topic.slug === 'LOGEQ' || topic.slug === 'LOGINEQ' || hasLog) {
    skills.push('Логарифмын тодорхойлох муж', 'Логарифмын хууль');
    methods.push('аргументаас муж авах', 'сууриас муж авах', 'логарифмын хуулиар нэгтгэх');
    addFormula(formulas, 'Логарифмын тодорхойлох муж', '\\log_a f(x):\\ f(x)>0,\\ a>0,\\ a\\ne1', 'Логарифмын бодлого бүр дээр аргумент болон сууриас муж авна.');
    addFormula(formulas, 'Логарифмын үржвэрийн хууль', '\\log_a MN=\\log_a M+\\log_a N', 'Аргументууд тус бүр эерэг үед хэрэглэнэ.');
    addFormula(formulas, 'Логарифмын зэрэгийн хууль', '\\log_a M^r=r\\log_a M', 'Зэрэг агуулсан логарифм хувиргахад хэрэглэнэ.');
    domainNotes.push('Логарифмын аргумент бүр > 0 байх ёстой.');
    domainNotes.push('Логарифмын сууриас муж авна: a > 0, a ≠ 1.');
    if (topic.slug === 'LOGINEQ' || isInequality) {
      signRules.push('a > 1 үед log_a x өсөх тул тэнцэтгэл бишийн чиг хадгалагдана.');
      signRules.push('0 < a < 1 үед log_a x буурах тул тэнцэтгэл бишийн тэмдэг эргэнэ.');
      commonMistakes.push('log-ийн суурь 0 ба 1-ийн хооронд байхад тэмдэг эргэхийг мартах.');
    }
    commonMistakes.push('Тодорхойлох мужийг бодлогын төгсгөлд шалгахгүй, буруу шийд үлдээх.');
    commonMistakes.push('log_a(MN)-ийн өмнөх M>0, N>0 нөхцлийг ганц MN>0 гэж андуурах.');
  }

  if (isInequality) {
    skills.push('Тэнцэтгэл бишийн тэмдэг унших');
    addQuestionForm(tags, skills, 'Тэнцэтгэл биш бодох');
    if (!signRules.length) {
      signRules.push('Сөрөг тоонд үржүүлэх/хуваах үед тэнцэтгэл бишийн тэмдэг эсрэг чиглэлд эргэнэ.');
    }
  } else {
    addQuestionForm(tags, skills, 'Тэгшитгэл/утга олох');
  }

  if (asksInteger) {
    skills.push('Бүхэл шийд ялгах');
    methods.push('завсраас бүхэл утга тоолох');
    commonMistakes.push('Нээлттэй төгсгөл дээрх бүхэл тоог санамсаргүй оруулах.');
  }
  if (asksCount) {
    addQuestionForm(tags, skills, 'Шийдийн тоо тоолох');
  }
  if (asksSum) {
    addQuestionForm(tags, skills, 'Шийдийн нийлбэр олох');
    methods.push('шийдүүдийг олсны дараа нийлбэр тооцох');
  }
  if (asksProduct) {
    addQuestionForm(tags, skills, 'Шийдийн үржвэр олох');
    methods.push('шийдүүдийг олсны дараа үржвэр тооцох');
  }
  if (asksLeastInteger || asksGreatestInteger) {
    addQuestionForm(tags, skills, asksLeastInteger ? 'Хамгийн бага бүхэл шийд олох' : 'Хамгийн их бүхэл шийд олох');
    commonMistakes.push('Завсрын нээлттэй төгсгөл дээрх захын бүхэл тоог буруу авах.');
  }
  if (asksComplement) {
    addQuestionForm(tags, skills, 'Үл хангах муж олох');
    methods.push('шийдийн олонлогийн комплемент авах');
    commonMistakes.push('Үл хангах муж авахдаа хаалтыг эсрэгээр нь солихгүй орхих.');
  }
  if (asksIntervalLength) {
    addQuestionForm(tags, skills, 'Завсрын урт олох');
    methods.push('завсрын төгсгөлүүдийн ялгавар тооцох');
  }
  if (hasRadical && !domainNotes.some((note) => note.includes('Язгуур'))) {
    domainNotes.push('√ тэмдэгтэй илэрхийллийн доорх хэсэг бодит мужид ≥ 0 байна.');
  }
  if (hasAbsolute && !formulas.some((formula) => formula.name === 'Модулийн тодорхойлолт')) {
    addFormula(formulas, 'Модулийн тодорхойлолт', '|A|=\\begin{cases}A,&A\\ge0\\\\-A,&A<0\\end{cases}', 'Модультай илэрхийллийг тэмдгийн мужаар задлана.');
  }
  if (hasVariableBaseLog) {
    subtopic = `${topic.title} · хувьсах суурьтай логарифм`;
    domainNotes.push('Логарифмын суурь өөрөө x-ээс хамаарвал сууриас муж авна: base(x) > 0 ба base(x) ≠ 1.');
    commonMistakes.push('Хувьсах суурьтай log дээр аргументаас муж аваад сууриас муж авахаа орхих.');
  }

  const formulaNames = formulas.map((formula) => formula.name);
  for (const method of methods) tags.push({ type: 'METHOD', name: method });
  for (const skill of skills) tags.push({ type: 'SKILL', name: skill });

  const hasReviewIssue = answerKeyStatus !== 'VERIFIED' || auditNotes.length > 0 || !question.text;
  return {
    status: hasReviewIssue ? 'REVIEW_REQUIRED' : 'AUTO_DRAFT',
    confidence: hasReviewIssue ? 0.72 : 0.9,
    answerKeyStatus,
    topic: topic.answerTopic,
    subtopic,
    skills: unique(skills),
    methods: unique(methods),
    formulas,
    formulaNames: unique(formulaNames),
    domainNotes: unique(domainNotes),
    signRules: unique(signRules),
    commonMistakes: unique(commonMistakes),
    solutionOutline,
    auditNotes: unique(auditNotes),
    tags: uniqueTags(tags),
  };
}

function uniqueTags(tags) {
  const seen = new Set();
  return tags.filter((tag) => {
    const key = `${tag.type}:${tag.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function loadAnswerKeys(sourceDir) {
  const keys = new Map();
  for (const variant of ['A', 'B']) {
    const fileName = `100x100-тестийн-хариу-${variant}.docx`;
    const sourceFile = fs
      .readdirSync(sourceDir)
      .find((name) => normalizeText(name) === normalizeText(fileName));
    if (!sourceFile) continue;
    const parsed = parseAnswerKey(readDocxText(path.join(sourceDir, sourceFile)));
    for (const [key, value] of parsed) keys.set(key, value);
  }
  return keys;
}

function build100x100V2Plan({ sourceDir = DEFAULT_SOURCE_DIR } = {}) {
  const report = {
    sourceDir,
    generatedAt: new Date().toISOString(),
    skippedFiles: [],
    warnings: [],
    byTopic: {},
    totals: {
      pdfFiles: 0,
      tests: 0,
      problems: 0,
      autoTests: 0,
      manualTests: 0,
      answerVerified: 0,
      answerMissing: 0,
      reviewRequiredProblems: 0,
      formats: {
        CHOICE: 0,
        FILL_NUMBER: 0,
        OPEN: 0,
      },
    },
  };

  if (!fs.existsSync(sourceDir)) {
    report.warnings.push(`Source directory олдсонгүй: ${sourceDir}`);
    return { tests: [], report };
  }

  const answers = loadAnswerKeys(sourceDir);
  const pdfFiles = fs
    .readdirSync(sourceDir)
    .filter((name) => name.toLowerCase().endsWith('.pdf'))
    .filter((name) => !normalizeText(name).includes(' copy'))
    .filter((name) => !normalizeText(name).includes('8000'))
    .sort((a, b) => normalizeText(a).localeCompare(normalizeText(b), 'mn'));

  const tests = [];
  for (const fileName of pdfFiles) {
    const matched = topicForPdf(fileName);
    if (!matched) {
      report.skippedFiles.push(fileName);
      continue;
    }
    report.totals.pdfFiles += 1;
    const sourcePath = path.join(sourceDir, fileName);
    const pdfText = normalizeText(readPdfText(sourcePath));
    if (!pdfText) {
      report.warnings.push(`PDF хоосон уншигдлаа: ${fileName}`);
      continue;
    }

    for (const variant of ['A', 'B']) {
      const section = sectionForVariant(pdfText, matched.testNumber, variant);
      const questions = splitCircledQuestions(section);
      const answersForTest =
        answers.get(answerKey(matched.topic.answerTopic, matched.testNumber, variant)) ??
        new Map();
      const maxCount = Math.max(
        questions.length,
        answersForTest.size,
        ...Array.from(answersForTest.keys()),
        0,
      );
      const problems = [];

      for (const question of questions) {
        const auditNotes = [];
        const answer = answersForTest.get(question.number);
        const answerKeyStatus = answer ? 'VERIFIED' : 'MISSING';
        if (!answer) auditNotes.push('Хариуны түлхүүрт энэ бодлогын үсэг хоосон эсвэл олдсонгүй.');
        if (!question.text) auditNotes.push('PDF parser энэ бодлогын statement-ийг хоосон уншсан.');
        const analysis = analyzeProblem({
          topic: matched.topic,
          question,
          answerKeyStatus,
          auditNotes,
        });
        const format = detectProblemFormat(question.text, answerKeyStatus);
        problems.push({
          token: `100V2-${matched.topic.slug}-${String(matched.testNumber).padStart(2, '0')}-${variant}-${String(question.number).padStart(2, '0')}`,
          number: question.number,
          format,
          statementText: question.text,
          choices: format === 'CHOICE' ? CHOICES : null,
          correctAnswer: answer ?? { manualReview: true, reason: 'ANSWER_KEY_MISSING' },
          points: 1,
          answerKeyStatus,
          analysis,
        });
      }

      const missingQuestionNumbers = [];
      for (let number = 1; number <= maxCount; number += 1) {
        if (answersForTest.has(number) && !questions.some((q) => q.number === number)) {
          missingQuestionNumbers.push(number);
        }
      }
      const testAuditNotes = [];
      if (!section) testAuditNotes.push(`Тест:${matched.testNumber}-${variant} section PDF дотроос олдсонгүй.`);
      if (missingQuestionNumbers.length) {
        testAuditNotes.push(
          `Хариуны түлхүүрт байгаа боловч PDF-ээс parse хийгдээгүй дугаар: ${missingQuestionNumbers.join(', ')}`,
        );
      }
      if (!questions.length) testAuditNotes.push('Нэг ч circled question marker олдсонгүй.');
      const manual = problems.some((p) => p.answerKeyStatus !== 'VERIFIED') || testAuditNotes.length > 0;

      const testPlan = {
        topic: matched.topic,
        testNumber: matched.testNumber,
        variant,
        title: `100x100 V2 · ${matched.topic.title} ${matched.testNumber}-${variant}`,
        groupKey: `100x100 V2 · ${matched.topic.title} ${matched.testNumber}`,
        chapterTitle: `${matched.topic.title} · Тест ${matched.testNumber}`,
        chapterOrder: matched.topic.order * 100 + matched.testNumber,
        timeLimitMin: matched.topic.baseTimeLimitMin,
        pdfKey: `future:${sourcePath}`,
        sourcePath,
        gradingMode: manual ? 'MANUAL' : 'AUTO',
        auditNotes: testAuditNotes,
        problems,
      };
      tests.push(testPlan);
      addReportTest(report, testPlan);
    }
  }

  return { tests, report };
}

function addReportTest(report, testPlan) {
  const topicKey = testPlan.topic.answerTopic;
  if (!report.byTopic[topicKey]) {
    report.byTopic[topicKey] = {
      tests: 0,
      problems: 0,
      autoTests: 0,
      manualTests: 0,
      answerVerified: 0,
      answerMissing: 0,
      reviewRequiredProblems: 0,
      formats: {
        CHOICE: 0,
        FILL_NUMBER: 0,
        OPEN: 0,
      },
    };
  }
  const bucket = report.byTopic[topicKey];
  bucket.tests += 1;
  bucket.problems += testPlan.problems.length;
  bucket.autoTests += testPlan.gradingMode === 'AUTO' ? 1 : 0;
  bucket.manualTests += testPlan.gradingMode === 'MANUAL' ? 1 : 0;
  bucket.answerVerified += testPlan.problems.filter((p) => p.answerKeyStatus === 'VERIFIED').length;
  bucket.answerMissing += testPlan.problems.filter((p) => p.answerKeyStatus !== 'VERIFIED').length;
  bucket.reviewRequiredProblems += testPlan.problems.filter(
    (p) => p.analysis.status === 'REVIEW_REQUIRED',
  ).length;
  for (const problem of testPlan.problems) {
    bucket.formats[problem.format] = (bucket.formats[problem.format] ?? 0) + 1;
  }

  report.totals.tests += 1;
  report.totals.problems += testPlan.problems.length;
  report.totals.autoTests += testPlan.gradingMode === 'AUTO' ? 1 : 0;
  report.totals.manualTests += testPlan.gradingMode === 'MANUAL' ? 1 : 0;
  report.totals.answerVerified += testPlan.problems.filter((p) => p.answerKeyStatus === 'VERIFIED').length;
  report.totals.answerMissing += testPlan.problems.filter((p) => p.answerKeyStatus !== 'VERIFIED').length;
  report.totals.reviewRequiredProblems += testPlan.problems.filter(
    (p) => p.analysis.status === 'REVIEW_REQUIRED',
  ).length;
  for (const problem of testPlan.problems) {
    report.totals.formats[problem.format] = (report.totals.formats[problem.format] ?? 0) + 1;
  }
}

function buildClassificationReport(plan) {
  return {
    sourceDir: plan.report.sourceDir,
    generatedAt: new Date().toISOString(),
    totals: plan.report.totals,
    tests: plan.tests.map((test) => ({
      title: test.title,
      groupKey: test.groupKey,
      variant: test.variant,
      gradingMode: test.gradingMode,
      topic: test.topic.answerTopic,
      sourcePath: test.sourcePath,
      auditNotes: test.auditNotes,
      problems: test.problems.map((problem) => ({
        number: problem.number,
        token: problem.token,
        format: problem.format,
        answerKeyStatus: problem.answerKeyStatus,
        analysisStatus: problem.analysis.status,
        confidence: problem.analysis.confidence,
        statementText: problem.statementText,
        subtopic: problem.analysis.subtopic,
        questionForms: problem.analysis.tags
          .filter((tag) => tag.type === 'QUESTION_FORM')
          .map((tag) => tag.name),
        methods: problem.analysis.methods,
        skills: problem.analysis.skills,
        formulas: problem.analysis.formulas.map((formula) => ({
          name: formula.name,
          latex: formula.latex,
          rationale: formula.rationale,
        })),
        domainNotes: problem.analysis.domainNotes,
        signRules: problem.analysis.signRules,
        commonMistakes: problem.analysis.commonMistakes,
        auditNotes: problem.analysis.auditNotes,
      })),
    })),
  };
}

// UI-д цэвэр "100x100" гэж харагдана, гэхдээ дата нь "100x100 V2" фолдероос
// ирснийг sourceLabel-д тэмдэглэнэ (хуучин 100x100 эх дата идэвхтэй системд ОРОХГҮЙ).
// Нийтэд харагдах код "100" — бодлого/тест/attempt нь Problem.id-аар холбогддог тул
// код солих нь холбоосыг эвдэхгүй. Идемпотент: дахин ажиллуулахад "100"-г upsert хийнэ.
const PUBLIC_BOOK = {
  code: '100',
  title: '100x100',
  sourceLabel: '100x100 V2',
};

async function upsertBook(prisma) {
  const v2 = await prisma.book.findUnique({ where: { code: '100V2' } });
  const pub = await prisma.book.findUnique({ where: { code: PUBLIC_BOOK.code } });

  // Нийтийн "100" нь хуучин (V2 биш) ном бөгөөд тусдаа "100V2" дата байвал —
  // хуучин номыг архивлаж кодыг чөлөөлнө (дата устгахгүй, зүгээр л нуугдана).
  if (v2 && pub && pub.id !== v2.id) {
    await prisma.book.update({
      where: { id: pub.id },
      data: { code: '100-legacy', title: `${pub.title} (хуучин эх)`, archived: true },
    });
  }
  // V2 дата байвал нийтийн код руу шилжүүлнэ (Problem.id хэвээр тул холбоос эвдрэхгүй).
  if (v2) {
    return prisma.book.update({
      where: { id: v2.id },
      data: {
        code: PUBLIC_BOOK.code,
        title: PUBLIC_BOOK.title,
        sourceLabel: PUBLIC_BOOK.sourceLabel,
        archived: false,
      },
    });
  }
  // Анхны импорт (V2 ном хараахан байхгүй) — нийтийн ном дээр шууд upsert.
  return prisma.book.upsert({
    where: { code: PUBLIC_BOOK.code },
    update: { title: PUBLIC_BOOK.title, sourceLabel: PUBLIC_BOOK.sourceLabel, archived: false },
    create: {
      code: PUBLIC_BOOK.code,
      title: PUBLIC_BOOK.title,
      sourceLabel: PUBLIC_BOOK.sourceLabel,
    },
  });
}

async function upsertChapter(prisma, { bookId, title, order }) {
  const existing = await prisma.chapter.findFirst({ where: { bookId, title } });
  if (existing) {
    return prisma.chapter.update({
      where: { id: existing.id },
      data: { order, grade: 12, freePreview: order === 101 },
    });
  }
  return prisma.chapter.create({
    data: { bookId, title, order, grade: 12, freePreview: order === 101 },
  });
}

async function setProblemTags(prisma, problemId, tags) {
  for (const tagInput of tags) {
    const tag = await prisma.tag.upsert({
      where: { type_name: { type: tagInput.type, name: tagInput.name } },
      update: {},
      create: { type: tagInput.type, name: tagInput.name },
    });
    await prisma.problemTag.upsert({
      where: { problemId_tagId: { problemId, tagId: tag.id } },
      update: {},
      create: { problemId, tagId: tag.id },
    });
  }
}

async function setProblemFormulas(prisma, problemId, formulas) {
  for (const formulaInput of formulas) {
    const formula = await prisma.formula.upsert({
      where: { name: formulaInput.name },
      update: {
        latex: formulaInput.latex,
        description: formulaInput.rationale,
      },
      create: {
        name: formulaInput.name,
        latex: formulaInput.latex,
        description: formulaInput.rationale,
      },
    });
    await prisma.problemFormula.upsert({
      where: { problemId_formulaId: { problemId, formulaId: formula.id } },
      update: {},
      create: { problemId, formulaId: formula.id },
    });
  }
}

async function upsertProblem(prisma, { chapterId, problemPlan, createdById, sourcePath, variant, topic }) {
  const problem = await prisma.problem.upsert({
    where: { token: problemPlan.token },
    update: {
      chapterId,
      number: problemPlan.number,
      format: problemPlan.format,
      statementText: problemPlan.statementText,
      choices: problemPlan.choices,
      correctAnswer: problemPlan.correctAnswer,
      points: problemPlan.points,
    },
    create: {
      token: problemPlan.token,
      chapterId,
      number: problemPlan.number,
      format: problemPlan.format,
      statementText: problemPlan.statementText,
      choices: problemPlan.choices,
      correctAnswer: problemPlan.correctAnswer,
      points: problemPlan.points,
      createdById,
    },
  });

  await setProblemTags(prisma, problem.id, problemPlan.analysis.tags);
  await setProblemFormulas(prisma, problem.id, problemPlan.analysis.formulas);

  await prisma.problemAnalysis.upsert({
    where: { problemId: problem.id },
    update: {
      status: problemPlan.analysis.status,
      answerKeyStatus: problemPlan.analysis.answerKeyStatus,
      confidence: problemPlan.analysis.confidence,
      sourcePath,
      sourceVariant: variant,
      topic: topic.answerTopic,
      subtopic: problemPlan.analysis.subtopic,
      skills: problemPlan.analysis.skills,
      methods: problemPlan.analysis.methods,
      formulas: problemPlan.analysis.formulas,
      domainNotes: problemPlan.analysis.domainNotes,
      signRules: problemPlan.analysis.signRules,
      commonMistakes: problemPlan.analysis.commonMistakes,
      solutionOutline: problemPlan.analysis.solutionOutline,
      auditNotes: problemPlan.analysis.auditNotes,
    },
    create: {
      problemId: problem.id,
      status: problemPlan.analysis.status,
      answerKeyStatus: problemPlan.analysis.answerKeyStatus,
      confidence: problemPlan.analysis.confidence,
      sourcePath,
      sourceVariant: variant,
      topic: topic.answerTopic,
      subtopic: problemPlan.analysis.subtopic,
      skills: problemPlan.analysis.skills,
      methods: problemPlan.analysis.methods,
      formulas: problemPlan.analysis.formulas,
      domainNotes: problemPlan.analysis.domainNotes,
      signRules: problemPlan.analysis.signRules,
      commonMistakes: problemPlan.analysis.commonMistakes,
      solutionOutline: problemPlan.analysis.solutionOutline,
      auditNotes: problemPlan.analysis.auditNotes,
    },
  });

  return problem;
}

async function upsertTest(prisma, { testPlan, chapterId, problems, createdById, classroomIds }) {
  const existing = await prisma.test.findFirst({
    where: {
      title: testPlan.title,
      groupKey: testPlan.groupKey,
      variantLabel: testPlan.variant,
    },
  });
  const data = {
    title: testPlan.title,
    type: 'CHAPTER_EXAM',
    gradingMode: testPlan.gradingMode,
    chapterId,
    timeLimitMin: testPlan.timeLimitMin,
    pdfKey: testPlan.pdfKey,
    groupKey: testPlan.groupKey,
    variantLabel: testPlan.variant,
    createdById,
  };
  const test = existing
    ? await prisma.test.update({ where: { id: existing.id }, data })
    : await prisma.test.create({ data });

  await prisma.testProblem.deleteMany({ where: { testId: test.id } });
  if (problems.length) {
    await prisma.testProblem.createMany({
      data: problems.map((problem, index) => ({
        testId: test.id,
        problemId: problem.id,
        order: index + 1,
        points: problem.points ?? 1,
      })),
    });
  }

  await prisma.testAccess.deleteMany({ where: { testId: test.id } });
  if (classroomIds.length) {
    await prisma.testAccess.createMany({
      data: classroomIds.map((classroomId) => ({ testId: test.id, classroomId })),
      skipDuplicates: true,
    });
  }

  return test;
}

async function import100x100V2Plan({ prisma, plan, adminId, classroomIds = [] }) {
  const book = await upsertBook(prisma);
  const chapterByKey = new Map();
  let importedProblems = 0;

  for (const testPlan of plan.tests) {
    const chapterKey = `${testPlan.topic.slug}-${testPlan.testNumber}`;
    if (!chapterByKey.has(chapterKey)) {
      chapterByKey.set(
        chapterKey,
        await upsertChapter(prisma, {
          bookId: book.id,
          title: testPlan.chapterTitle,
          order: testPlan.chapterOrder,
        }),
      );
    }
    const chapter = chapterByKey.get(chapterKey);
    const problems = [];
    for (const problemPlan of testPlan.problems) {
      problems.push(
        await upsertProblem(prisma, {
          chapterId: chapter.id,
          problemPlan,
          createdById: adminId,
          sourcePath: testPlan.sourcePath,
          variant: testPlan.variant,
          topic: testPlan.topic,
        }),
      );
      importedProblems += 1;
    }
    await upsertTest(prisma, {
      testPlan,
      chapterId: chapter.id,
      problems,
      createdById: adminId,
      classroomIds,
    });
  }

  return {
    tests: plan.tests.length,
    problems: importedProblems,
    report: plan.report,
  };
}

async function seed100x100V2Content({ prisma, adminId, classroomIds = [], sourceDir = DEFAULT_SOURCE_DIR }) {
  const plan = build100x100V2Plan({ sourceDir });
  if (!plan.tests.length) {
    console.log('100x100 V2 import: source олдсонгүй эсвэл parse хийх тест алга.');
    return plan.report;
  }
  const result = await import100x100V2Plan({
    prisma,
    plan,
    adminId,
    classroomIds,
  });
  console.log(
    `100x100 V2 import: ${result.tests} тест, ${result.problems} бодлого, ` +
      `${result.report.totals.autoTests} AUTO, ${result.report.totals.manualTests} MANUAL.`,
  );
  return result.report;
}

function writeReport(report, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

async function runCli() {
  const args = new Set(process.argv.slice(2));
  const sourceDirArg = process.argv.find((arg) => arg.startsWith('--source-dir='));
  const outputArg = process.argv.find((arg) => arg.startsWith('--report='));
  const classificationOutputArg = process.argv.find((arg) =>
    arg.startsWith('--classification-report='),
  );
  const sourceDir = sourceDirArg ? sourceDirArg.split('=').slice(1).join('=') : DEFAULT_SOURCE_DIR;
  const reportPath = outputArg
    ? outputArg.split('=').slice(1).join('=')
    : path.join(__dirname, 'reports', '100x100-v2-audit.json');
  const classificationReportPath = classificationOutputArg
    ? classificationOutputArg.split('=').slice(1).join('=')
    : path.join(__dirname, 'reports', '100x100-v2-classification.json');
  const plan = build100x100V2Plan({ sourceDir });

  if (args.has('--dry-run') || args.has('--audit')) {
    writeReport(plan.report, reportPath);
    writeReport(buildClassificationReport(plan), classificationReportPath);
    console.log(JSON.stringify(plan.report.totals, null, 2));
    console.log(`Audit report: ${reportPath}`);
    console.log(`Classification report: ${classificationReportPath}`);
    return;
  }

  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const adminPhoneArg = process.argv.find((arg) => arg.startsWith('--admin-phone='));
    const adminPhone = adminPhoneArg ? adminPhoneArg.split('=').slice(1).join('=') : '70000001';
    const admin = await prisma.user.findUnique({ where: { phone: adminPhone } });
    if (!admin) throw new Error(`Admin user олдсонгүй: ${adminPhone}`);
    const classrooms = await prisma.classroom.findMany({
      where: { grade: 12, archived: false },
      select: { id: true },
    });
    const result = await import100x100V2Plan({
      prisma,
      plan,
      adminId: admin.id,
      classroomIds: classrooms.map((classroom) => classroom.id),
    });
    writeReport(result.report, reportPath);
    writeReport(buildClassificationReport(plan), classificationReportPath);
    console.log(JSON.stringify(result.report.totals, null, 2));
    console.log(`Import report: ${reportPath}`);
    console.log(`Classification report: ${classificationReportPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  build100x100V2Plan,
  buildClassificationReport,
  import100x100V2Plan,
  seed100x100V2Content,
};

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

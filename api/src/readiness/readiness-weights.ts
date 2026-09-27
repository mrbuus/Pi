/** Editable EESH emphasis estimates; owner may tune from the annual blueprint. They are not official score conversions. */
export const READINESS_WEIGHTS: Record<string, number> = {
  TOO: 0.06, ALG: 0.07, RATEQ: 0.025, RATINEQ: 0.025, ABSEQ: 0.03,
  ABSINEQ: 0.03, IRREQ: 0.025, IRRINEQ: 0.025, EXPEQ: 0.03, EXPINEQ: 0.025,
  LOGEXP: 0.025, LOGEQ: 0.035, LOGINEQ: 0.025, FUNC: 0.07, TRIG: 0.065,
  TRIGEQ: 0.035, SEQ: 0.05, COMB: 0.035, PROB: 0.045, STAT: 0.035,
  LIMIT: 0.035, DERIV: 0.075, INTEG: 0.055, PLANE: 0.07, SOLID: 0.055,
  VECTOR: 0.04, COORD: 0.04, SYSTEM: 0.025, PARAM: 0.025,
};

export const TOPIC_TITLES: Record<string, string> = {
  TOO: 'Тоо', ALG: 'Алгебрийн хувиргалт', RATEQ: 'Рационал тэгшитгэл',
  RATINEQ: 'Рационал тэнцэтгэл биш', ABSEQ: 'Модульт тэгшитгэл',
  ABSINEQ: 'Модульт тэнцэтгэл биш', IRREQ: 'Иррационал тэгшитгэл',
  IRRINEQ: 'Иррационал тэнцэтгэл биш', EXPEQ: 'Илтгэгч тэгшитгэл',
  EXPINEQ: 'Илтгэгч тэнцэтгэл биш', LOGEXP: 'Логарифмын илэрхийлэл',
  LOGEQ: 'Логарифм тэгшитгэл', LOGINEQ: 'Логарифм тэнцэтгэл биш',
  FUNC: 'Функц', TRIG: 'Тригонометр', TRIGEQ: 'Тригонометр тэгшитгэл',
  SEQ: 'Прогресс', COMB: 'Комбинаторик', PROB: 'Магадлал', STAT: 'Статистик',
  LIMIT: 'Хязгаар', DERIV: 'Уламжлал', INTEG: 'Интеграл', PLANE: 'Хавтгайн геометр',
  SOLID: 'Огторгуйн геометр', VECTOR: 'Вектор', COORD: 'Координат',
  SYSTEM: 'Тэгшитгэлийн систем', PARAM: 'Параметртэй бодлого',
};

const TOPIC_ALIASES: Record<string, string> = {
  'ТОО ТООЛОЛ': 'TOO', 'ТОО БА ТООЦОО': 'TOO', 'АЛГЕБР': 'ALG',
  'АЛГЕБРИЙН ИЛЭРХИЙЛЭЛ': 'ALG', 'ФУНКЦ БА ГРАФИК': 'FUNC',
  'ТРИГОНОМЕТРИЙН ФУНКЦ': 'TRIG',
  'ТРИГОНОМЕТР': 'TRIG', 'ДАРААЛАЛ': 'SEQ', 'ПРОГРЕСС': 'SEQ',
  'МАГАДЛАЛ БА СТАТИСТИК': 'PROB', 'МАГАДЛАЛ': 'PROB', 'СТАТИСТИК': 'STAT',
  'ХАВТГАЙН ГЕОМЕТР': 'PLANE', 'ГЕОМЕТР': 'PLANE', 'ОГТОРГУЙН ГЕОМЕТР': 'SOLID',
  'ВЕКТОР БА КООРДИНАТ': 'VECTOR', 'КООРДИНАТ': 'COORD', 'ВЕКТОР': 'VECTOR',
  'ХЯЗГААР БА УЛАМЖЛАЛ': 'DERIV', 'УЛАМЖЛАЛ': 'DERIV', 'ИНТЕГРАЛ': 'INTEG',
};

export function readinessTopicCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLocaleUpperCase('mn-MN');
  if (normalized in READINESS_WEIGHTS) return normalized;
  const exactTitle = Object.entries(TOPIC_TITLES).find(([, title]) => title.toLocaleUpperCase('mn-MN') === normalized)?.[0];
  if (exactTitle) return exactTitle;
  if (TOPIC_ALIASES[normalized]) return TOPIC_ALIASES[normalized];
  // The broader course taxonomy sometimes appends a chapter qualifier.
  const alias = Object.entries(TOPIC_ALIASES).find(([name]) => normalized.startsWith(`${name} `));
  return alias?.[1] ?? null;
}

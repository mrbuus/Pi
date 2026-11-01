/// Гарагийн дугаарлалт — НЭГ газар, тесттэй (RULES §6, STATUS §3.11).
///
/// - Эзэн, апп, Dart `DateTime.weekday`: МОНГОЛ 1=Даваа … 7=Ням.
/// - API-ийн зарим талбар (ӨС): JS 0=Ням … 6=Бямба.
///
/// Андуурвал бүх хуваарь нэг өдрөөр гулсана. API-аас ирсэн гарагийг ЗААВАЛ эдгээр
/// функцээр хөрвүүл; талбар бүр аль дугаарлалттайг `docs/api-contract/`-оос шалга.
library;

/// JS (0=Ням … 6=Бямба) → Монгол (1=Даваа … 7=Ням).
int mnWeekdayFromJs(int js) {
  if (js < 0 || js > 6) throw RangeError.range(js, 0, 6, 'js');
  return js == 0 ? 7 : js;
}

/// Монгол (1=Даваа … 7=Ням) → JS (0=Ням … 6=Бямба).
int jsWeekdayFromMn(int mn) {
  if (mn < 1 || mn > 7) throw RangeError.range(mn, 1, 7, 'mn');
  return mn == 7 ? 0 : mn;
}

const _long = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];
const _short = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];

/// Монгол дугаарлалтаар (1–7) гарагийн бүтэн нэр.
String weekdayNameMn(int mn) {
  if (mn < 1 || mn > 7) throw RangeError.range(mn, 1, 7, 'mn');
  return _long[mn - 1];
}

/// Монгол дугаарлалтаар (1–7) гарагийн товч нэр («Да», «Мя» …).
String weekdayShortMn(int mn) {
  if (mn < 1 || mn > 7) throw RangeError.range(mn, 1, 7, 'mn');
  return _short[mn - 1];
}

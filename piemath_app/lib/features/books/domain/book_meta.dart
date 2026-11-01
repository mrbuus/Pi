/// Нийтийн номын нэршил (вэбийн `components/books/bookMeta.ts`, эзэн 2026-10-11:
/// «Математикийн тестүүд I, II, III», «100x100» гэж бичихгүй). ӨС-ийн `Book.code` → харагдах нэр.
///
/// Нэр LaTeX агуулж болно (`$\pi$ тест`) — ҮРГЭЛЖ `MathText`-ээр зурна (глифээр бичихгүй).
library;

class BookMeta {
  const BookMeta({required this.name, required this.sub, required this.order, this.blurb});

  final String name;
  final String sub;
  final int order;
  final String? blurb;
}

const bookMeta = <String, BookMeta>{
  '100V3': BookMeta(
    name: 'Математикийн тестүүд I',
    sub: '12 бүлэг сэдэв',
    order: 1,
    blurb: 'Тоо тоололоос логарифм хүртэл 12 сэдэв, тест бүр A/B хувилбартай',
  ),
  '200V3': BookMeta(
    name: 'Математикийн тестүүд II',
    sub: 'Функц, уламжлал, интеграл',
    order: 2,
    blurb: 'Функцээс дифференциал тэгшитгэл хүртэл 19 сэдэв',
  ),
  '300': BookMeta(
    name: 'Математикийн тестүүд III',
    sub: 'Прогресс, вектор, магадлал',
    order: 3,
    blurb: 'Аналитик геометр, матриц, комплекс тоо, өгөгдлийн шинжилгээ',
  ),
  '1000': BookMeta(
    name: '1000 бодлого',
    sub: 'ЭЕШ-ийн загвартай сорилууд',
    order: 4,
    blurb: 'Шалгалтын бүтэцтэй 40 бодлогын сорилууд',
  ),
  'HG1': BookMeta(name: 'Хавтгайн геометр 1', sub: 'Планиметр', order: 5, blurb: 'Гурвалжин, тойрог, тэдгээрийн шинж чанар'),
  'HAV': BookMeta(name: 'Хавтгайн геометр', sub: 'Планиметр I, II', order: 5, blurb: 'Гурвалжин, тойрог, олон өнцөгт, талбай'),
  'OGT': BookMeta(name: 'Огторгуйн геометр', sub: 'Стереометр', order: 6, blurb: 'Огторгуйн биет, огтлол, эзлэхүүн'),
  'PI': BookMeta(name: r'$\pi$ тест', sub: 'Давтлагын тест', order: 7, blurb: 'Шалгалтын бүтэцтэй давтлагын тест'),
};

/// Сурагчид харагдах нэр: ӨС-ийн `displayName` → [bookMeta] → ӨС-ийн `title`.
String bookDisplayName(String code, String dbTitle, [String? displayName]) {
  final d = displayName?.trim();
  if (d != null && d.isNotEmpty) return d;
  return bookMeta[code]?.name ?? dbTitle;
}

/// Каталогийн эрэмбэ (мэдэгдэхгүй ном сүүлд).
int bookOrder(String code) => bookMeta[code]?.order ?? 99;

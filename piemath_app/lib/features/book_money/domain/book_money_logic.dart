import '../../../core/format/person_name.dart';
import '../../../shared/payment_status/money.dart';
import '../data/book_money_models.dart';

/// «Номын мөнгө»-ний харуулах логик (I/O-гүй, тесттэй). Тооцоо бүгд серверт — энд зөвхөн
/// серверийн тоог хэрхэн харуулахыг (вэбийн `BookMoneyDashboard`, `BookMarkSheet`, `BooksTab`).

/// Самбарын ангийн мөрийн явц. «Авахгүй» хүүхэд хуваарьт орохгүй: өгөх ёстой = нийт - авахгүй;
/// өгсөн = энд төлсөн + өөр ангид төлсөн.
({int due, int done, int pct}) classProgress(BookClassRow row) {
  final due = row.total - row.skipped;
  final done = row.paidHere + row.paidElsewhere;
  final pct = due > 0 ? (done * 100 / due).round() : 0;
  return (due: due, done: done, pct: pct);
}

/// «Мөнгийг авсан багш» товчны шошго: зөвхөн нэр (Багш+ бол «+»); ижил нэртэй хоёр багш байвал
/// овгийн үсэгтэй. Өмнө нь сонгогдсон багш жагсаалтад байхгүй (архивлагдсан) бол эхэнд нь.
List<({BookPerson person, String label})> collectorChips(List<BookPerson> staff, BookPerson? current) {
  final chips = [if (current != null && !staff.any((s) => s.id == current.id)) current, ...staff];
  final dup = <String>{
    for (var i = 0; i < chips.length; i++)
      for (var j = 0; j < chips.length; j++)
        if (i != j && chips[i].firstName == chips[j].firstName) chips[i].id,
  };
  return [for (final c in chips) (person: c, label: dup.contains(c.id) ? c.display : withPlus(c.firstName, c.role))];
}

/// Дүнгийн талбарын бичвэрийг тоо болгох: тоо биш тэмдэгтийг хаяна, эхний тэгийг арилгана,
/// 7 оронгоос хэтрүүлэхгүй (вэбтэй ижил). Хоосон бол `null`.
int? parseAmountInput(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '').replaceFirst(RegExp(r'^0+(?=\d)'), '');
  if (digits.isEmpty) return null;
  return int.parse(digits.length > 7 ? digits.substring(0, 7) : digits);
}

/// «Батлах»-ын өмнөх шалгалт — алдааны монгол мессеж эсвэл `null`.
String? amountError(int? amount) {
  if (amount == null) return 'Дүнгээ оруулна уу';
  if (amount > kBookAmountMax) return 'Дүн ${formatMnt(kBookAmountMax)}-өөс их байж болохгүй';
  return null;
}

/// Сурагчийн «Ном» табын шууд товч: санал болгох үнэтэй, тэмдэглэгээгүй бол шууд «өгсөн»;
/// бусад үед дэлгэрэнгүйг нээнэ.
bool quickMarks(StudentBookRow row) => row.payment == null && row.suggestedAmount != null;

/// «12-5 анги», «Б. Нэр авсан», тайлбар.
List<String?> paymentFacts(BookPayment p) => [
  p.classroomName != null ? '${p.classroomName} анги' : 'Ангигүй',
  p.paid && p.collectedBy != null ? '${p.collectedBy!.display} авсан' : null,
  p.note,
];

/// Чек нээх маягтын үнийн жишээ: хариултын хуудас 3,000, ном 40,000.
String priceHint(String kind) => kSheetKinds.any((k) => k.key == kind) ? '3,000' : '40,000';

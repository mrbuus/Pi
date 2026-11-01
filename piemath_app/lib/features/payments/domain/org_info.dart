/// Байгууллагын нийтэд зарласан мэдээлэл — апп-ын НЭГ эх сурвалж.
///
/// Эх: `web/src/lib/orgInfo.ts` (төвийн албан ёсны постер, 2026-07-26). Эзэн өөрчлөхөд ХОЁУЛАНГ
/// шинэчил (эсвэл ирээдүйд API [A]). Хувийн мэдээлэл биш — нийтэд зарласан данс.
library;

abstract final class OrgInfo {
  static const centerName = 'Шинэ Ирээдүйн Эзэд сургалтын төв';
  static const email = 'Shineireedui2021@gmail.com';
  static const phones = ['9590 4411', '8810 6256', '8810 3988'];
}

/// Банкны данс (`orgInfo.ts` `BANK`).
abstract final class BankInfo {
  static const name = 'Хаан банк';
  static const account = '5720838844';
  static const iban = 'MN540005005720838844';
  static const holder = 'О.Баасанжав';
}

/// Уншихад хялбар болгож тэмдэгтийг [size]-аар бүлэглэнэ: `5720838844` -> `5720 8388 44`.
/// Зөвхөн харуулахад — хуулахдаа үргэлж бүлэглээгүй эх утгыг ашигла.
String groupChars(String raw, {int size = 4}) {
  final s = raw.replaceAll(RegExp(r'\s+'), '');
  if (size <= 0 || s.length <= size) return s;
  final parts = <String>[];
  for (var i = 0; i < s.length; i += size) {
    parts.add(s.substring(i, i + size > s.length ? s.length : i + size));
  }
  return parts.join(' ');
}

enum TuitionPlanKind { fullYear, installment, monthly }

class TuitionPlan {
  const TuitionPlan(this.kind, this.label, this.amount);

  final TuitionPlanKind kind;
  final String label;
  final int amount;
}

class TuitionTier {
  const TuitionTier(this.label, this.grades, this.plans);

  final String label;
  final List<int> grades;
  final List<TuitionPlan> plans;

  int? amountOf(TuitionPlanKind kind) {
    for (final p in plans) {
      if (p.kind == kind) return p.amount;
    }
    return null;
  }
}

/// 2026–2027 оны сургалтын төлбөр (`orgInfo.ts` `TUITION`). Вэб үнийг сургуулийн ангиар харуулдаг тул
/// апп ч ижил (api-contract: серверийн ledger суудаг ангийн өдрөөр — ТОДРУУЛАХ, эзэнтэй).
const tuitionTiers = <TuitionTier>[
  TuitionTier('12-р анги', [12], [
    TuitionPlan(TuitionPlanKind.fullYear, 'Бүтэн жилийн төлбөр', 2500000),
    TuitionPlan(TuitionPlanKind.installment, 'Хуваан төлөх', 3000000),
    TuitionPlan(TuitionPlanKind.monthly, 'Сар бүр төлөх', 350000),
  ]),
  TuitionTier('9-11-р анги', [9, 10, 11], [
    TuitionPlan(TuitionPlanKind.fullYear, 'Бүтэн жилийн төлбөр', 2000000),
    TuitionPlan(TuitionPlanKind.installment, 'Хуваан төлөх', 2500000),
    TuitionPlan(TuitionPlanKind.monthly, 'Сар бүр төлөх', 300000),
  ]),
];

TuitionTier? tierForGrade(int? grade) {
  if (grade == null) return null;
  for (final t in tuitionTiers) {
    if (t.grades.contains(grade)) return t;
  }
  return null;
}

/// Гүйлгээний утгын он (вэбийн `NOTE_YEAR`).
const transferNoteYear = '2027';

/// «Гүйлгээний утга»: «Овог Нэр, утас, 2027». Нэргүй бол ерөнхий заавар.
String transferNote({String? firstName, String? lastName, String? phone}) {
  final name = '${lastName ?? ''} ${firstName ?? ''}'.trim();
  if (name.isEmpty) return 'Хүүхдийн овог нэр, утасны дугаар, $transferNoteYear';
  return [name, if (phone != null && phone.trim().isNotEmpty) phone.trim(), transferNoteYear].join(', ');
}

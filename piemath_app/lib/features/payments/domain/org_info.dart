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

// Сургалтын үнэ, тарифыг апп-д ХЭЗЭЭ Ч хатуу бичихгүй (PARITY-AUDIT §4 #2): үнэ нь ангийн 7 хоногийн
// өдрөөс серверт тооцогдоно. Ажилтан `/payments/ledger/student/:id`-ийн `tier`-ээс харна; сурагч, эцэг эхэд
// серверт үнийн талбар одоогоор алга тул үнэ харуулахгүй.

/// Гүйлгээний утгын он (вэбийн `NOTE_YEAR`).
const transferNoteYear = '2027';

/// «Гүйлгээний утга»: «Овог Нэр, утас, 2027». Нэргүй бол ерөнхий заавар.
String transferNote({String? firstName, String? lastName, String? phone}) {
  final name = '${lastName ?? ''} ${firstName ?? ''}'.trim();
  if (name.isEmpty) return 'Хүүхдийн овог нэр, утасны дугаар, $transferNoteYear';
  return [name, if (phone != null && phone.trim().isNotEmpty) phone.trim(), transferNoteYear].join(', ');
}

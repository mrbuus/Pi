import '../../../core/integrity/leave_tracker.dart';

/// Аппаас гарах дүрмийн бичвэр — горимоос (Хатуу/Зөөлөн) хамаарч ЯГ үнэн байх ёстой
/// (сурагчид урьдчилан хэлсэн дүрэм, анхааруулга, автомат илгээлтийн шалтгаан нэг эх сурвалжаас).

/// Дэс тооны нөхцөл: 1 дэх, 2 дахь, 3 дахь, 4 дэх, 9 дэх, 10 дахь.
String ordinalSuffix(int n) {
  final last = n % 10;
  if (last == 0) return 'дахь';
  return last == 1 || last == 4 || last == 9 ? 'дэх' : 'дахь';
}

/// «3 дахь», «1 дэх».
String ordinal(int n) => '$n ${ordinalSuffix(n)}';

/// Шалгалт эхлэхийн өмнөх дүрэм.
String leaveRuleIntro(LeavePolicy p) {
  final warns = [for (var i = p.warnAt; i < p.maxLeaves; i++) i];
  final warnPart = warns.isEmpty
      ? ''
      : warns.length == 1 && p.isFinalWarning(warns.single)
      ? '${ordinal(warns.single)} удаад сүүлчийн анхааруулга гарч, '
      : '${warns.join(', ')} ${ordinalSuffix(warns.last)} удаад анхааруулга гарч, ';
  return 'Шалгалтын үеэр аппаас гарвал багшид харагдана. $warnPart'
      '${ordinal(p.maxLeaves)} удаад шалгалт автоматаар илгээгдэнэ. '
      '${p.minAway.inSeconds} секундээс богино хугацаанд гарсныг тооцохгүй.';
}

/// Буцаж ирэхэд гарах тайлбар: сүүлчийн анхааруулга эсвэл хэд дэх гаралтад илгээгдэхийг хэлнэ.
String leaveNoticeHint(LeavePolicy p, int leaveCount) {
  if (p.isFinalWarning(leaveCount)) return 'Дахин гарвал шалгалт автоматаар илгээгдэнэ';
  final warnsLeft = p.maxLeaves - leaveCount - 1;
  return '${ordinal(p.maxLeaves)} гаралтад шалгалт автоматаар илгээгдэнэ, дахин $warnsLeft удаа анхааруулга авна';
}

/// Автоматаар илгээгдсэний дараах шалтгаан.
String leavesFinishedText(int leaveCount) => 'Аппаас $leaveCount удаа гарсан тул шалгалт илгээгдлээ';

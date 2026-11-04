/// Нууц үгийн бодлого — `api/src/auth/password-policy.ts` ба вэбийн `lib/passwordPolicy.ts`-тэй ЯГ ИЖИЛ.
///
/// ЗӨВХӨН нууц үг солих / сэргээх үед. Нэвтрэлт болон анхны нууц үг (= утасны дугаар, эзний дүрэм)-т
/// ХАМААРАХГҮЙ — «хүчтэй нууц үг» санал болгохгүй. Эцсийн шийдвэр серверт; энд зөвхөн шивэх үеийн UX.
library;

const passwordMinLength = 8;

/// bcrypt 72 байтаас хойшхыг үл тоомсорлодог.
const passwordMaxLength = 72;

const passwordPolicyMessage = 'Нууц үг дор хаяж 8 тэмдэгт, үсэг ба тоо холилдсон байх ёстой';
const passwordSameAsPhoneMessage = 'Шинэ нууц үг утасны дугаараас өөр байх ёстой';
const passwordTooLongMessage = 'Нууц үг хэт урт байна';
const passwordMismatchMessage = 'Хоёр нууц үг таарахгүй байна';

/// Латин эсвэл кирилл — Unicode-ийн аль ч үсэг.
final _letter = RegExp(r'\p{L}', unicode: true);
final _digit = RegExp(r'\d');

/// Шаардлага бүрийн биелэлт (шивэх зуур жагсаалтаар харуулна).
class PasswordChecks {
  const PasswordChecks({required this.length, required this.letter, required this.digit});

  final bool length;
  final bool letter;
  final bool digit;

  bool get strong => length && letter && digit;
}

PasswordChecks passwordChecks(String pw) => PasswordChecks(
      length: pw.length >= passwordMinLength,
      letter: _letter.hasMatch(pw),
      digit: _digit.hasMatch(pw),
    );

bool isPasswordStrong(String pw) => passwordChecks(pw).strong;

/// Хүчтэй бол null, эс бөгөөс хэрэглэгчид харуулах мессеж (серверийн `validatePasswordStrength`).
String? validatePasswordStrength(String pw) {
  if (pw.length > passwordMaxLength) return passwordTooLongMessage;
  return isPasswordStrong(pw) ? null : passwordPolicyMessage;
}

/// Утасны дугаартай (зай, +976, зураас зэргийг хасаад) ижил эсэх — серверийн `isSameAsPhone`.
bool isSameAsPhone(String pw, String? phone) {
  if (phone == null) return false;
  String digits(String s) => s.replaceAll(RegExp(r'\D'), '');
  final p = digits(phone);
  if (p.isEmpty) return false;
  final w = pw.trim();
  if (w == phone.trim()) return true;
  if (RegExp(r'^[\d\s+\-()]+$').hasMatch(w)) {
    final d = digits(w);
    return d == p || d == '976$p' || '976$d' == p;
  }
  return false;
}

/// Шинэ нууц үгийн бүрэн шалгалт (солих үед утастай тулгана). Зөв бол null.
String? validateNewPassword(String pw, {String? confirm, String? phone}) {
  final strength = validatePasswordStrength(pw);
  if (strength != null) return strength;
  if (isSameAsPhone(pw, phone)) return passwordSameAsPhoneMessage;
  if (confirm != null && confirm != pw) return passwordMismatchMessage;
  return null;
}

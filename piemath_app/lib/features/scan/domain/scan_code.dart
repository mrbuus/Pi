/// Номын QR кодын цэвэр логик (I/O-гүй, тесттэй).
///
/// Код: 8 тэмдэгт Crockford base32 (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`, I L O U байхгүй).
/// Хэвлэсэн URL: `https://pimath.mn/q/<КОД>` (STATUS §7.24, api-contract/books-scan-public.md §4.1).
library;

final _codeRe = RegExp(r'^[0-9A-HJKMNP-TV-Z]{8}$');

/// Серверийн `normalizeScanCode`-той ижил: том үсэг, зай/зураас хасна, `O→0`, `I,L→1`.
/// 40-өөс урт эсвэл 8 тэмдэгтийн Crockford биш бол null.
String? normalizeScanCode(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty || trimmed.length > 40) return null;
  final s = trimmed
      .toUpperCase()
      .replaceAll(RegExp(r'[\s\-]'), '')
      .replaceAll('O', '0')
      .replaceAll('I', '1')
      .replaceAll('L', '1');
  return _codeRe.hasMatch(s) ? s : null;
}

/// Бүрэн хэлбэрийн код мөн эсэх (нормчлолгүй).
bool isScanCode(String code) => _codeRe.hasMatch(code);

/// Зөвшөөрөгдсөн хост — QR дахь хаягийг ХЭЗЭЭ Ч дур мэдэн нээхгүй.
const scanHosts = {'pimath.mn', 'www.pimath.mn'};

/// QR-ээс уншсан (эсвэл гараар бичсэн) мөрөөс кодыг гаргана.
///
/// Хүлээн авна: зөвхөн код (`AB12CD34`, `ab12-cd34`), `https://pimath.mn/q/<код>`, `pimath.mn/q/<код>`.
/// Өөр хост, өөр зам, query/fragment-тэй хаяг гэх мэт бүгд → null (тайван мессеж харуулна).
String? extractScanCode(String? scanned) {
  if (scanned == null) return null;
  final raw = scanned.trim();
  if (raw.isEmpty || raw.length > 200) return null;
  if (!raw.contains('/')) return normalizeScanCode(raw);

  final withScheme = raw.contains('://') ? raw : 'https://$raw';
  final uri = Uri.tryParse(withScheme);
  if (uri == null) return null;
  if (uri.scheme != 'https' && uri.scheme != 'http') return null;
  if (!scanHosts.contains(uri.host.toLowerCase())) return null;
  if (uri.hasPort && uri.port != 443 && uri.port != 80) return null;
  if (uri.userInfo.isNotEmpty || uri.query.isNotEmpty || uri.fragment.isNotEmpty) return null;
  final segs = uri.pathSegments.where((s) => s.isNotEmpty).toList();
  if (segs.length != 2 || segs[0] != 'q') return null;
  return normalizeScanCode(segs[1]);
}

/// Нэг кодыг ойрхон дахин уншихыг шүүнэ (API throttle минутад 30) — камер нэг кодыг
/// секундэд олон удаа илрүүлдэг.
class ScanDebouncer {
  ScanDebouncer({this.window = const Duration(seconds: 3), DateTime Function()? clock})
      : _clock = clock ?? DateTime.now;

  final Duration window;
  final DateTime Function() _clock;
  String? _last;
  DateTime? _at;

  /// [code]-ийг одоо боловсруулах эсэх.
  bool accept(String code) {
    final now = _clock();
    if (_last == code && _at != null && now.difference(_at!) < window) return false;
    _last = code;
    _at = now;
    return true;
  }
}

import 'package:flutter/foundation.dart';

/// Ажиллах орчны тохиргоо — `--dart-define`-ээр (ARCHITECTURE §4).
///
/// ```
/// flutter run --dart-define=API_BASE_URL=https://api.pimath.mn/api
/// ```
/// `pimath.mn` нь зөвхөн техникийн хаяг (RULES §1) — хэрэглэгчид харагдах бичвэрт бичихгүй.
/// Эзэн шинэ домэйн авбал энд л солигдоно (PROGRESS «Эзний шийдвэр» #6).
abstract final class Env {
  static const _apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'https://api.pimath.mn/api');
  static const _webBaseUrl = String.fromEnvironment('WEB_BASE_URL', defaultValue: 'https://pimath.mn');

  /// API-ийн суурь хаяг, төгсгөлийн `/`-гүй.
  static String get apiBaseUrl => checkedBaseUrl(_apiBaseUrl, allowInsecure: kDebugMode);

  /// Вэбийн суурь хаяг (нууцлалын бодлого, апп дотор вэб рүү чиглүүлэхгүй — зөвхөн өгөгдөл татах).
  static String get webBaseUrl => checkedBaseUrl(_webBaseUrl, allowInsecure: kDebugMode);

  /// Release-д зөвхөн HTTPS (SECURITY §2). Debug-д localhost/эмуляторын http зөвшөөрнө.
  @visibleForTesting
  static String checkedBaseUrl(String raw, {required bool allowInsecure}) {
    final url = raw.trim().replaceAll(RegExp(r'/+$'), '');
    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      throw StateError('Хаяг буруу: $raw');
    }
    if (uri.scheme != 'https' && !(allowInsecure && uri.scheme == 'http')) {
      throw StateError('Зөвхөн HTTPS хаяг зөвшөөрөгдөнө: $raw');
    }
    return url;
  }
}

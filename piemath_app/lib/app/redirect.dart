import '../core/auth/current_user.dart';
import '../core/auth/session.dart';
import 'nav/nav_data.dart';

/// Нэвтэрсний дараа буцах зам (`?next=`) — зөвхөн апп-ын дотоод, «/»-ээр эхэлсэн зам.
/// «//evil.com», «http://…», нэвтрэх хуудас өөрөө зэргийг хүлээн авахгүй (вэбийн `safeNext`).
String? safeNext(String? raw) {
  if (raw == null || !raw.startsWith('/') || raw.startsWith('//') || RegExp(r'[\\\s]').hasMatch(raw)) return null;
  if (RegExp(r'^/(login|register|forgot-password|splash)(/|\?|#|$)').hasMatch(raw)) return null;
  return raw;
}

/// Номын QR код: Crockford base32, 8 тэмдэгт (I, L, O, U-гүй) — STATUS §7.24.
final scanCodePattern = RegExp(r'^[0-9A-HJKMNP-TV-Z]{8}$');

/// Нэвтрэлтгүй нээгдэх замууд.
bool isPublicPath(String path) =>
    path == '/login' ||
    path == '/forgot-password' ||
    path == '/register' ||
    path == '/splash' ||
    path.startsWith('/q/') ||
    path == '/books' ||
    path.startsWith('/books/') ||
    path == '/sorils' ||
    path.startsWith('/sorils/') ||
    path == '/placement' ||
    path.startsWith('/placement/') ||
    path == '/tools' ||
    path == '/privacy' ||
    path == '/terms';

/// Нэвтэрсэн хүн зөвшөөрлийн (consent) хуудас руу шилжих эсэх — M1 (`features/auth`)
/// `/auth/me`-ийн талбараар тодорхойлно. Одоогоор шилжүүлэхгүй.
typedef ConsentCheck = bool Function(CurrentUser user);

/// Router-ийн шилжүүлэлт — цэвэр функц (тесттэй).
String? appRedirect(SessionState session, Uri uri, {ConsentCheck? needsConsent}) {
  final path = uri.path;
  final full = uri.toString();

  // /q/<код> → /app/scan/<код> (номын QR, гаднаас нээгдэнэ).
  if (path.startsWith('/q/')) {
    final code = path.substring(3).toUpperCase();
    if (!scanCodePattern.hasMatch(code)) return '/app/scan';
    final target = '/app/scan/$code';
    return session is SignedIn ? target : '/login?next=${Uri.encodeComponent(target)}';
  }

  switch (session) {
    case SessionRestoring():
      if (path == '/splash') return null;
      final next = safeNext(full);
      return next == null || next == '/' ? '/splash' : '/splash?next=${Uri.encodeComponent(next)}';

    case SignedOut():
      if (isPublicPath(path) && path != '/splash') return null;
      final next = path == '/splash' ? safeNext(uri.queryParameters['next']) : safeNext(full);
      final keep = next != null && next != '/' && next != '/app';
      return keep ? '/login?next=${Uri.encodeComponent(next)}' : '/login';

    case SignedIn(:final user, :final role):
      final navRole = NavData.navigationRole(role, user);
      final home = NavData.home(navRole).path;
      if (user != null && needsConsent != null && needsConsent(user) && path != '/app/consent') {
        return '/app/consent';
      }
      if (path == '/splash' || path == '/login' || path == '/forgot-password' || path == '/register') {
        final next = safeNext(uri.queryParameters['next']);
        return next ?? home;
      }
      if (path == '/' || path == '/app' || path == '/app/') return home;
      return null;
  }
}

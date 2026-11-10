import '../../../app/redirect.dart';

/// Апп-д нэвтрэлтгүй ч байдаг нийтийн замууд (мэдэгдлийн холбоос эдгээр рүү ч хөтөлж болно).
const _publicAppPaths = ['/books', '/sorils', '/placement', '/privacy', '/terms', '/tools'];

/// Мэдэгдлийн `link`-ийг апп-ын дотоод зам болгоно. Апп-ын зам вэбийнхтэй ижил тул `/app/...`-ийг
/// шууд, манай вэбийн бүтэн хаягийг (`https://<webHost>/app/...`) замаар нь, нийтийн хуудсыг (`/books/...`,
/// `/sorils`, `/placement` …) апп доторх дэлгэц рүү. Бусад (гадаад холбоос, `//evil`, `/login`) → null —
/// тэр үед мэдэгдлийн дэлгэрэнгүй нээгдэнэ, хөтөч ХЭЗЭЭ Ч нээгдэхгүй (эзэн 2026-11-10).
String? notificationTarget(String? link, {required String webHost}) {
  if (link == null) return null;
  var path = link.trim();
  if (path.startsWith('http://') || path.startsWith('https://')) {
    final uri = Uri.tryParse(path);
    if (uri == null || uri.host != webHost) return null;
    path = uri.hasQuery ? '${uri.path}?${uri.query}' : uri.path;
  }
  final internal = path.startsWith('/app/') ||
      _publicAppPaths.any((p) => path == p || path.startsWith('$p/') || path.startsWith('$p?'));
  if (!internal) return null;
  return safeNext(path);
}

/// Мэдэгдлийн дэлгэрэнгүй зам.
String notificationDetailPath(String id) => '/app/notifications/${Uri.encodeComponent(id)}';

import '../../../app/redirect.dart';

/// Мэдэгдлийн `link`-ийг апп-ын дотоод зам болгоно. Апп-ын зам вэбийнхтэй ижил тул `/app/...`-ийг
/// шууд, манай вэбийн бүтэн хаягийг (`https://<webHost>/app/...`) замаар нь. Бусад (гадаад холбоос,
/// `//evil`, `/login`) → null (вэбийн `internalLink` + `safeNext`).
String? notificationTarget(String? link, {required String webHost}) {
  if (link == null) return null;
  var path = link.trim();
  if (path.startsWith('http://') || path.startsWith('https://')) {
    final uri = Uri.tryParse(path);
    if (uri == null || uri.host != webHost) return null;
    path = uri.hasQuery ? '${uri.path}?${uri.query}' : uri.path;
  }
  if (!path.startsWith('/app/')) return null;
  return safeNext(path);
}

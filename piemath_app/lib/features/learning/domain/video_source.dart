/// Видеоны эх холбооноос YouTube id гаргах — вэбийн `media-source.ts`, серверийн `media-policy.ts`-тэй ИЖИЛ дүрэм.
/// Зөвхөн YouTube тоглуулна (nocookie embed); бусад холбоос «шалгах шаардлагатай» гэж харагдана.
library;

final _id = RegExp(r'^[A-Za-z0-9_-]{11}$');
final _embedPath = RegExp(r'^/(embed|shorts)/[A-Za-z0-9_-]{11}$');

const _hosts = {'youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'};

String? youtubeId(String input) {
  final u = Uri.tryParse(input);
  if (u == null || u.scheme != 'https' || u.userInfo.isNotEmpty || u.hasPort) return null;
  String? id;
  if (u.host == 'youtu.be') {
    id = u.path.length > 1 ? u.path.substring(1) : null;
  } else if (_hosts.contains(u.host)) {
    if (u.path == '/watch') {
      id = u.queryParameters['v'];
    } else if (_embedPath.hasMatch(u.path)) {
      id = u.pathSegments[1];
    }
  }
  return id != null && _id.hasMatch(id) ? id : null;
}

/// Хувийн мэдээлэл хадгалахгүй (nocookie) embed хаяг.
Uri? youtubeEmbedUri(String input) {
  final id = youtubeId(input);
  return id == null ? null : Uri.parse('https://www.youtube-nocookie.com/embed/$id?autoplay=0&playsinline=1');
}

/// Сервер баталгаажуулсан [embedUrl] байвал түүнийг (youtube-nocookie.com л), үгүй бол эх холбооноос.
Uri? playableUri({required String source, String? embedUrl}) {
  if (embedUrl != null) {
    final u = Uri.tryParse(embedUrl);
    if (u != null && u.scheme == 'https' && u.host == 'www.youtube-nocookie.com' && _embedPath.hasMatch(u.path)) return u;
  }
  return youtubeEmbedUri(source);
}

/// Секундийг «12:05» хэлбэрээр.
String formatDuration(int seconds) {
  final m = seconds ~/ 60;
  final s = seconds % 60;
  return '$m:${s.toString().padLeft(2, '0')}';
}

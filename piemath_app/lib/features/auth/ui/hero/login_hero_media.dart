import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

/// Эзний өгсөн медиаг `assets/login_hero/` дотроос нэрээр нь олно (docs/LOGIN-HERO.md).
abstract final class LoginHeroFiles {
  static const dir = 'assets/login_hero/';
  static const video = '${dir}hero.mp4';
  static const videoDark = '${dir}hero_dark.mp4';

  /// Poster: эхний хүрэлцээтэй өргөтгөлийг авна.
  static const posterNames = ['poster.webp', 'poster.png', 'poster.jpg'];
  static const posterDarkNames = ['poster_dark.webp', 'poster_dark.png', 'poster_dark.jpg'];
}

/// Алсын override: `--dart-define=LOGIN_HERO_URL=https://…/hero.mp4`. Өгөгдмөл ХООСОН = унтраалттай.
const loginHeroRemoteUrl = String.fromEnvironment('LOGIN_HERO_URL');

/// Нэвтрэх хуудасны hero-д байгаа медиа. Бүх талбар заавал биш — хоосон бол лого.
class LoginHeroMedia {
  const LoginHeroMedia({this.video, this.videoDark, this.poster, this.posterDark, this.remoteUrl});

  const LoginHeroMedia.none() : this();

  final String? video;
  final String? videoDark;
  final String? poster;
  final String? posterDark;

  /// Зөвхөн bundle-д видео байхгүй, wifi-тай, https үед.
  final String? remoteUrl;

  bool hasVideo(bool dark) => (dark ? videoDark ?? video : video) != null || remoteUrl != null;

  String? videoFor(bool dark) => dark ? videoDark ?? video : video;

  String? posterFor(bool dark) => dark ? posterDark ?? poster : poster;

  bool get isEmpty => video == null && poster == null && remoteUrl == null && videoDark == null && posterDark == null;
}

/// Wifi / ethernet эсэх (алсын видеог мобайл датагаар татахгүй). Алдаа бол false.
final loginHeroOnUnmeteredProvider = FutureProvider<bool>((ref) async {
  try {
    final r = await Connectivity().checkConnectivity();
    return r.contains(ConnectivityResult.wifi) || r.contains(ConnectivityResult.ethernet);
  } catch (_) {
    return false;
  }
});

String? _first(Set<String> assets, List<String> names) {
  for (final n in names) {
    final p = '${LoginHeroFiles.dir}$n';
    if (assets.contains(p)) return p;
  }
  return null;
}

/// Bundle-д юу байгааг AssetManifest-ээс уншина (байхгүй файлыг нээхийг оролдохгүй).
final loginHeroMediaProvider = FutureProvider<LoginHeroMedia>((ref) async {
  Set<String> assets = const {};
  try {
    final manifest = await AssetManifest.loadFromAssetBundle(rootBundle);
    assets = manifest.listAssets().where((a) => a.startsWith(LoginHeroFiles.dir)).toSet();
  } catch (_) {}
  final video = assets.contains(LoginHeroFiles.video) ? LoginHeroFiles.video : null;
  final videoDark = assets.contains(LoginHeroFiles.videoDark) ? LoginHeroFiles.videoDark : null;
  String? remote;
  if (video == null && videoDark == null && loginHeroRemoteUrl.startsWith('https://')) {
    if (await ref.watch(loginHeroOnUnmeteredProvider.future)) remote = loginHeroRemoteUrl;
  }
  return LoginHeroMedia(
    video: video,
    videoDark: videoDark,
    poster: _first(assets, LoginHeroFiles.posterNames),
    posterDark: _first(assets, LoginHeroFiles.posterDarkNames),
    remoteUrl: remote,
  );
});

/// Видео controller үүсгэгч — тестэд сольж болно.
typedef HeroVideoControllerFactory = VideoPlayerController Function({String? asset, String? url});

final heroVideoControllerFactoryProvider = Provider<HeroVideoControllerFactory>((ref) {
  return ({String? asset, String? url}) {
    final options = VideoPlayerOptions(mixWithOthers: true);
    return asset != null
        ? VideoPlayerController.asset(asset, videoPlayerOptions: options)
        : VideoPlayerController.networkUrl(Uri.parse(url!), videoPlayerOptions: options);
  };
});

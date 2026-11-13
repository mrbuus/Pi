import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';

/// Зураг унших/бэлдэх/илгээх техникийн алдааг серверийн хэрэглээний бүртгэлд (`POST /usage`, kind=error)
/// илгээнэ — вэбийн `trackError`-тэй ижил (эзэн 2026-11-12: аль утсан дээр, аль шатанд гацсаныг олоход).
/// Хүний нэр, зургийн агуулга ОРОХГҮЙ: зөвхөн шат, платформ, хуудасны тоо, алдааны төрөл.
/// Бүртгэл бол туслах мэдээлэл — хэзээ ч алдаа шидэхгүй, хэрэглэгчийг хүлээлгэхгүй.
class PhotoErrorReporter {
  const PhotoErrorReporter(this._api);

  final ApiClient _api;

  /// Алдааны товч тайлбар: «ApiError badRequest 400», «PlatformException photo_access_denied».
  static String describe(Object e) {
    if (e is ApiError) return 'ApiError ${e.kind.name}${e.status == null ? '' : ' ${e.status}'}';
    if (e is PlatformException) return 'PlatformException ${e.code}';
    return e.runtimeType.toString();
  }

  /// `err:photo/<шат> app <платформ> <нэмэлт>` (≤280 тэмдэгт).
  static String target(String stage, String detail) {
    final s = 'err:photo/$stage app ${defaultTargetPlatform.name} $detail';
    return s.length > 280 ? s.substring(0, 280) : s;
  }

  void report({required String path, required String stage, required String detail}) {
    unawaited(
      _api
          .post<Object?>(
            '/usage',
            body: {
              'device': 'mobile',
              'events': [
                {'kind': 'error', 'path': path, 'target': target(stage, detail)},
              ],
            },
          )
          .then((_) {}, onError: (_) {}),
    );
  }
}

final photoErrorReporterProvider = Provider<PhotoErrorReporter>(
  (ref) => PhotoErrorReporter(ref.watch(apiClientProvider)),
);

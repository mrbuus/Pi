import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/network_providers.dart';
import '../../../core/time/ub_time.dart';
import '../domain/lock_message.dart';

/// `GET /scan/:code` — `api/src/scan/scan.service.ts` (api-contract/books-scan-public.md §4.2).
enum ScanAccess {
  /// Бодолт + зөв хариу + видео.
  full,

  /// Зөвхөн бодолт.
  solution,

  /// Бодолт хаалттай ([ScanResult.lockReason]).
  locked;

  static ScanAccess fromApi(Object? v) => switch (v) {
        'FULL' => full,
        'SOLUTION' => solution,
        _ => locked,
      };
}

@immutable
class ScanChoice {
  const ScanChoice({required this.letter, required this.text, this.image});

  factory ScanChoice.fromJson(Map<String, Object?> j) => ScanChoice(
        letter: j['letter'] as String? ?? '',
        text: j['text'] as String? ?? '',
        image: j['image'] as String?,
      );

  final String letter;
  final String text;

  /// Хаалттай үед null (зургийн эрх байхгүй).
  final String? image;
}

@immutable
class ScanSource {
  const ScanSource({this.book, required this.chapter, this.page, this.number});

  factory ScanSource.fromJson(Map<String, Object?> j) => ScanSource(
        book: j['book'] as String?,
        chapter: j['chapter'] as String? ?? '',
        page: (j['page'] as num?)?.toInt(),
        number: (j['number'] as num?)?.toInt(),
      );

  final String? book;
  final String chapter;
  final int? page;
  final int? number;
}

@immutable
class ScanYoutube {
  const ScanYoutube({required this.url, required this.embedUrl});

  final String url;
  final String embedUrl;
}

@immutable
class ScanResult {
  const ScanResult({
    required this.problemId,
    required this.format,
    this.statementText,
    this.imageKey,
    this.hasImage = false,
    this.choices = const [],
    required this.source,
    required this.access,
    this.lockReason,
    this.opensAt,
    this.solution,
    this.correctAnswer,
    this.answerNeedsCheck = false,
    this.youtube,
  });

  factory ScanResult.fromJson(Map<String, Object?> j) {
    final yt = j['youtube'];
    return ScanResult(
      problemId: j['problemId']! as String,
      format: j['format'] as String? ?? 'CHOICE',
      statementText: j['statementText'] as String?,
      imageKey: j['imageKey'] as String?,
      hasImage: j['hasImage'] == true,
      choices: [
        for (final c in (j['choices'] as List? ?? const []))
          ScanChoice.fromJson((c as Map).cast<String, Object?>()),
      ],
      source: ScanSource.fromJson(((j['source'] as Map?) ?? const {}).cast<String, Object?>()),
      access: ScanAccess.fromApi(j['access']),
      lockReason: ScanLockReason.fromApi(j['lockReason']),
      opensAt: parseApiInstant(j['opensAt'] as String?),
      solution: j['solution'] as String?,
      correctAnswer: j['correctAnswer'],
      answerNeedsCheck: j['answerNeedsCheck'] == true,
      youtube: yt is Map && yt['url'] is String
          ? ScanYoutube(url: yt['url']! as String, embedUrl: yt['embedUrl'] as String? ?? '')
          : null,
    );
  }

  final String problemId;

  /// `CHOICE | FILL_NUMBER | OPEN`.
  final String format;
  final String? statementText;
  final String? imageKey;

  /// Бодлого зурагтай ч хаалттай үед [imageKey] ирэхгүй — «Зургийг номын хуудаснаас харна уу».
  final bool hasImage;
  final List<ScanChoice> choices;
  final ScanSource source;
  final ScanAccess access;
  final ScanLockReason? lockReason;
  final DateTime? opensAt;
  final String? solution;

  /// FULL үед л: TEXT → канон үсэг, бусад → түлхүүрийн утга (мөр, тоо эсвэл объект).
  final Object? correctAnswer;
  final bool answerNeedsCheck;
  final ScanYoutube? youtube;

  bool get isChoice => format == 'CHOICE';

  /// Сонголттой бодлогын зөв үсэг (FULL үед).
  String? get correctLetter => isChoice && correctAnswer is String ? correctAnswer! as String : null;
}

/// Код → бодлого. Кодыг дуудахаас ӨМНӨ `normalizeScanCode`-оор шалгасан байна.
final scanResultProvider = FutureProvider.autoDispose.family<ScanResult, String>((ref, code) {
  return ref.read(apiClientProvider).get(
        '/scan/${Uri.encodeComponent(code)}',
        parse: (j) => ScanResult.fromJson((j! as Map).cast<String, Object?>()),
      );
});

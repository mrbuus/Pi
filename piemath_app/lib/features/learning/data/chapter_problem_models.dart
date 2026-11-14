import 'package:flutter/foundation.dart';

import 'json.dart';

@immutable
class ChapterChoice {
  const ChapterChoice({required this.label, required this.text, this.imageKey});

  final String label;
  final String text;
  final String? imageKey;
}

/// `GET /chapters/:id/problems` — сурагчид хариуны түлхүүр, шинжилгээ ирэхгүй (сервер хасна).
@immutable
class ChapterProblem {
  const ChapterProblem({
    required this.id,
    this.number,
    this.statementText,
    this.imageKey,
    this.choices = const [],
    this.variantLabel,
    this.youtubeUrl,
  });

  factory ChapterProblem.fromJson(Object? raw) {
    final j = asMap(raw);
    final options = <ChapterChoice>[];
    for (final (i, o) in asList(j['choiceOptions']).indexed) {
      final m = asMap(o);
      options.add(
        ChapterChoice(
          label: asStr(m['label']) ?? String.fromCharCode(65 + i),
          text: asStr(m['text']) ?? '',
          imageKey: asStr(m['imageKey']),
        ),
      );
    }
    if (options.isEmpty) {
      for (final (i, c) in asList(j['choices']).indexed) {
        if (c is String) options.add(ChapterChoice(label: String.fromCharCode(65 + i), text: c));
      }
    }
    final variant = asStr(j['variantLabel']);
    return ChapterProblem(
      id: asStr(j['id']) ?? '',
      number: asInt(j['number']),
      statementText: asStr(j['statementText']),
      imageKey: asStr(j['imageKey']),
      choices: options,
      variantLabel: variant == null || variant.isEmpty ? null : variant,
      youtubeUrl: asStr(j['youtubeUrl']),
    );
  }

  final String id;
  final int? number;
  final String? statementText;
  final String? imageKey;
  final List<ChapterChoice> choices;
  final String? variantLabel;
  final String? youtubeUrl;
}

/// Нэг хуудас (50) -ийн үр дүн. Сервер нийт тоо өгдөггүй тул дараагийн хуудас байгаа эсэхийг
/// «хуудас дүүрэн ирсэн» гэж үзнэ.
const chapterProblemsPageSize = 50;

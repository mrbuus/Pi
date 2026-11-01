import 'package:flutter/foundation.dart';

import 'json.dart';

/// Томьёоны сангийн загварууд — `docs/api-contract/learning.md` §5, `api/src/formulas/formulas.service.ts`.

@immutable
class FormulaSection {
  const FormulaSection({required this.slug, required this.title, this.order = 0, this.count = 0});

  factory FormulaSection.fromJson(Object? raw) {
    final j = asMap(raw);
    return FormulaSection(
      slug: asStr(j['slug']) ?? '',
      title: asStr(j['title']) ?? '',
      order: asInt(j['order']) ?? 0,
      count: asInt(j['count']) ?? 0,
    );
  }

  final String slug;
  final String title;
  final int order;
  final int count;
}

@immutable
class FormulaSummary {
  const FormulaSummary({
    required this.slug,
    required this.title,
    this.section,
    this.order = 0,
    this.level = '',
    this.grade,
    this.latex,
    this.general,
  });

  factory FormulaSummary.fromJson(Object? raw) {
    final j = asMap(raw);
    return FormulaSummary(
      slug: asStr(j['slug']) ?? '',
      title: asStr(j['title']) ?? asStr(j['name']) ?? '',
      section: asStr(j['section']),
      order: asInt(j['order']) ?? 0,
      level: asStr(j['level']) ?? '',
      grade: asInt(j['grade']),
      latex: asStr(j['latex']),
      general: asStr(j['general']),
    );
  }

  final String slug;
  final String title;
  final String? section;
  final int order;

  /// `CORE` | `EXTRA`.
  final String level;
  final int? grade;
  final String? latex;
  final String? general;

  String? get display => (latex?.isNotEmpty ?? false) ? latex : general;
}

@immutable
class FormulaVariant {
  const FormulaVariant(this.label, this.latex);

  final String label;
  final String latex;
}

@immutable
class FormulaExample {
  const FormulaExample({required this.problem, required this.steps, required this.answer});

  final String problem;
  final List<String> steps;
  final String answer;
}

@immutable
class RelatedFormula {
  const RelatedFormula({required this.slug, required this.title, this.latex});

  final String slug;
  final String title;
  final String? latex;
}

@immutable
class FormulaDetail {
  const FormulaDetail({
    required this.slug,
    required this.title,
    this.sectionTitle,
    this.latex,
    this.general,
    this.level = '',
    this.grade,
    this.variants = const [],
    this.conditions = const [],
    this.explanation,
    this.derivation = const [],
    this.mnemonic,
    this.examples = const [],
    this.commonMistakes = const [],
    this.eeshTip,
    this.related = const [],
  });

  factory FormulaDetail.fromJson(Object? raw) {
    final j = asMap(raw);
    List<String> strings(Object? v) => [for (final x in asList(v)) if (x is String && x.isNotEmpty) x];
    return FormulaDetail(
      slug: asStr(j['slug']) ?? '',
      title: asStr(j['title']) ?? asStr(j['name']) ?? '',
      sectionTitle: asStr(asMap(j['section'])['title']),
      latex: asStr(j['latex']),
      general: asStr(j['general']),
      level: asStr(j['level']) ?? '',
      grade: asInt(j['grade']),
      variants: [
        for (final v in asList(j['variants']))
          if (asStr(asMap(v)['latex']) != null) FormulaVariant(asStr(asMap(v)['label']) ?? '', asStr(asMap(v)['latex'])!),
      ],
      conditions: strings(j['conditions']),
      explanation: asStr(j['explanation']),
      derivation: strings(j['derivation']),
      mnemonic: asStr(j['mnemonic']),
      examples: [
        for (final e in asList(j['examples']))
          FormulaExample(
            problem: asStr(asMap(e)['problem']) ?? '',
            steps: strings(asMap(e)['steps']),
            answer: asStr(asMap(e)['answer']) ?? '',
          ),
      ],
      commonMistakes: strings(j['commonMistakes']),
      eeshTip: asStr(j['eeshTip']),
      related: [
        for (final r in asList(j['related']))
          RelatedFormula(slug: asStr(asMap(r)['slug']) ?? '', title: asStr(asMap(r)['title']) ?? '', latex: asStr(asMap(r)['latex'])),
      ],
    );
  }

  final String slug;
  final String title;
  final String? sectionTitle;
  final String? latex;
  final String? general;
  final String level;
  final int? grade;
  final List<FormulaVariant> variants;
  final List<String> conditions;
  final String? explanation;
  final List<String> derivation;
  final String? mnemonic;
  final List<FormulaExample> examples;
  final List<String> commonMistakes;
  final String? eeshTip;
  final List<RelatedFormula> related;

  String? get display => (latex?.isNotEmpty ?? false) ? latex : general;
}

/// `GET /formulas/my` — миний тестэд тааралдсан томьёо.
@immutable
class SeenFormula {
  const SeenFormula({required this.slug, required this.title, this.latex, this.seenCount = 0, this.correctCount = 0, this.lastTestTitle});

  factory SeenFormula.fromJson(Object? raw) {
    final j = asMap(raw);
    return SeenFormula(
      slug: asStr(j['slug']) ?? '',
      title: asStr(j['title']) ?? '',
      latex: asStr(j['latex']) ?? asStr(j['general']),
      seenCount: asInt(j['seenCount']) ?? 0,
      correctCount: asInt(j['correctCount']) ?? 0,
      lastTestTitle: asStr(j['lastTestTitle']),
    );
  }

  final String slug;
  final String title;
  final String? latex;
  final int seenCount;
  final int correctCount;
  final String? lastTestTitle;
}

@immutable
class SeenFormulas {
  const SeenFormulas({this.total = 0, this.seen = 0, this.items = const []});

  factory SeenFormulas.fromJson(Object? raw) {
    final j = asMap(raw);
    return SeenFormulas(
      total: asInt(j['totalFormulas']) ?? 0,
      seen: asInt(j['seenFormulas']) ?? 0,
      items: [for (final i in asList(j['items'])) SeenFormula.fromJson(i)],
    );
  }

  final int total;
  final int seen;
  final List<SeenFormula> items;
}

/// Хайлт: нэр, томьёо, түвшин, хэсгээр шүүнэ (цэвэр функц, тесттэй).
List<FormulaSummary> filterFormulas(
  List<FormulaSummary> all, {
  String query = '',
  String level = '',
  String section = '',
}) {
  final q = query.trim().toLowerCase();
  return [
    for (final f in all)
      if ((level.isEmpty || f.level == level) &&
          (section.isEmpty || f.section == section) &&
          (q.isEmpty || f.title.toLowerCase().contains(q) || f.slug.toLowerCase().contains(q)))
        f,
  ];
}

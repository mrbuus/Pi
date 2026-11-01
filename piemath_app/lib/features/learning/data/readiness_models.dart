import 'package:flutter/foundation.dart';

import 'json.dart';

enum ReadinessTrend { up, down, flat }

ReadinessTrend _trend(Object? v) => switch (v) {
  'UP' => ReadinessTrend.up,
  'DOWN' => ReadinessTrend.down,
  _ => ReadinessTrend.flat,
};

@immutable
class ReadinessTopic {
  const ReadinessTopic({
    required this.code,
    required this.title,
    required this.measured,
    required this.attempts,
    required this.trend,
    this.mastery,
    this.weight = 0,
  });

  factory ReadinessTopic.fromJson(Object? raw) {
    final j = asMap(raw);
    final code = asStr(j['topic']) ?? '';
    return ReadinessTopic(
      code: code,
      title: asStr(j['title']) ?? code,
      mastery: asNum(j['mastery'])?.clamp(0, 100).round(),
      measured: asBool(j['measured']),
      weight: asNum(j['weight']) ?? 0,
      attempts: asInt(j['attempts']) ?? 0,
      trend: _trend(j['trend']),
    );
  }

  final String code;
  final String title;

  /// 0-100, хэмжээгүй бол null.
  final int? mastery;
  final bool measured;
  final double weight;
  final int attempts;
  final ReadinessTrend trend;
}

@immutable
class ReadinessWeek {
  const ReadinessWeek({required this.week, required this.index, required this.coverage});

  factory ReadinessWeek.fromJson(Object? raw) {
    final j = asMap(raw);
    return ReadinessWeek(
      week: asStr(j['week']) ?? '',
      index: asNum(j['index'])?.clamp(0, 100).round() ?? 0,
      coverage: asNum(j['coverage'])?.clamp(0, 100).round() ?? 0,
    );
  }

  final String week;
  final int index;

  /// 0 бол тэр долоо хоногт хэмжилт байгаагүй.
  final int coverage;

  bool get hasData => coverage > 0;
}

/// `GET /readiness/my` — тооцоолол бүхэлдээ серверт; апп зөвхөн харуулна.
@immutable
class Readiness {
  const Readiness({
    required this.index,
    required this.low,
    required this.high,
    required this.dataPoints,
    required this.coverage,
    this.topics = const [],
    this.nextBest = const [],
    this.weeks = const [],
  });

  factory Readiness.fromJson(Object? raw) {
    final j = asMap(raw);
    int pct(Object? v, int fallback) => asNum(v)?.clamp(0, 100).round() ?? fallback;
    return Readiness(
      index: pct(j['index'], 0),
      low: pct(j['low'], 0),
      high: pct(j['high'], 100),
      dataPoints: asInt(j['dataPoints']) ?? 0,
      coverage: pct(j['coverage'], 0),
      topics: [for (final t in asList(j['topics'])) ReadinessTopic.fromJson(t)],
      nextBest: [for (final t in asList(j['nextBestTopics'])) ReadinessTopic.fromJson(t)],
      weeks: [for (final w in asList(j['weeklyHistory'])) ReadinessWeek.fromJson(w)],
    );
  }

  final int index;
  final int low;
  final int high;
  final int dataPoints;
  final int coverage;
  final List<ReadinessTopic> topics;
  final List<ReadinessTopic> nextBest;
  final List<ReadinessWeek> weeks;

  /// Тооцоолох хангалттай оролдлого байгаа эсэх.
  bool get hasEvidence => dataPoints > 0 && coverage > 0;

  List<ReadinessTopic> get measuredTopics {
    final l = topics.where((t) => t.measured && t.mastery != null).toList();
    l.sort((a, b) => a.mastery!.compareTo(b.mastery!));
    return l;
  }
}

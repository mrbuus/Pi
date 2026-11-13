// Гэрийн даалгаврыг ангид богино шалгалтаар шалгах (эзэн 2026-11-08) — цэвэр тооцоо, I/O-гүй.
// = web/src/lib/quizScore.ts = api/src/homework-quiz/quiz-score.ts (ижил хил, ижил бичлэг).
//
// Өнгөний муж (эзэн): 0 <= улаан < 50 <= улбар шар < 80 <= ногоон <= 100.
// 49,99% улаан, 50% улбар шар, 79,99% улбар шар, 80% ногоон. Оноо бутархай байж болно (7,5 —
// зууны нэг хүртэл). Хувийг хөвөгч тоогоор бус, ЗУУНЫ НЭГЭЭР бүхэл болгоод харьцуулна.
import 'package:flutter/foundation.dart';

import '../../../shared/marks/marks.dart';
import '../../../shared/quiz_score/quiz_score.dart';

// Онооны хил, хувь, бичлэг нэг газар (`shared/quiz_score`) — энд зөвхөн самбарын нэмэлт (дундаж, оролт).
export '../../../shared/quiz_score/quiz_score.dart'
    show
        formatPercent,
        formatScore,
        percentTone,
        quizGreenFrom,
        quizPercent,
        quizRatioTone,
        quizRedBelow,
        quizTone,
        toHundredths;

/// Онооны өнгө: улаан = error, улбар шар = warning, ногоон = success (вэбийн `QuizTone`).
typedef QuizTone = MarkTone;

/// Нэг шалгалтын бодлогын дээд тоо.
const quizMaxProblems = 200;

/// «Асуудалтай» болгох анхдагч хувь (шалгуурын minQuiz).
const defaultMinQuiz = 50;

bool _valid(num? score, num problemCount) =>
    score != null && score.isFinite && problemCount.isFinite && problemCount > 0;

/// «Асуудалтай» (шалгуурын minQuiz): хувь < [minPct] эсэх. [minPct] = 0 бол хэзээ ч үгүй.
bool quizBelow(num score, num problemCount, num minPct) {
  if (!_valid(score, problemCount) || !(minPct > 0)) return false;
  return toHundredths(score) * 100 < minPct * toHundredths(problemCount);
}

/// Ангийн дундаж.
@immutable
class QuizAverage {
  const QuizAverage({required this.pct, required this.tone, required this.count});

  final double pct;
  final QuizTone tone;
  final int count;
}

/// Ангийн дундаж: ЗӨВХӨН оноо оруулсан сурагчдаар (хоосон нь тоонд орохгүй).
QuizAverage? quizAverage(Iterable<num?> scores, num problemCount) {
  final list = [
    for (final s in scores)
      if (s != null && s.isFinite) s,
  ];
  if (list.isEmpty || !problemCount.isFinite || problemCount <= 0) return null;
  final sum = list.fold<int>(0, (a, s) => a + toHundredths(s));
  final total = list.length * toHundredths(problemCount);
  return QuizAverage(pct: sum * 100 / total, tone: quizRatioTone(sum, total), count: list.length);
}

/// Өөр өөр бодлогын тоотой хэд хэдэн шалгалтын дундаж хувь (өдөр бүр ижил жинтэй). Хоосон бол null.
double? meanPercent(Iterable<({num score, num problemCount})> rows) {
  final pcts = [for (final r in rows) ?quizPercent(r.score, r.problemCount)];
  if (pcts.isEmpty) return null;
  return pcts.reduce((a, b) => a + b) / pcts.length;
}

/// Оролтыг задлах үр дүн: [ok] бол [value] (null = цэвэрлэх), эс бөгөөс [error].
@immutable
class QuizParse {
  const QuizParse.ok(this.value) : error = null;
  const QuizParse.fail(String this.error) : value = null;

  final num? value;
  final String? error;

  bool get ok => error == null;
}

final _scoreRe = RegExp(r'^\d{1,3}([.,]\d{1,2})?$');
final _countRe = RegExp(r'^\d{1,4}$');

/// Багшийн бичсэн оноо: хоосон = цэвэрлэх; 0..max, бутархай таслал эсвэл цэгээр, 2 хүртэл орон.
QuizParse parseScoreInput(String text, num max) {
  final t = text.trim();
  if (t.isEmpty) return const QuizParse.ok(null);
  if (!_scoreRe.hasMatch(t)) return const QuizParse.fail('Тоо, бутархай нь 2 хүртэл оронтой (7,5)');
  final n = num.parse(t.replaceFirst(',', '.'));
  if (toHundredths(n) > toHundredths(max)) return QuizParse.fail('0-ээс ${formatScore(max)} хүртэл');
  final h = toHundredths(n);
  return QuizParse.ok(h % 100 == 0 ? h ~/ 100 : h / 100);
}

/// Бодлогын тоо: бүхэл 1..[quizMaxProblems].
QuizParse parseProblemCount(String text) {
  final t = text.trim();
  if (!_countRe.hasMatch(t)) return const QuizParse.fail('Бодлогын тоог бүхэл тоогоор');
  final n = int.parse(t);
  if (n < 1 || n > quizMaxProblems) return const QuizParse.fail('1-ээс $quizMaxProblems хүртэл');
  return QuizParse.ok(n);
}

/// Талбарт бичих үед: зөвхөн цифр ба ганц таслал/цэг, 6 тэмдэгт хүртэл (вэбийн `onChange`).
String sanitizeScoreText(String raw) {
  final kept = raw.replaceAll(RegExp(r'[^\d.,]'), '');
  final i = kept.indexOf(RegExp('[.,]'));
  final one = i < 0 ? kept : kept.substring(0, i + 1) + kept.substring(i + 1).replaceAll(RegExp('[.,]'), '');
  return one.length > 6 ? one.substring(0, 6) : one;
}

/// Сарын «Тэмдэглээгүй» даалгаврыг шалгалтын оноотой өдрөөр засна (хасах өдрийн тоо).
int quizCoveredDays(Iterable<String> expectedDays, Iterable<String> hwMarkedDays, Iterable<String> quizDays) {
  final marked = hwMarkedDays.toSet();
  final quiz = quizDays.toSet();
  var n = 0;
  for (final k in expectedDays.toSet()) {
    if (!marked.contains(k) && quiz.contains(k)) n++;
  }
  return n;
}

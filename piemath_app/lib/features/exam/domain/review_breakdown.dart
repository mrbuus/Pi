import '../data/exam_models.dart';

/// Дасгал тестийн эргэн харалтыг сэдвээр (бүлгээр) нэгтгэнэ — `GET /tests/:id/review`-ийн `chapterTitle`.
/// Хариу тодорхойгүй бодлогыг тооцохгүй. Сул сэдэв эхэнд (зөв хувь өсөхөөр), тэнцвэл анх гарсан дарааллаар.
List<TopicScore> topicBreakdown(List<PracticeReviewItem> items) {
  final order = <String>[];
  final correct = <String, int>{};
  final total = <String, int>{};
  for (final it in items) {
    if (it.answerUnknown) continue;
    final name = (it.chapterTitle?.trim().isNotEmpty ?? false) ? it.chapterTitle!.trim() : 'Бусад';
    if (!total.containsKey(name)) order.add(name);
    total[name] = (total[name] ?? 0) + 1;
    if (it.answered && it.correct) correct[name] = (correct[name] ?? 0) + 1;
  }
  double ratio(String n) => (correct[n] ?? 0) / total[n]!;
  final sorted = [...order]
    ..sort((a, b) {
      final c = ratio(a).compareTo(ratio(b));
      return c != 0 ? c : order.indexOf(a).compareTo(order.indexOf(b));
    });
  return [
    for (final n in sorted)
      TopicScore(
        name: n,
        percent: (ratio(n) * 100).round(),
        earned: (correct[n] ?? 0).toDouble(),
        max: total[n]!.toDouble(),
      ),
  ];
}

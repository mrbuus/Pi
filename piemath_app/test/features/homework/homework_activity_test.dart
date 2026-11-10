import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/homework/data/homework_models.dart';
import 'package:piemath_app/features/homework/domain/homework_activity.dart';

void main() {
  final t0 = DateTime.utc(2026, 11, 2, 10);

  test('серверийн утгаас үргэлжилж, харагдсан/гарсан хугацааг тусад нь тоолно', () {
    final c = HomeworkActivityClock(const HwActivity(activeSec: 100, awaySec: 5, leaveCount: 1), t0);
    c.hide(t0.add(const Duration(seconds: 30)));
    c.show(t0.add(const Duration(seconds: 50)));
    final a = c.snapshot(t0.add(const Duration(seconds: 60)));
    expect(a.activeSec, 140);
    expect(a.awaySec, 25);
    expect(a.leaveCount, 2);
  });

  test('давхар hide/show тоолуурыг эвдэхгүй', () {
    final c = HomeworkActivityClock(const HwActivity(), t0)
      ..hide(t0.add(const Duration(seconds: 10)))
      ..hide(t0.add(const Duration(seconds: 20)))
      ..show(t0.add(const Duration(seconds: 30)))
      ..show(t0.add(const Duration(seconds: 40)));
    final a = c.snapshot(t0.add(const Duration(seconds: 40)));
    expect(a.leaveCount, 1);
    expect(a.activeSec, 20);
    expect(a.awaySec, 20);
  });

  test('review: нээгдсэн бодлогын зөв хариу, аюулгүй бичлэг л', () {
    final r = HwReview.parse({
      'locked': false,
      'opensAt': null,
      'items': {
        'p1': {'correct': {'a': '1'}, 'solution': 'x', 'video': {'url': 'https://www.youtube.com/watch?v=1', 'embedUrl': 'e'}},
        'p2': {'correct': null, 'solution': null, 'video': {'url': 'http://evil.test/v', 'embedUrl': 'e'}},
      },
    })!;
    expect(r.items['p1']!.correct, {'a': '1'});
    expect(r.items['p1']!.videoUrl, 'https://www.youtube.com/watch?v=1');
    expect(r.items['p2']!.videoUrl, isNull);
  });
}

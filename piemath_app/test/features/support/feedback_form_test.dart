import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/support/domain/feedback_form.dart';

void main() {
  test('гарчиг, дэлгэрэнгүйн шалгалт = серверийн DTO', () {
    expect(validateSubject('  ab '), isNotNull);
    expect(validateSubject('Алдаа'), isNull);
    expect(validateSubject('а' * 121), isNotNull);
    expect(validateBody('богино'), isNotNull);
    expect(validateBody('Дэлгэрэнгүй тайлбар'), isNull);
  });

  test('UUID v4 хэлбэр', () {
    final id = uuidV4(math.Random(1));
    expect(RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$').hasMatch(id), isTrue);
  });

  test('ижил агуулга → ижил id (давтан илгээлт), өөрчлөгдвөл шинэ', () {
    final r = FeedbackRequestId(math.Random(2));
    final a = r.forPayload('BUG\nГарчиг\nБие');
    expect(r.forPayload('BUG\nГарчиг\nБие'), a);
    final b = r.forPayload('BUG\nГарчиг\nӨөр бие');
    expect(b, isNot(a));
    r.reset();
    expect(r.forPayload('BUG\nГарчиг\nӨөр бие'), isNot(b));
  });

  test('төрөл, төлөвийн шошго', () {
    expect(FeedbackKind.fromApi('SUGGESTION').label, 'Санал өгөх');
    expect(feedbackStateLabel('IN_REVIEW'), 'Шалгаж байна');
    expect(feedbackStateLabel('RESOLVED'), 'Шийдвэрлэсэн');
  });
}

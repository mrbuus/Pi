import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/features/parent/data/parent_history.dart';
import 'package:piemath_app/features/parent/ui/theory_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';

const _path = '/parent/children/s1/theory/ch1';
final _parent = signedInAs('PARENT');

void main() {
  testWidgets('онол: гарчиг, бичвэр, зураг', (tester) async {
    final h = FakeHttp()
      ..json('GET', _path, {
        'chapter': {'id': 'ch1', 'title': 'Илтгэгч функц'},
        'theories': [
          {'id': 't1', 'title': 'Тодорхойлолт', 'content': r'Функц $y=a^x$', 'imageKeys': ['k1', 'k2']},
        ],
      });
    await pumpM7(tester, const ParentTheoryScreen(studentId: 's1', chapterId: 'ch1'), http: h, session: _parent);
    expect(find.text('Илтгэгч функц'), findsOneWidget);
    expect(find.text('Тодорхойлолт'), findsOneWidget);
    expect(find.bySemanticsLabel('Тодорхойлолт, 2-р зураг'), findsOneWidget);
  });

  testWidgets('онолгүй — хоосон төлөв', (tester) async {
    final h = FakeHttp()
      ..json('GET', _path, {'chapter': {'id': 'ch1', 'title': 'Илтгэгч функц'}, 'theories': <Object?>[]});
    await pumpM7(tester, const ParentTheoryScreen(studentId: 's1', chapterId: 'ch1'), http: h, session: _parent);
    expect(find.text('Онол хараахан нэмээгүй'), findsOneWidget);
  });

  testWidgets('403 — төвийг сахисан тайлбар', (tester) async {
    final h = FakeHttp()..error('GET', _path, 403, 'Энэ хичээлийг үзэх эрхгүй.');
    await pumpM7(tester, const ParentTheoryScreen(studentId: 's1', chapterId: 'ch1'), http: h, session: _parent);
    expect(find.text('Энэ онол танд харагдахгүй'), findsOneWidget);
    expect(find.text(AppStrings.retry), findsNothing);
  });

  testWidgets('500 — дахин оролдох', (tester) async {
    final h = FakeHttp()..error('GET', _path, 500);
    await pumpM7(tester, const ParentTheoryScreen(studentId: 's1', chapterId: 'ch1'), http: h, session: _parent);
    expect(find.text(AppStrings.retry), findsOneWidget);
  });

  test('түүхийн мөр: бүлгийн id, хавсралтын зураг', () {
    final a = HistoryAttempt.fromJson({
      'id': 'a1',
      'problem': {'chapterId': 'ch1', 'chapter': {'title': 'X'}},
    });
    expect(a.chapterId, 'ch1');
    final p = HistoryPacket.fromJson({
      'id': 'p1',
      'chapter': {'title': 'X'},
      'receipts': [
        {'id': 'r1', 'imageKeys': ['k1', '']},
        {'id': 'r2', 'imageKeys': ['k2']},
      ],
    });
    expect(p.receipts, 2);
    expect(p.imageKeys, ['k1', 'k2']);
  });
}

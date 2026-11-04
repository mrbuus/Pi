import 'package:flutter_test/flutter_test.dart';

import '../../helpers/fake_http.dart';
import 'exam_test_app.dart';

Map<String, Object?> _item(int n, String chapter, {required bool correct}) => {
  'n': n,
  'points': 1,
  'chapterTitle': chapter,
  'statementText': 'Бодлого $n',
  'answered': true,
  'correct': correct,
  'myAnswer': 'A',
};

void main() {
  testWidgets('эргэн харалт: 2+ сэдэвтэй бол «Сэдвээр» задаргаа, сул нь эхэнд, тоогоор', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/tests/t1/review', {
        'result': {'totalScore': 2, 'maxScore': 4},
        'items': [
          _item(1, 'Функц', correct: true),
          _item(2, 'Функц', correct: true),
          _item(3, 'Логарифм', correct: false),
          _item(4, 'Логарифм', correct: false),
        ],
        'leaveCount': 0,
      });
    await ExamTestApp(http).pump(tester, location: '/app/tests/t1/review');
    await ExamTestApp.settle(tester);
    expect(find.text('Сэдвээр'), findsOneWidget);
    expect(find.text('0/2'), findsOneWidget);
    expect(find.text('2/2'), findsOneWidget);
    expect(tester.getTopLeft(find.text('Логарифм')).dy, lessThan(tester.getTopLeft(find.text('Функц')).dy));
  });

  testWidgets('ганц сэдэвтэй бол задаргаа гаргахгүй (нийт оноотой давхардана)', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/tests/t1/review', {
        'result': {'totalScore': 1, 'maxScore': 2},
        'items': [_item(1, 'Функц', correct: true), _item(2, 'Функц', correct: false)],
        'leaveCount': 0,
      });
    await ExamTestApp(http).pump(tester, location: '/app/tests/t1/review');
    await ExamTestApp.settle(tester);
    expect(find.text('Сэдвээр'), findsNothing);
  });
}

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/parent/data/weekly_report.dart';
import 'package:piemath_app/features/parent/ui/parent_home_screen.dart';
import 'package:piemath_app/features/parent/ui/weekly_report_screen.dart';
import 'package:piemath_app/shared/quiz_score/quiz_score.dart';

import '../../helpers/fake_http.dart';
import '../m7_fixtures.dart';
import '../m7_harness.dart';

// Давалгаа 6 (вэб 2026-11-08 19:08): шалгалтаар даалгавар шалгасан оноо эцэг эхэд харагдана.

Map<String, Object?> _link() {
  final l = verifiedLink();
  return {
    ...l,
    'student': {
      ...(l['student']! as Map<String, Object?>),
      'homeworkQuizzes': [
        {'classroomId': 'cls1', 'classroom': '12Б', 'date': '2026-11-03', 'score': 4.5, 'problemCount': 10},
      ],
    },
  };
}

FakeHttp _http(Map<String, Object?> link) => FakeHttp()
  ..json('GET', '/parent/children', [link])
  ..json('GET', '/exam-results/parent/tr1', examCard())
  ..json('GET', '/tuition/paid-until/s1', {'paidUntil': '2026-11-06T00:00:00.000Z'});

void main() {
  testWidgets('эцэг эхийн нүүр: даалгаврын картад шалгалтын оноо (бутархай, хувь)', (tester) async {
    await pumpM7(tester, const ParentHomeScreen(), http: _http(_link()), session: signedInAs('PARENT'));
    await scrollTo(tester, find.byType(QuizScoreChip));
    expect(find.byType(QuizScoreChip), findsOneWidget);
    expect(find.text('45%'), findsOneWidget);
    expect(find.textContaining('4,5', findRichText: true), findsOneWidget);
  });

  testWidgets('7 хоногийн тайлан: шалгалтын оноо огноотой', (tester) async {
    final report = weeklyReportJson();
    final hw = Map<String, Object?>.of(report['homework']! as Map<String, Object?>)
      ..['quizzes'] = [
        {'classroomId': 'cls1', 'classroom': '12Б', 'date': '2026-11-03', 'score': 8, 'problemCount': 10},
      ];
    final http = _http(verifiedLink())..json('GET', '/parents/weekly-report', {...report, 'homework': hw});
    await pumpM7(tester, const WeeklyReportScreen(), http: http, session: signedInAs('PARENT'));
    await scrollTo(tester, find.byType(QuizScoreChip));
    expect(find.text('11-03'), findsOneWidget);
    expect(find.text('80%'), findsOneWidget);
  });

  test('хуучин хариу (quizzes-гүй) унахгүй', () {
    expect(WeeklyReport.fromJson(weeklyReportJson()).homework.quizzes, isEmpty);
  });
}

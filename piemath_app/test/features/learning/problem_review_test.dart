import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/token_holder.dart';
import 'package:piemath_app/core/network/api_client.dart';
import 'package:piemath_app/features/learning/data/activity_models.dart';
import 'package:piemath_app/features/learning/data/practice_models.dart';
import 'package:piemath_app/features/learning/data/practice_repository.dart';
import 'package:piemath_app/features/learning/data/problem_review_models.dart';
import 'package:piemath_app/features/learning/data/problem_review_repository.dart';
import 'package:piemath_app/features/learning/data/readiness_models.dart';
import 'package:piemath_app/features/learning/data/weekly_goal_repository.dart';
import 'package:piemath_app/features/learning/domain/study_plan.dart';
import 'package:piemath_app/features/learning/ui/study_hub_parts.dart' show restDayNote;
import 'package:piemath_app/shared/anim/animation_slot.dart';

import '../../helpers/fake_http.dart';
import 'learning_test_app.dart';

Map<String, Object?> _due(String id, {String statement = r'$2x=6$ бол $x$'}) => {
  'id': id,
  'problem': {
    'id': 'p-$id',
    'statementText': statement,
    'choices': [r'$2$', r'$3$', r'$4$'],
    'choiceMode': 'TEXT',
    'format': 'CHOICE',
    'imageKey': null,
  },
  'dueAt': '2026-11-03T16:00:00.000Z',
  'intervalDays': 1,
  'reps': 0,
  'lapses': 0,
  'lastResult': 'WRONG',
  'source': 'TEST',
  'formulas': <Object?>[],
};

ApiClient _client(FakeHttp http) => ApiClient(baseUrl: 'https://api.test/api', tokens: TokenHolder(), dio: http.dio());

void main() {
  group('загвар', () {
    test('DueReviews: total нь ачаалсан мөрөөс бага биш, хоосон id алгасна', () {
      final d = DueReviews.fromJson({
        'total': 1,
        'items': [
          _due('a'),
          _due('b'),
          const {'id': ''},
        ],
      });
      expect(d.items.map((i) => i.id), ['a', 'b']);
      expect(d.total, 2);
      expect(d.items.first.problem.choices, [r'$2$', r'$3$', r'$4$']);
    });

    test('ReviewAnswerResult: зөв хариу нээгдээгүй (null) байж болно', () {
      final r = ReviewAnswerResult.fromJson(const {
        'correct': true,
        'correctAnswer': null,
        'dueAt': '2026-11-06T16:00:00.000Z',
      });
      expect(r.correct, isTrue);
      expect(r.correctAnswer, isNull);
      expect(r.dueAt, DateTime.utc(2026, 11, 6, 16));
    });

    test('ActivityStreak: шинэ талбарууд сонголттой', () {
      expect(ActivityStreak.fromJson(const {'currentStreak': 2}).restDayUsedThisWeek, isNull);
      final s = ActivityStreak.fromJson(const {'flexStreak': 4, 'restDayUsedThisWeek': true, 'activeDaysThisWeek': 9});
      expect((s.flexStreak, s.restDayUsedThisWeek, s.activeDaysThisWeek), (4, true, 7));
      expect(restDayNote(null), isNull);
      expect(restDayNote(s), 'Энэ 7 хоногийн амралтын өдрөө ашигласан');
      expect(restDayNote(ActivityStreak.fromJson(const {'restDayUsedThisWeek': false})), contains('амарч болно'));
    });

    test('ReadinessTopic.chapterId, ChapterMatch, practiceTopicPath', () {
      expect(ReadinessTopic.fromJson(const {'topic': 'A', 'chapterId': 'c1'}).chapterId, 'c1');
      expect(ReadinessTopic.fromJson(const {'topic': 'A'}).chapterId, isNull);
      expect(ChapterMatch.tryParse({'chapterId': null, 'chapterIds': <Object?>[]}), isNull);
      expect(
        ChapterMatch.tryParse({
          'chapterId': 'a',
          'chapterIds': ['a', 'b'],
        })!.chapterIds,
        ['a', 'b'],
      );
      expect(practiceTopicPath(['a', 'b'], title: 'Логарифм тэгшитгэл'), contains('chapter=a%2Cb'));
    });
  });

  group('давтах тоолуур (цэвэр)', () {
    test('өнөөдрийн алдаатай давхардсан бодлогыг нэг л удаа', () {
      final c = reviewCounts(mistakeProblemIds: ['p1', 'p2'], formulas: 3, dueTotal: 4, dueProblemIds: ['p1', 'p9']);
      expect((c.mistakes, c.formulas, c.problems, c.total), (2, 3, 3, 8));
    });

    test('төлөвлөгөө: хугацаа нь болсон бодлого, сүүлийн сэдэв бүлэгтэй бол дасгал руу', () {
      final items = buildTodayPlan(
        const PlanInputs(problemsDue: 2, lastTopic: 'Логарифм', lastTopicPath: '/app/practice?chapter=c1'),
      );
      final due = items.firstWhere((p) => p.kind == PlanKind.problemReview);
      expect((due.subtitle, due.path), ('2 бодлого', '/app/study/due'));
      expect(items.firstWhere((p) => p.kind == PlanKind.lastTopic).path, '/app/practice?chapter=c1');
      expect(
        buildTodayPlan(const PlanInputs(lastTopic: 'Логарифм')).firstWhere((p) => p.kind == PlanKind.lastTopic).path,
        '/app/study/review',
      );
    });
  });

  group('repository', () {
    test('давталт: limit, хариу, аюулгүй бус id', () async {
      final http = FakeHttp()
        ..json('GET', '/review/problems/due', {'total': 0, 'items': <Object?>[]})
        ..json('POST', '/review/problems/r1/answer', {'correct': false});
      final repo = ProblemReviewRepository(_client(http));
      await repo.due(limit: 5);
      expect(http.requests.last.queryParameters['limit'], 5);
      final r = await repo.answer('r1', 1);
      expect(r.correct, isFalse);
      expect(http.requests.last.data, {'answer': 1});
      expect(() => repo.answer('../x', 1), throwsA(anything));
    });

    test('сэдвээр дасгал: chapterId таслалаар, аюулгүй бус ID хасагдана', () async {
      final http = FakeHttp()..json('GET', '/recommend/next', <Object?>[]);
      await PracticeRepository(_client(http)).next(chapterIds: ['a', 'b c', 'd']);
      expect(http.requests.last.queryParameters['chapterId'], 'a,d');
      await PracticeRepository(_client(http)).next();
      expect(http.requests.last.queryParameters.containsKey('chapterId'), isFalse);
    });

    test('7 хоногийн зорилго: GET/PUT, хүрээнээс гадуур бол null', () async {
      final http = FakeHttp()
        ..json('GET', '/study/weekly-goal', {'daysPerWeek': 9})
        ..json('PUT', '/study/weekly-goal', {'daysPerWeek': 3});
      final repo = WeeklyGoalRepository(_client(http));
      expect(await repo.get(), isNull);
      expect(await repo.put(3), 3);
      expect(http.requests.last.data, {'daysPerWeek': 3});
      await repo.put(null);
      expect(http.requests.last.data, {'daysPerWeek': null});
    });
  });

  group('давталтын дэлгэц', () {
    testWidgets('нэг нэгээр: зөв бол баярын слот, зөв хариу, дараагийн огноо; дүн', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/review/problems/due', {
          'total': 2,
          'items': [_due('r1'), _due('r2', statement: r'$x+1=2$')],
        })
        ..json('POST', '/review/problems/r1/answer', {
          'correct': true,
          'correctAnswer': r'$3$',
          'solutionOutline': null,
          'scheduled': true,
          'dueAt': '2026-11-06T16:00:00.000Z',
          'intervalDays': 3,
        })
        ..json('POST', '/review/problems/r2/answer', {
          'correct': false,
          'correctAnswer': null,
          'solutionOutline': null,
          'scheduled': true,
          'dueAt': '2026-11-04T16:00:00.000Z',
          'intervalDays': 1,
        });
      await pumpLearning(tester, http, location: '/app/study/due');
      expect(find.text('1 / 2'), findsOneWidget);
      final check = find.widgetWithText(FilledButton, 'Хариуг шалгах');
      expect(tester.widget<FilledButton>(check).onPressed, isNull, reason: 'хариугүй бол идэвхгүй');
      await tester.tap(find.text('2').first);
      await settle(tester);
      await tester.tap(check);
      await settle(tester);
      expect(find.text('Зөв'), findsOneWidget);
      expect(find.byType(AnimationSlot), findsOneWidget);
      expect(find.text('Зөв хариу: '), findsOneWidget);
      expect(find.textContaining('Дараагийн давталт'), findsOneWidget);
      expect(http.requests.last.data, {'answer': 1});

      await tester.tap(find.text('Дараагийнх'));
      await settle(tester);
      expect(find.text('2 / 2'), findsOneWidget);
      await tester.tap(find.text('3').first);
      await settle(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Хариуг шалгах'));
      await settle(tester);
      expect(find.text('Одоохондоо зөрүүтэй байна'), findsOneWidget);
      expect(find.text('Зөв хариу: '), findsNothing, reason: 'сервер нээгээгүй бол харуулахгүй');
      await tester.tap(find.text('Дүнгээ харах'));
      await settle(tester);
      expect(find.text('2 бодлогоос 1-ийг зөв бодлоо'), findsOneWidget);
    });

    testWidgets('хоосон бол тайван төлөв', (tester) async {
      final http = FakeHttp()..json('GET', '/review/problems/due', {'total': 0, 'items': <Object?>[]});
      await pumpLearning(tester, http, location: '/app/study/due');
      expect(find.text('Өнөөдөр давтах бодлого алга'), findsOneWidget);
    });

    testWidgets('сервер татгалзвал (409) монгол мессеж, дахин оролдох боломжтой', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/review/problems/due', {
          'total': 1,
          'items': [_due('r1')],
        })
        ..error('POST', '/review/problems/r1/answer', 409, 'Энэ бодлогын давтах өдөр болоогүй байна');
      await pumpLearning(tester, http, location: '/app/study/due');
      await tester.tap(find.text('2').first);
      await settle(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Хариуг шалгах'));
      await settle(tester);
      expect(find.text('Энэ бодлогын давтах өдөр болоогүй байна'), findsOneWidget);
      expect(find.text('Зөв хариу: '), findsNothing);
      expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Дүнгээ харах')).onPressed, isNull);
    });
  });
}

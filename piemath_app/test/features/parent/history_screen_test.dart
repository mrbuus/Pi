import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/features/parent/data/parent_history.dart';
import 'package:piemath_app/features/parent/ui/history_screen.dart';
import 'package:piemath_app/features/parent/ui/parent_home_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_fixtures.dart';
import '../m7_harness.dart';

Map<String, Object?> _page({
  int page = 1,
  bool more = false,
  String attempt = 'Илтгэгч функц',
  bool withAll = true,
}) => {
  'year': 2026,
  'page': page,
  'pageSize': 50,
  'summary': {'activeDays': 40, 'attemptCount': 820, 'learningEventCount': 12, 'days': <Object?>[]},
  'attempts': {
    'rows': [
      {
        'id': 'a$page',
        'problemId': 'p1',
        'testId': null,
        'source': 'ONLINE_TEST',
        'occurredOn': '2026-10-30T00:00:00.000Z',
        'createdAt': '2026-10-30T05:00:00.000Z',
        'autoCorrect': page == 1,
        'selfState': null,
        'givenAnswer': 'C',
        'problem': {
          'chapterId': 'ch1',
          'chapter': {'title': attempt},
        },
      },
    ],
    'hasMore': more,
  },
  'learning': {'rows': <Object?>[], 'hasMore': false},
  'homework': {
    'rows': withAll
        ? [
            {
              'id': 'h1',
              'date': '2026-10-29T00:00:00.000Z',
              'status': 'PARTIAL',
              'comment': 'Хоёр бодлого дутуу',
              'classroom': {'name': '12Б'},
            },
          ]
        : <Object?>[],
    'hasMore': false,
  },
  'submissions': {'rows': <Object?>[], 'hasMore': false},
  'results': {
    'rows': withAll
        ? [
            {
              'id': 'tr1',
              'testId': 't1',
              'totalScore': 31,
              'maxScore': 40,
              'createdAt': '2026-10-20T05:00:00.000Z',
              'test': {'title': 'ЭЕШ жишиг 3', 'type': 'EESH_MOCK'},
              'acknowledgements': <Object?>[],
            },
          ]
        : <Object?>[],
    'hasMore': false,
  },
  'attendance': {
    'rows': withAll
        ? [
            {
              'id': 'at1',
              'date': '2026-10-28T00:00:00.000Z',
              'status': 'LATE',
              'classroom': {'name': '12Б'},
            },
          ]
        : <Object?>[],
    'hasMore': false,
  },
  'dismissals': {
    'rows': withAll
        ? [
            {
              'id': 'd1',
              'date': '2026-10-28T00:00:00.000Z',
              'approximateAt': '2026-10-28T07:30:00.000Z',
              'lastLeftAt': '2026-10-28T07:50:00.000Z',
              'note': null,
              'classroom': {'name': '12Б'},
            },
          ]
        : <Object?>[],
    'hasMore': false,
  },
  'lessonPackets': {'rows': <Object?>[], 'hasMore': false},
};

FakeHttp _http() => FakeHttp()..json('GET', '/parent/children', [verifiedLink()]);

final _parent = signedInAs('PARENT');

void main() {
  group('ParentHistory.fromJson', () {
    test('хоосон/дутуу бие эвдрэхгүй', () {
      final h = ParentHistory.fromJson(<String, Object?>{});
      expect(h.isEmpty, isTrue);
      expect(h.hasMore, isFalse);
      expect(h.page, 1);
    });

    test('append: мөр залгана, hasMore шинэ хуудасных', () {
      final a = ParentHistory.fromJson(_page(more: true));
      final b = ParentHistory.fromJson(_page(page: 2, withAll: false));
      final m = a.append(b);
      expect(m.attempts.rows, hasLength(2));
      expect(m.attempts.hasMore, isFalse);
      expect(m.hasMore, isFalse);
      expect(m.summary.attemptCount, 820);
      expect(m.page, 2);
    });
  });

  testWidgets('жилийн түүх: нийт, ирц, даалгавар, дүн, бодлого, тарах цаг (UB цаг)', (tester) async {
    final http = _http()..json('GET', '/parent/children/s1/history', _page());
    await pumpM7(tester, const ParentHistoryScreen(), http: http, session: _parent);
    final req = http.requests.singleWhere((r) => r.path == '/parent/children/s1/history');
    expect(req.queryParameters, {'year': '2026', 'page': '1'});
    expect(find.text('820'), findsOneWidget);
    expect(find.text('Идэвхтэй өдөр'), findsOneWidget);
    expect(find.text('2026 он'), findsOneWidget);
    expect(find.text('2023 он'), findsOneWidget);
    await scrollTo(tester, find.text('Хоцорсон'));
    await scrollTo(tester, find.text('12Б: Хоёр бодлого дутуу'));
    await scrollTo(tester, find.text('31/40 оноо'));
    await scrollTo(tester, find.text('Илтгэгч функц'));
    expect(find.text('Зөв'), findsOneWidget);
    await scrollTo(tester, find.text('15:30, сүүлд 15:50'));
    expect(find.text('Дараагийн хуудас'), findsNothing);
  });

  testWidgets('өмнөх жил сонгоход year параметртэй дахин татна', (tester) async {
    final http = _http()
      ..json('GET', '/parent/children/s1/history', _page())
      ..json('GET', '/parent/children/s1/history', _page(withAll: false));
    await pumpM7(tester, const ParentHistoryScreen(), http: http, session: _parent);
    await tester.tap(find.text('2025 он'));
    await settle(tester);
    final reqs = http.requests.where((r) => r.path == '/parent/children/s1/history').toList();
    expect(reqs.map((r) => r.queryParameters['year']), ['2026', '2025']);
  });

  testWidgets('«Дараагийн хуудас» → page=2, мөрүүд нэмэгдэнэ', (tester) async {
    final http = _http()
      ..json('GET', '/parent/children/s1/history', _page(more: true))
      ..json('GET', '/parent/children/s1/history', _page(page: 2, attempt: 'Логарифм', withAll: false));
    await pumpM7(tester, const ParentHistoryScreen(), http: http, session: _parent);
    await scrollTo(tester, find.text('Дараагийн хуудас'));
    await tester.ensureVisible(find.text('Дараагийн хуудас'));
    await tester.pump();
    await tester.tap(find.text('Дараагийн хуудас'));
    await settle(tester);
    final pages = http.requests.where((r) => r.path == '/parent/children/s1/history').map((r) => r.queryParameters['page']);
    expect(pages, ['1', '2']);
    await scrollTo(tester, find.text('Логарифм'));
    expect(find.text('Илтгэгч функц'), findsOneWidget);
    expect(find.text('Дараагийн хуудас'), findsNothing);
  });

  testWidgets('хоосон жил → тайлбар', (tester) async {
    final http = _http()
      ..json('GET', '/parent/children/s1/history', {
        'year': 2026,
        'page': 1,
        'summary': {'activeDays': 0, 'attemptCount': 0, 'learningEventCount': 0},
      });
    await pumpM7(tester, const ParentHistoryScreen(), http: http, session: _parent);
    expect(find.text('Энэ жилд бүртгэл алга'), findsOneWidget);
  });

  testWidgets('алдаа → «Дахин оролдох» → амжилт', (tester) async {
    final http = _http()
      ..error('GET', '/parent/children/s1/history', 400, 'Жилээ шалгана уу.')
      ..json('GET', '/parent/children/s1/history', _page());
    await pumpM7(tester, const ParentHistoryScreen(), http: http, session: _parent);
    expect(find.text('Жилээ шалгана уу.'), findsOneWidget);
    await tester.tap(find.text(AppStrings.retry));
    await settle(tester);
    expect(find.text('820'), findsOneWidget);
  });

  testWidgets('баталгаажаагүй хүүхэд → түүх харагдахгүй', (tester) async {
    final http = FakeHttp()..json('GET', '/parent/children', [{...verifiedLink(), 'verified': false}]);
    await pumpM7(tester, const ParentHistoryScreen(), http: http, session: _parent);
    expect(find.text('Баталгаажсан хүүхэд алга'), findsOneWidget);
    expect(http.requests.where((r) => r.path.endsWith('/history')), isEmpty);
  });

  testWidgets('хүүхдийн самбараас «Жилийн түүх» руу', (tester) async {
    final http = _http()
      ..json('GET', '/exam-results/parent/tr1', examCard())
      ..json('GET', '/tuition/paid-until/s1', {'paidUntil': '2026-11-06T00:00:00.000Z'});
    await pumpM7(tester, const ParentHomeScreen(), http: http, session: _parent);
    await tester.tap(find.text('Жилийн түүх'));
    await settle(tester);
    expect(find.text('ROUTE:/app/parent/history?studentId=s1'), findsOneWidget);
  });
}

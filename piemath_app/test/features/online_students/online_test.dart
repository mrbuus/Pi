import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/token_holder.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/network/api_client.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/online_students/data/online_models.dart';
import 'package:piemath_app/features/online_students/data/online_repository.dart';
import 'package:piemath_app/features/online_students/domain/online_logic.dart';
import 'package:piemath_app/features/online_students/ui/online_student_screen.dart';
import 'package:piemath_app/features/online_students/ui/online_students_screen.dart';

import '../../helpers/fake_http.dart';
import 'online_fixtures.dart';

OnlineRepository _repo(FakeHttp http) =>
    OnlineRepository(ApiClient(baseUrl: 'https://api.test/api', tokens: TokenHolder(), dio: http.dio()));

void main() {
  group('Репозитор', () {
    test('жагсаалт: шүүлтүүр query, хуудаслалт', () async {
      final http = onlineHttp();
      final repo = _repo(http);
      final f = OnlineFilters.query(OnlineFilters.attention);
      final page = await repo.roster(search: ' Сод ', passStatus: f.passStatus, activity: f.activity, page: 2);
      expect(http.requests.last.queryParameters, {
        'search': 'Сод',
        'passStatus': 'ACTIVE',
        'activity': 'DORMANT',
        'page': '2',
        'pageSize': '50',
      });
      expect(page.items.single.dormantWithPass, isTrue);
      await repo.roster();
      expect(http.requests.last.queryParameters, {'page': '1', 'pageSize': '50'});
    });

    test('дэлгэрэнгүй, хугацааны тэнхлэг (token уншихгүй), тест сонголт', () async {
      final repo = _repo(onlineHttp());
      final d = await repo.detail('o1');
      expect(d.name, 'Ган Сод');
      expect(d.totalAttempts, 20);
      expect(d.overallSuccess, 55);
      expect(d.passHistory, hasLength(2));
      expect(d.tests.single.percent, 75);
      final tl = await repo.timeline('o1', from: '2026-10-05', to: '2026-11-05');
      expect(tl.whereType<TimelineAttempt>().first.attemptId, 'a1');
      expect(tl.whereType<TimelineAttempt>().last.attemptId, isNull);
      expect(timelineText(tl.last), 'Бүлэг нээсэн, 3 мин');
      expect(timelineText(tl.first), 'Олонлог, Алдсан');
      final picks = await repo.tests();
      expect(picks.first.label, 'Тэгшитгэл A, Тэгшитгэл');
      expect(picks.last.label, 'Олонлог B');
    });

    test('тест оноох, оролдлого засах: бие', () async {
      final http = onlineHttp();
      final repo = _repo(http);
      await repo.assignTest('o1', testId: 't2', note: '  ');
      expect(requestBody(http, 'POST', '/progress/student/o1/assign-test'), {'testId': 't2'});
      await repo.assignTest('o1', testId: 't2', note: 'давтлага');
      expect(requestBody(http, 'POST', '/progress/student/o1/assign-test'), {'testId': 't2', 'note': 'давтлага'});
      await repo.adjustAttempt('o1', 'a1', selfState: 'FIXED_AFTER_ERROR');
      expect(requestBody(http, 'PATCH', '/progress/student/o1/attempt/a1'), {'selfState': 'FIXED_AFTER_ERROR'});
    });
  });

  group('Логик', () {
    test('эрх: бүх ажилтан харна, зөвхөн Багш+/Админ засна', () {
      expect(const OnlineAccess(UserRole.teacher).canView, isTrue);
      expect(const OnlineAccess(UserRole.teacher).canEdit, isFalse);
      expect(const OnlineAccess(UserRole.teacherPlus).canEdit, isTrue);
      expect(const OnlineAccess(UserRole.admin).canEdit, isTrue);
      expect(const OnlineAccess(UserRole.student).canView, isFalse);
      expect(const OnlineAccess(UserRole.parent).canView, isFalse);
      expect(const OnlineAccess(null).canView, isFalse);
    });

    test('шүүлтүүр → query', () {
      expect(OnlineFilters.query(null), (passStatus: null, activity: null));
      expect(OnlineFilters.query(OnlineFilters.noPass), (passStatus: 'EXPIRED', activity: null));
      expect(OnlineFilters.query(OnlineFilters.slowing), (passStatus: null, activity: 'SLOWING'));
    });

    test('эрхтэй ч идэвхгүй нь эхэнд', () {
      final rows = [for (final r in onlineRows) OnlineStudent.fromJson(r)];
      expect(priorityFirst(rows).map((s) => s.id), ['o1', 'o2', 'o3']);
    });

    test('эрхийн төлөв: 7 хоног дотор «удахгүй дуусна»', () {
      final soon = ActivePass(name: 'x', expiresAt: onlineNow.add(const Duration(days: 3, hours: 22)));
      expect(passDaysLeft(soon, onlineNow), 4);
      expect(passState(soon, onlineNow), PassState.expiringSoon);
      expect(
        passState(ActivePass(name: 'x', expiresAt: onlineNow.add(const Duration(days: 30))), onlineNow),
        PassState.valid,
      );
      expect(passState(null, onlineNow), PassState.none);
    });

    test('сүүлийн идэвх, түвшин (3 / 10 хоног), ирээдүйн өдөр тооцохгүй', () {
      final d = OnlineDetail.fromJson(detailJson);
      final today = UbDateTime.fromInstant(onlineNow);
      final last = lastActiveDay(d.days, today);
      expect(last!.dateKey, '2026-11-02');
      expect(engagementSince(last, today), Engagement.active);
      expect(engagementSince(today.addDays(-5), today), Engagement.slowing);
      expect(engagementSince(today.addDays(-11), today), Engagement.dormant);
      expect(engagementSince(null, today), Engagement.dormant);
      expect(relativeDay(last, today), '2 өдрийн өмнө');
      expect(relativeDay(today, today), 'Өнөөдөр');
    });

    test('харьцангуй хугацаа', () {
      expect(relativeSince(null, onlineNow), 'Хэзээ ч идэвхжиж байгаагүй');
      expect(relativeSince(onlineNow.subtract(const Duration(seconds: 20)), onlineNow), 'Дөнгөж сая');
      expect(relativeSince(onlineNow.subtract(const Duration(minutes: 5)), onlineNow), '5 минутын өмнө');
      expect(relativeSince(onlineNow.subtract(const Duration(hours: 3)), onlineNow), '3 цагийн өмнө');
      expect(relativeSince(onlineNow.subtract(const Duration(days: 4)), onlineNow), '4 өдрийн өмнө');
      expect(relativeSince(onlineNow.subtract(const Duration(days: 65)), onlineNow), '2 сарын өмнө');
    });

    test('12 долоо хоногийн идэвх: Даваа–Ням, ирээдүй -1', () {
      final d = OnlineDetail.fromJson(detailJson);
      final today = UbDateTime.fromInstant(onlineNow);
      final weeks = activityWeeks(d.days, today);
      expect(weeks, hasLength(12));
      expect(weeks.every((w) => w.length == 7), isTrue);
      final last = weeks.last;
      final todayIdx = today.weekday - 1;
      expect(last[todayIdx], 0);
      if (todayIdx < 6) expect(last[todayIdx + 1], -1);
      final nov2 = parseDateKey('2026-11-02')!;
      expect(last[nov2.weekday - 1], 3);
    });

    test('өдрөөр бүлэглэх', () {
      final items = [
        TimelineEvent(DateTime.utc(2026, 11, 2, 3), type: 'LOGIN'),
        TimelineEvent(DateTime.utc(2026, 11, 2, 1), type: 'LOGIN'),
        TimelineEvent(DateTime.utc(2026, 11, 1, 1), type: 'LOGIN'),
      ];
      expect(groupByDay(items).map((g) => g.items.length), [2, 1]);
    });
  });

  group('Жагсаалт', () {
    testWidgets('эрхтэй ч идэвхгүй нь дээр, анхааруулга, мөр, шүүлтүүр, дэлгэрэнгүй рүү', (tester) async {
      final http = onlineHttp();
      await pumpOnline(tester, const OnlineStudentsScreen(), http: http);
      expect(find.text('3 сурагч'), findsOneWidget);
      expect(find.textContaining('1 сурагчийн эрх хүчинтэй хэрнээ идэвхгүй'), findsOneWidget);
      final ys = [
        for (final n in ['Ган Сод', 'Бат Анар']) tester.getTopLeft(find.text(n)).dy,
      ];
      expect(ys.first < ys.last, isTrue);
      expect(find.text('Эрхгүй'), findsOneWidget);
      expect(find.text('Сулраж байна'), findsWidgets);

      await tester.tap(find.byKey(const ValueKey('filter:attention')));
      await settle(tester, frames: 20);
      expect(http.requests.last.queryParameters['activity'], 'DORMANT');
      expect(http.requests.last.queryParameters['passStatus'], 'ACTIVE');
      expect(find.text('1 сурагч'), findsOneWidget);

      await tester.tap(find.text('Ган Сод'));
      await settle(tester);
      expect(find.text('ROUTE:/app/online/o1'), findsOneWidget);
    });

    testWidgets('сурагч, эцэг эхэд хаалттай', (tester) async {
      final http = onlineHttp();
      await pumpOnline(tester, const OnlineStudentsScreen(), http: http, role: 'PARENT');
      expect(find.text(AppStrings.forbidden), findsOneWidget);
      expect(http.count('GET', '/progress/online-students'), 0);
    });
  });

  group('Дэлгэрэнгүй', () {
    testWidgets('Багш: тоо, явц, тест, идэвх — засах товчгүй', (tester) async {
      final http = onlineHttp();
      await pumpOnline(
        tester,
        const OnlineStudentScreen(studentId: 'o1', name: 'Ган Сод'),
        http: http,
      );
      expect(find.text('Идэвхтэй'), findsOneWidget);
      expect(find.text('Удахгүй дуусна'), findsOneWidget);
      expect(find.text('2026.11.08 хүртэл'), findsOneWidget);
      expect(find.text('Сүүлд: 2 өдрийн өмнө'), findsOneWidget);
      expect(find.text('55%'), findsWidgets);
      expect(find.text('Тест оноох'), findsNothing);
      expect(find.textContaining('Та зөвхөн харах эрхтэй'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Тэгшитгэл A'), 200, scrollable: verticalScroll());
      expect(find.text('30/40'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Олонлог, Алдсан'), 200, scrollable: verticalScroll());
      expect(find.byTooltip('Тэмдэглэгээ засах'), findsNothing);
      expect(find.textContaining('НУУЦ'), findsNothing);
      await tester.scrollUntilVisible(find.text('Эрхийн түүх (2)'), 200, scrollable: verticalScroll());
      expect(http.count('POST', '/progress/student/o1/assign-test'), 0);
    });

    testWidgets('Багш+: тест оноох, оролдлогын тэмдэглэгээ засах', (tester) async {
      final http = onlineHttp();
      await pumpOnline(
        tester,
        const OnlineStudentScreen(studentId: 'o1'),
        http: http,
        role: 'TEACHER_PLUS',
      );
      expect(find.textContaining('Та зөвхөн харах эрхтэй'), findsNothing);
      await tester.tap(find.text('Тест оноох'));
      await settle(tester, frames: 20);
      await tester.tap(find.text('Тест').last);
      await settle(tester);
      await tester.tap(find.text('Олонлог B'));
      await settle(tester);
      await tester.tap(find.text('Оноох'));
      await settle(tester, frames: 20);
      expect(requestBody(http, 'POST', '/progress/student/o1/assign-test'), {'testId': 't2'});
      expect(find.text('Тест амжилттай оноогдлоо'), findsOneWidget);
      await tester.pump(const Duration(seconds: 6));
      await settle(tester, frames: 20);

      await tester.scrollUntilVisible(find.text('Олонлог, Алдсан'), 200, scrollable: verticalScroll());
      expect(find.byTooltip('Тэмдэглэгээ засах'), findsOneWidget);
      await tester.tap(find.byTooltip('Тэмдэглэгээ засах'));
      await settle(tester);
      await tester.tap(find.text('Зассан'));
      await settle(tester, frames: 20);
      expect(requestBody(http, 'PATCH', '/progress/student/o1/attempt/a1'), {'selfState': 'FIXED_AFTER_ERROR'});
      expect(find.text('Олонлог, Зассан'), findsOneWidget);
    });
  });
}

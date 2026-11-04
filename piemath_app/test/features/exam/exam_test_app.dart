import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/app/app.dart';
import 'package:piemath_app/app/router.dart';
import 'package:piemath_app/app/theme_mode.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/integrity/integrity.dart';
import 'package:piemath_app/features/exam/application/exam_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';

/// Шалгалтын тестэд: нэвтэрсэн сурагчтай бүтэн апп (router, shell), mock API, хуурамч хамгаалалт.
class ExamTestApp {
  ExamTestApp(this.http);

  final FakeHttp http;
  late ProviderContainer container;
  FakeExamGuard? guard;

  Future<void> pump(WidgetTester tester, {required String location, Size size = const Size(390, 844)}) async {
    tester.view.physicalSize = size * 2;
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    if (!http.requests.any((r) => r.path == '/auth/me')) http.json('GET', '/auth/me', fakeMe());
    container = ProviderContainer(
      overrides: [
        ...testOverrides(
          http: http,
          store: MemoryTokenStore(const StoredAuth(token: 't', userId: 'u1', role: UserRole.student)),
        ),
        sharedPreferencesProvider.overrideWithValue(prefs),
        examGuardFactoryProvider.overrideWithValue(() => guard = FakeExamGuard()),
      ],
      retry: (_, _) => null,
    );
    addTearDown(container.dispose);
    await tester.pumpWidget(UncontrolledProviderScope(container: container, child: const PiemathApp()));
    await tester.runAsync(() => container.read(sessionProvider.notifier).restore());
    await tester.pumpAndSettle();
    container.read(routerProvider).go(location);
    await settle(tester);
  }

  /// pumpAndSettle биш — шалгалтын таймер секунд тутам frame үүсгэдэг.
  static Future<void> settle(WidgetTester tester, [int frames = 12]) async {
    for (var i = 0; i < frames; i++) {
      await tester.pump(const Duration(milliseconds: 50));
    }
  }

  /// Тестийн төгсгөлд: шалгалтын дэлгэцийг хаах (timer, хамгаалалт цэвэрлэгдэнэ).
  Future<void> close(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 1));
  }
}

Map<String, Object?> fakeMeta({String type = 'DAILY', Object? status, Object? result}) => {
  'id': 't1',
  'title': 'Илтгэгч тэгшитгэл 1',
  'type': type,
  'gradingMode': 'AUTO',
  'timeLimitMin': 40,
  'variantLabel': 'A',
  'problemCount': 2,
  'totalPoints': 2,
  'myResult': result,
  'sessionStatus': status,
};

Map<String, Object?> fakeStart({int? remainingSec = 2400, Map<String, Object?> draft = const {}}) => {
  'test': {'id': 't1', 'title': 'Илтгэгч тэгшитгэл 1', 'variantLabel': 'A', 'gradingMode': 'AUTO', 'timeLimitMin': 40},
  'session': {
    'status': 'IN_PROGRESS',
    'startedAt': '2026-11-01T02:00:00.000Z',
    'remainingSec': remainingSec,
    'leaveCount': 0,
    'draftAnswers': draft,
    'draftStates': <String, Object?>{},
  },
  'problems': [
    {
      'id': 'p1',
      'format': 'CHOICE',
      'statementText': r'$2^{x}=8$ бол $x$-ийн утгыг ол',
      'imageKey': null,
      'points': 1,
      'choiceMode': 'TEXT',
      'choices': [r'$2$', r'$\frac{1}{2}$', r'$3$', r'$-3$', r'$4$'],
      'choiceImages': null,
    },
    {
      'id': 'p2',
      'format': 'FILL_NUMBER',
      'statementText': r'$\log_{2} 32 + \log_{3} 81 = $ [ab]',
      'imageKey': null,
      'points': 1,
      'choiceMode': null,
      'choices': null,
      'choiceImages': null,
    },
  ],
};

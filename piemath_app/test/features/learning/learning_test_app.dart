import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/learning/learning_routes.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';

/// Суралцах feature-ийн дэлгэцийг бодит маршруттай (shell-гүй), mock API-тай зурна.
Future<GoRouter> pumpLearning(
  WidgetTester tester,
  FakeHttp http, {
  required String location,
  Size size = const Size(390, 844),
  bool dark = false,
  List<Override> overrides = const [],
}) async {
  tester.view.physicalSize = size * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    initialLocation: location,
    routes: [
      ...learningRoutes.shell,
      ...learningRoutes.fullscreen,
      GoRoute(path: '/other', builder: (_, _) => const Scaffold(body: Text('өөр дэлгэц'))),
    ],
  );
  addTearDown(router.dispose);
  final container = ProviderContainer(overrides: [...testOverrides(http: http), ...overrides], retry: (_, _) => null);
  addTearDown(container.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(
        routerConfig: router,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        themeMode: dark ? ThemeMode.dark : ThemeMode.light,
      ),
    ),
  );
  await settle(tester);
  return router;
}

/// HTTP-тэй future-ийг widget модонд ачаалуулж дуустал кадр хөдөлгөнө (`pumpAndSettle` анимацид гацаж болно).
Future<void> settle(WidgetTester tester, [int frames = 10]) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 60));
  }
}

Map<String, Object?> mistakeJson({
  String id = 'm1',
  String status = 'NEW',
  String statement = r'$x^2=4$ бол $x$ хэд вэ',
  List<String>? choices = const [r'$1$', r'$2$', r'$3$'],
  String? reason,
  String? note,
  Object? correctAnswer,
  String? solutionOutline,
  String format = 'CHOICE',
  List<String>? answerFields,
  Object? givenAnswer = 0,
}) => {
  'id': id,
  'problem': {
    'id': 'p-$id',
    'statementText': statement,
    'choices': choices,
    'choiceMode': choices == null ? null : 'TEXT',
    'format': format,
    'imageKey': null,
    'answerFields': ?answerFields,
  },
  'givenAnswer': givenAnswer,
  'status': status,
  'retryCount': 0,
  'reason': reason,
  'note': note,
  'testTitle': 'Тест 1',
  'createdAt': '2026-11-01T03:00:00.000Z',
  'nextRetryAt': null,
  'formulas': [
    {'slug': 'sq', 'title': 'Квадрат', 'latex': r'(a+b)^2=a^2+2ab+b^2'},
  ],
  'correctAnswer': ?correctAnswer,
  'solutionOutline': ?solutionOutline,
};

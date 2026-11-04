import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart' show RequestOptions;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/network/network_providers.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/students_admin/application/students_admin_providers.dart';
import 'package:piemath_app/features/students_admin/ui/admin_student_screen.dart';
import 'package:piemath_app/features/students_admin/ui/student_import_screen.dart';
import 'package:piemath_app/features/students_admin/ui/students_admin_screen.dart';
import 'package:piemath_app/features/students_admin/ui/withdrawal_sheet.dart';
import 'package:piemath_app/features/teacher/application/teacher_providers.dart';
import 'package:piemath_app/shared/native/native.dart';
import 'package:piemath_app/shared/payment_status/paid_until_card.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import '../teacher/teacher_harness.dart';
import 'students_admin_fixtures.dart';

class _Session extends SessionController {
  _Session(this._state);

  final SessionState _state;

  @override
  SessionState build() => _state;
}

class _FakeLauncher implements ShareLauncher {
  final shared = <(String, String)>[];

  @override
  Future<bool> shareFile(File file, {required String mimeType, String? subject, Rect? origin}) async {
    shared.add((file.path, mimeType));
    return true;
  }
}

/// Файл бичихгүй (fake async-д IO хийхгүй) — замыг л тэмдэглэнэ; хуваалцах нь жинхэнэ [FileShare.share].
class _FakeFileShare extends FileShare {
  _FakeFileShare(super.client, ShareLauncher launcher) : super(launcher: launcher);

  final downloads = <(String, String?)>[];

  @override
  Future<File> download(String path, {Map<String, Object?>? query, String? fileName}) async {
    downloads.add((path, fileName));
    return File('/nonexistent/piemath_share/${fileName ?? 'file'}');
  }
}

class _FakePicker extends XlsxPicker {
  const _FakePicker(this.file);

  final PickedFile? file;

  @override
  bool get available => true;

  @override
  Future<PickedFile?> pick() async => file;
}

Future<void> _pump(
  WidgetTester tester,
  Widget screen, {
  required FakeHttp http,
  String role = 'ADMIN',
  List<Override> extra = const [],
  Size size = const Size(390, 844),
}) async {
  tester.view.physicalSize = size * 3;
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    routes: [
      GoRoute(path: '/', builder: (_, _) => screen),
      for (final p in ['/app/:a', '/app/:a/:b', '/app/:a/:b/:c', '/app/:a/:b/:c/:d'])
        GoRoute(
          path: p,
          builder: (_, s) => Scaffold(body: Text('ROUTE:${s.uri}')),
        ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testOverrides(http: http),
        sessionProvider.overrideWith(() => _Session(teacherSession(role: role))),
        teacherTodayProvider.overrideWithValue(teacherToday),
        presenceEnabledProvider.overrideWithValue(false),
        paymentTodayProvider.overrideWithValue(teacherToday),
        studentsMonthProvider.overrideWithValue('2026-11'),
        ...extra,
      ],
      retry: (_, _) => null,
      child: MaterialApp.router(debugShowCheckedModeBanner: false, theme: AppTheme.light(), routerConfig: router),
    ),
  );
  await settle(tester);
}

Map<String, Object?> _body(RequestOptions o) => (o.data as Map).cast<String, Object?>();

void main() {
  group('Сурагчдын жагсаалт', () {
    testWidgets('Админ: мөр, төлбөрийн төлөв дүнтэй, ангигүй тэмдэг, хайлт, чип', (tester) async {
      final http = studentsHttp();
      await _pump(tester, const StudentsAdminScreen(), http: http);
      expect(find.text('3 сурагч'), findsOneWidget);
      expect(find.text('Болд Бат'), findsOneWidget);
      expect(find.text('Дутуу 50,000₮'), findsOneWidget);
      expect(find.text('Хэвийн'), findsOneWidget); // Дорж-ийн төлөв
      expect(find.text('Хуваарилаагүй'), findsWidgets);
      expect(find.text('Архив'), findsOneWidget);
      expect(find.textContaining('хуваарилагдаагүй'), findsOneWidget); // анхаарах самбар

      await tester.enterText(find.byType(TextField).first, 'дорж');
      await tester.pump(const Duration(milliseconds: 300));
      await settle(tester);
      expect(find.text('Ганаа Дорж'), findsOneWidget);
      expect(find.text('Болд Бат'), findsNothing);
      expect(http.count('GET', '/users'), 1, reason: 'хайлт сүлжээ дуудахгүй');

      await tester.enterText(find.byType(TextField).first, '');
      await tester.pump(const Duration(milliseconds: 300));
      await settle(tester);
      await tester.tap(find.byKey(const ValueKey('filter:${'unassigned'}')));
      await settle(tester);
      expect(find.text('Сараа Цэцэг'), findsOneWidget);
      expect(find.text('Болд Бат'), findsNothing);
    });

    testWidgets('Админ: ангиар шүүх, архив таб', (tester) async {
      final http = studentsHttp();
      await _pump(tester, const StudentsAdminScreen(), http: http);
      await tester.tap(find.text('Анги'));
      await settle(tester);
      await tester.tap(find.text('10А').last);
      await settle(tester);
      expect(find.text('Анги: 10А'), findsOneWidget);
      expect(find.text('2 сурагч'), findsOneWidget);
      expect(find.text('Сараа Цэцэг'), findsNothing);

      await tester.tap(find.text('Архив'));
      await settle(tester);
      expect(find.text('Архивт 1 сурагч'), findsOneWidget);
      expect(find.text('Архив Номин'), findsOneWidget);
      expect(find.textContaining('Давхар бүртгэл'), findsOneWidget);
      expect(http.requests.last.queryParameters['archived'], 'true');
    });

    testWidgets('Багш: мөнгө, архив, үйлдэл, анхаарах огт үгүй; төлбөрийн хүсэлт явахгүй', (tester) async {
      final http = studentsHttp();
      await _pump(tester, const StudentsAdminScreen(), http: http, role: 'TEACHER');
      expect(find.text('Болд Бат'), findsOneWidget);
      expect(find.textContaining('Дутуу'), findsNothing);
      expect(find.textContaining('₮'), findsNothing);
      expect(find.text('Архив'), findsNothing);
      expect(find.byTooltip('Болд Бат үйлдэл'), findsNothing);
      expect(find.byTooltip('Бусад үйлдэл'), findsNothing);
      expect(find.byTooltip('Шинэ сурагч'), findsNothing);
      expect(http.count('GET', '/payments/outstanding'), 0);
      expect(http.count('GET', '/classrooms/attention-students'), 0);
      expect(http.count('GET', '/staff-capabilities/me'), 0);
    });

    testWidgets('Багш+ санхүүтэй: дутуу дүн харагдана', (tester) async {
      final http = studentsHttp();
      await _pump(tester, const StudentsAdminScreen(), http: http, role: 'TEACHER_PLUS');
      expect(find.text('Дутуу 50,000₮'), findsOneWidget);
      expect(find.byTooltip('Болд Бат үйлдэл'), findsOneWidget);
    });

    testWidgets('Багш+ санхүүгүй: дүн, төлбөрийн хүсэлт үгүй; удирдлага хэвээр', (tester) async {
      final http = studentsHttp(finance: false);
      await _pump(tester, const StudentsAdminScreen(), http: http, role: 'TEACHER_PLUS');
      expect(find.text('Болд Бат'), findsOneWidget);
      expect(find.textContaining('Дутуу'), findsNothing);
      expect(http.count('GET', '/payments/outstanding'), 0);
      expect(find.byTooltip('Болд Бат үйлдэл'), findsOneWidget);
    });

    Future<void> archiveBat(WidgetTester tester) async {
      await tester.tap(find.byTooltip('Болд Бат үйлдэл'));
      await settle(tester);
      await tester.tap(find.text('Тооцоогүй архивлах'));
      await settle(tester);
      await tester.enterText(find.widgetWithText(TextField, 'Эсвэл бичих'), 'Давхар бүртгэл');
      await tester.tap(find.widgetWithText(FilledButton, 'Архивлах'));
      await settle(tester);
    }

    testWidgets('архивлах → «Буцаах»: мөр буцна, серверт ЮУ Ч илгээхгүй', (tester) async {
      final http = studentsHttp()..json('POST', '/users/s1/archive', {'id': 's1'});
      await _pump(tester, const StudentsAdminScreen(), http: http);
      await archiveBat(tester);
      expect(find.text('Болд Бат'), findsNothing);
      expect(find.text('2 сурагч'), findsOneWidget);
      await tester.tap(find.text('Буцаах'));
      await settle(tester);
      expect(find.text('Болд Бат'), findsOneWidget);
      expect(http.count('POST', '/users/s1/archive'), 0);
      await tester.pump(const Duration(seconds: 6));
      expect(http.count('POST', '/users/s1/archive'), 0);
    });

    testWidgets('архивлах → хугацаа дуусвал серверт шалтгаантай илгээнэ', (tester) async {
      final http = studentsHttp()..json('POST', '/users/s1/archive', {'id': 's1'});
      await _pump(tester, const StudentsAdminScreen(), http: http);
      await archiveBat(tester);
      await tester.pump(const Duration(seconds: 6));
      await settle(tester);
      expect(http.count('POST', '/users/s1/archive'), 1);
      expect(_body(http.requests.lastWhere((r) => r.path == '/users/s1/archive')), {'reason': 'Давхар бүртгэл'});
      expect(find.text('Болд Бат'), findsNothing);
      expect(find.text('Ганаа Дорж'), findsOneWidget);
    });

    testWidgets('сервер архивлахыг татгалзвал мөр буцаж, мессеж харагдана', (tester) async {
      final http = studentsHttp()
        ..error('POST', '/users/s1/archive', 400, 'Сурагчийн архивын төлөв өөрчлөгдсөн байна.');
      await _pump(tester, const StudentsAdminScreen(), http: http);
      await archiveBat(tester);
      await tester.pump(const Duration(seconds: 6));
      await settle(tester);
      expect(find.text('Болд Бат'), findsOneWidget);
      expect(find.textContaining('архивын төлөв өөрчлөгдсөн'), findsOneWidget);
    });

    testWidgets('бүртгэлийн Excel: эрхтэй татаж, хуваалцах цонх (хуурамч)', (tester) async {
      final http = studentsHttp();
      final launcher = _FakeLauncher();
      late _FakeFileShare share;
      await _pump(
        tester,
        const StudentsAdminScreen(),
        http: http,
        extra: [
          fileShareProvider.overrideWith((ref) => share = _FakeFileShare(ref.watch(apiClientProvider), launcher)),
        ],
      );
      await tester.tap(find.byTooltip('Бусад үйлдэл'));
      await settle(tester);
      expect(find.text('Excel импорт'), findsOneWidget);
      await tester.tap(find.text('Бүртгэл Excel татах'));
      await settle(tester);
      expect(share.downloads.single.$1, '/students/export.xlsx');
      expect(share.downloads.single.$2, startsWith('burtgel-'));
      final (path, mime) = launcher.shared.single;
      expect(path, endsWith('.xlsx'));
      expect(mime, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    testWidgets('Багш+: Excel татна, импорт цэс харагдахгүй', (tester) async {
      await _pump(tester, const StudentsAdminScreen(), http: studentsHttp(), role: 'TEACHER_PLUS');
      await tester.tap(find.byTooltip('Бусад үйлдэл'));
      await settle(tester);
      expect(find.text('Бүртгэл Excel татах'), findsOneWidget);
      expect(find.text('Excel импорт'), findsNothing);
    });
  });

  group('Excel импорт', () {
    final picked = PickedFile(name: 'burtgel.xlsx', bytes: Uint8List.fromList(utf8.encode('xlsx')));

    FakeHttp importHttp() => FakeHttp()
      ..json('POST', '/users/students/import/preview', {
        'previewId': '00000000-0000-4000-8000-000000000001',
        'rows': [
          {
            'rowNumber': 2,
            'lastName': 'Болд',
            'firstName': 'Бат',
            'phone': '99110001',
            'classroomLabel': '10А',
            'status': 'NEW',
          },
          {'rowNumber': 3, 'lastName': 'Ганаа', 'firstName': 'Дорж', 'phone': '99110002', 'status': 'UPDATE'},
          {
            'rowNumber': 4,
            'lastName': 'Сараа',
            'firstName': '',
            'phone': '',
            'status': 'ERROR',
            'reason': 'Утас дутуу',
          },
        ],
      })
      ..on('POST', '/users/students/import/commit', (o) {
        final n = (_body(o)['rowNumbers']! as List).length;
        return FakeResponse({'imported': n});
      });

    testWidgets('файл → урьдчилан харах → алдаагүй мөрийг хадгалах', (tester) async {
      final http = importHttp();
      await _pump(
        tester,
        const StudentImportScreen(),
        http: http,
        extra: [xlsxPickerProvider.overrideWithValue(_FakePicker(picked))],
      );
      await tester.tap(find.byKey(const ValueKey('import-pick')));
      await settle(tester);
      expect(find.text('burtgel.xlsx'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('import-inspect')));
      await settle(tester);
      expect(find.textContaining('Шинэ 1'), findsOneWidget);
      expect(find.text('Утас дутуу'), findsOneWidget);
      expect(find.text('2 мөр хадгалах'), findsOneWidget);

      // Алдаатай мөрийг сонгох боломжгүй, нэгийг нь болиулна → 1 мөр.
      final errorTile = tester.widget<CheckboxListTile>(find.byKey(const ValueKey('row:4')));
      expect(errorTile.onChanged, isNull);
      await tester.tap(find.byKey(const ValueKey('row:3')));
      await settle(tester);
      expect(find.text('1 мөр хадгалах'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('row:3')));
      await settle(tester);

      await tester.tap(find.byKey(const ValueKey('import-commit')));
      await settle(tester);
      final commit = http.requests.lastWhere((r) => r.path.endsWith('/commit'));
      expect(_body(commit), {
        'previewId': '00000000-0000-4000-8000-000000000001',
        'rowNumbers': [2, 3],
      });
      expect(find.text('2 мөр хадгаллаа'), findsOneWidget);
    });

    testWidgets('xlsx биш файлыг хүлээж авахгүй', (tester) async {
      await _pump(
        tester,
        const StudentImportScreen(),
        http: importHttp(),
        extra: [xlsxPickerProvider.overrideWithValue(_FakePicker(PickedFile(name: 'a.pdf', bytes: Uint8List(3))))],
      );
      await tester.tap(find.byKey(const ValueKey('import-pick')));
      await settle(tester);
      expect(find.text('Зөвхөн .xlsx файл сонгоно уу'), findsOneWidget);
    });

    testWidgets('файл сонгох сан байхгүй үед тайлбар', (tester) async {
      await _pump(tester, const StudentImportScreen(), http: importHttp());
      await tester.tap(find.byKey(const ValueKey('import-pick')));
      await settle(tester);
      expect(find.textContaining('файл сонгох боломж хараахан алга'), findsOneWidget);
    });

    testWidgets('Багш+-д импорт нээгдэхгүй', (tester) async {
      final http = importHttp();
      await _pump(tester, const StudentImportScreen(), http: http, role: 'TEACHER_PLUS');
      expect(find.text('Excel импорт зөвхөн Админд'), findsOneWidget);
      expect(find.byKey(const ValueKey('import-pick')), findsNothing);
    });
  });

  group('Сурагчийн хуудас (удирдлага)', () {
    FakeHttp detailHttp() => studentsHttp()
      ..json('GET', '/users/s1', {
        ...studentJson('s1', first: 'Бат', last: 'Болд', code: 'SIE-26-M-0001', classId: 'c1', className: '10А'),
        'classHistory': <Object?>[],
      })
      ..json('GET', '/payments/student/s1', {
        'tuitionPlan': 'MONTHLY',
        'summary': {'expected': 900000, 'totalPaid': 850000, 'outstanding': 50000},
        'payments': [
          {'id': 'p1', 'amount': 300000, 'method': 'BANK', 'status': 'CONFIRMED', 'createdAt': '2026-09-02T02:00:00Z'},
        ],
      });

    testWidgets('Админ: төлөв, «Анги солих», «Төлбөр» таб', (tester) async {
      await _pump(tester, const AdminStudentScreen(studentId: 's1'), http: detailHttp());
      expect(find.text('Болд Бат'), findsWidgets);
      expect(find.text('10А'), findsWidgets);
      expect(find.text('Үлдэгдэл 50,000₮'), findsOneWidget);
      expect(find.text('Анги солих'), findsOneWidget);
      expect(find.text('Төлбөр'), findsOneWidget);
      await tester.tap(find.text('Анги солих'));
      await settle(tester);
      expect(find.text('Шинэ анги'), findsOneWidget);
    });

    testWidgets('Багш: удирдлагын мөр, төлбөрийн таб үгүй', (tester) async {
      final http = detailHttp();
      await _pump(
        tester,
        const AdminStudentScreen(studentId: 's1', name: 'Болд Бат'),
        http: http,
        role: 'TEACHER',
      );
      expect(find.text('Анги солих'), findsNothing);
      expect(find.text('Төлбөр'), findsNothing);
      expect(find.textContaining('₮'), findsNothing);
      expect(http.count('GET', '/payments/student/s1'), 0);
    });
  });

  group('Сургалтаас хасах', () {
    testWidgets('серверийн тооцоог харуулж, шалтгаантай үед л хадгална', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/tuition/withdrawal/preview', withdrawalPreviewJson(refund: 200000))
        ..json('POST', '/tuition/withdrawal', {'refund': 200000});
      int? result;
      await _pump(
        tester,
        Builder(
          builder: (ctx) => Scaffold(
            body: Center(
              child: FilledButton(
                onPressed: () async => result = await WithdrawalSheet.open(
                  ctx,
                  studentId: 's1',
                  name: 'Болд Бат',
                  today: UbDateTime(2026, 11, 3),
                ),
                child: const Text('Нээх'),
              ),
            ),
          ),
        ),
        http: http,
      );
      await tester.tap(find.text('Нээх'));
      await settle(tester);
      expect(find.text('200,000₮'), findsWidgets);
      expect(http.requests.first.queryParameters['leftOn'], '2026-11-03');
      final submit = find.byKey(const ValueKey('withdraw-submit'));
      final sheetScroll = find.byType(Scrollable).last;
      await tester.scrollUntilVisible(submit, 300, scrollable: sheetScroll);
      expect(tester.widget<ButtonStyleButton>(submit).onPressed, isNull, reason: 'шалтгаангүй');
      await tester.scrollUntilVisible(find.widgetWithText(ActionChip, 'Төлбөр'), -300, scrollable: sheetScroll);
      await tester.tap(find.widgetWithText(ActionChip, 'Төлбөр'));
      await settle(tester);
      await tester.scrollUntilVisible(submit, 300, scrollable: sheetScroll);
      await tester.tap(submit);
      await settle(tester);
      expect(_body(http.requests.last), {
        'studentId': 's1',
        'leftOn': '2026-11-03',
        'countFrom': '2026-09-01',
        'exclude': <Object?>[],
        'reason': 'Төлбөр',
      });
      expect(result, 200000);
    });
  });
}

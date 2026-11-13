import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/features/book_money/book_money.dart';
import 'package:piemath_app/features/book_money/book_money_routes.dart';
import 'package:piemath_app/features/book_money/data/book_money_models.dart';
import 'package:piemath_app/features/book_money/domain/book_money_logic.dart';

import '../../helpers/fake_http.dart';
import '../paper_exams/internal_harness.dart';
import '../student_harness.dart';

// Зохиомол өгөгдөл — жинхэнэ сурагч, багшийн нэр биш.
Map<String, Object?> _person(String id, String first, {String last = 'Тест', String role = 'TEACHER'}) => {
  'id': id,
  'firstName': first,
  'lastName': last,
  'role': role,
};

Map<String, Object?> _studentBooks({Map<String, Object?>? e1Payment}) => {
  'student': {'id': 's1', 'firstName': 'Болд', 'lastName': 'Дорж'},
  'classrooms': [
    {'id': 'c1', 'name': '12-5', 'current': true},
    {'id': 'c0', 'name': '11-2', 'current': false},
  ],
  'books': [
    {'key': 'E1', 'title': 'E-1', 'suggestedAmount': 40000, 'payment': e1Payment},
    {'key': 'E2', 'title': 'E-2', 'suggestedAmount': null, 'payment': null},
    {'key': 'SHEET1', 'title': 'Нэгдсэн шалгалт 1', 'suggestedAmount': 3000, 'payment': null},
  ],
  'history': [
    if (e1Payment != null) {...e1Payment, 'title': 'E-1'},
  ],
};

Map<String, Object?> _paid({String id = 'p1'}) => {
  'id': id,
  'studentId': 's1',
  'bookKey': 'E1',
  'status': 'PAID',
  'amount': 40000,
  'note': null,
  'classroom': {'id': 'c1', 'name': '12-5'},
  'collectedBy': _person('t2', 'Сараа', role: 'TEACHER_PLUS'),
  'createdBy': _person('u1', 'Ану'),
  'createdAt': '2026-11-12T03:00:00.000Z',
  'voidedAt': null,
  'voidedBy': null,
};

Map<String, Object?> _collectors() => {
  'me': 'u1',
  'staff': [_person('u1', 'Ану'), _person('t2', 'Сараа', role: 'TEACHER_PLUS'), _person('t3', 'Ану', last: 'Батаа')],
};

Map<String, Object?> _dashboard() => {
  'seeAllMoney': true,
  'books': [
    {
      'key': 'E1',
      'title': 'E-1',
      'noClassPaid': 1,
      'paid': 12,
      'collected': 480000,
      'classes': [
        {
          'classroomId': 'c1',
          'name': '12-5',
          'classArchived': false,
          'checkId': 'k1',
          'hidden': false,
          'price': 40000,
          'openedAt': '2026-11-12T00:00:00.000Z',
          'total': 10,
          'paidHere': 6,
          'paidElsewhere': 1,
          'skipped': 2,
          'left': 1,
          'formerPaid': 1,
          'collected': 280000,
        },
        {
          'classroomId': 'c9',
          'name': '10-1',
          'classArchived': true,
          'checkId': null,
          'hidden': false,
          'price': null,
          'total': 0,
          'paidHere': 0,
          'paidElsewhere': 0,
          'skipped': 0,
          'left': 0,
          'formerPaid': 2,
          'collected': 80000,
        },
      ],
    },
  ],
  'collectors': [
    {
      'person': _person('t2', 'Сараа', role: 'TEACHER_PLUS'),
      'count': 7,
      'sum': 280000,
      'byBook': [
        {'bookKey': 'E1', 'title': 'E-1', 'count': 7, 'sum': 280000},
      ],
    },
  ],
};

Object? _body(FakeHttp http, String method, String path) {
  final r = http.requests.lastWhere((r) => r.method == method && r.path == path);
  return r.data is String ? jsonDecode(r.data as String) : r.data;
}

void main() {
  group('логик', () {
    test('ангийн явц: авахгүй хүүхэд хуваарьт орохгүй, өөр ангид төлсөн нь өгсөнд орно', () {
      final row = BookClassRow.fromJson((((_dashboard()['books']! as List).first as Map)['classes'] as List).first);
      final p = classProgress(row);
      expect(p.due, 8);
      expect(p.done, 7);
      expect(p.pct, 88);
      expect(classProgress(const BookClassRow(classroomId: 'x', name: '', classArchived: false)).pct, 0);
    });

    test('багшийн товч: ижил нэртэй бол овгийн үсэгтэй, Багш+ «+», архивлагдсан багш эхэнд', () {
      final c = BookCollectors.fromJson(_collectors());
      final chips = collectorChips(c.staff, null);
      expect(chips.map((x) => x.label), ['Т. Ану', 'Сараа+', 'Б. Ану']);
      final old = BookPerson.fromJson(_person('t9', 'Гарсан'));
      expect(collectorChips(c.staff, old).first.label, 'Гарсан');
      expect(collectorChips(c.staff, c.staff[1]).length, 3);
    });

    test('дүнгийн бичвэр: тоо биш тэмдэгт, эхний тэг, 7 орон', () {
      expect(parseAmountInput('40,000'), 40000);
      expect(parseAmountInput('007'), 7);
      expect(parseAmountInput(''), isNull);
      expect(parseAmountInput('123456789'), 1234567);
      expect(amountError(null), 'Дүнгээ оруулна уу');
      expect(amountError(1000001), contains('1,000,000₮'));
      expect(amountError(40000), isNull);
    });

    test('тэмдэглэгээний бие: профайл ба ангийн чек', () {
      const paid = BookMarkInput.paid(amount: 40000, collectedById: 't2', classroomId: null, setClassroom: true);
      expect(paid.toJson(), {'status': 'PAID', 'amount': 40000, 'collectedById': 't2', 'classroomId': null});
      expect(paid.toCheckMarkBody(), {'checked': true, 'amount': 40000, 'collectedById': 't2', 'note': null});
      expect(const BookMarkInput.skipped(note: 'өөрөө авсан').toCheckMarkBody(), {
        'checked': false,
        'skipped': true,
        'note': 'өөрөө авсан',
      });
      expect(const BookMarkInput.none().toJson(), {'status': 'NONE'});
      expect(const BookMarkInput.none().toCheckMarkBody(), {'checked': false});
    });

    test('загвар: сурагчийн ном, түүх, идэвхтэй анги', () {
      final s = StudentBooks.fromJson(_studentBooks(e1Payment: _paid()));
      expect(s.name, 'Дорж Болд');
      expect(s.currentClassroomId, 'c1');
      expect(s.books.first.payment!.paid, isTrue);
      expect(s.books.first.payment!.collectedBy!.display, 'Т. Сараа+');
      expect(paymentFacts(s.books.first.payment!), ['12-5 анги', 'Т. Сараа+ авсан', null]);
      expect(quickMarks(s.books[0]), isFalse);
      expect(quickMarks(s.books[1]), isFalse);
      expect(quickMarks(s.books[2]), isTrue);
      expect(s.history.single.title, 'E-1');
    });

    test('маршрут: /app/book-money бүрхүүл дотор', () {
      expect([for (final r in bookMoneyRoutes.shell) (r as GoRoute).path], ['/app/book-money']);
      expect(bookMoneyRoutes.fullscreen, isEmpty);
    });
  });

  group('самбар', () {
    testWidgets('ном бүрээр анги, багш тус бүрийн хураасан, ангид дарвал ангийн самбар', (tester) async {
      final http = FakeHttp()..json('GET', '/book-payments/dashboard', _dashboard());
      await pumpInternal(tester, http: http, location: '/app/book-money');
      expect(find.text('Номын мөнгө'), findsOneWidget);
      expect(find.text('Багш тус бүрийн хураасан'), findsOneWidget);
      expect(find.text('Т. Сараа+'), findsOneWidget);
      expect(find.textContaining('7/8 өгсөн, 88%'), findsOneWidget);
      expect(find.text('1 үлдсэн'), findsOneWidget);
      expect(find.textContaining('Чек нээгээгүй'), findsOneWidget);
      await tester.tap(find.text('12-5'));
      await settle(tester);
      expect(find.text('ROUTE:/app/classes/c1'), findsOneWidget);
    });

    testWidgets('320dp утсанд халихгүй: самбар, «Ном» таб, дэлгэрэнгүй', (tester) async {
      const narrow = Size(320, 640);
      final http = FakeHttp()
        ..json('GET', '/book-payments/dashboard', _dashboard())
        ..json('GET', '/book-payments/students/s1', _studentBooks(e1Payment: _paid()))
        ..json('GET', '/book-payments/collectors', _collectors());
      await pumpInternal(tester, http: http, location: '/app/book-money', size: narrow);
      expect(find.text('E-1'), findsOneWidget);
      await pumpInternal(
        tester,
        http: http,
        home: const StudentBooksTab(studentId: 's1'),
        size: narrow,
      );
      await tester.tap(find.byKey(const Key('book-quick-E1')));
      await settle(tester);
      expect(find.text('Мөнгийг авсан багш'), findsOneWidget);
    });

    testWidgets('хоосон: чек нээгдээгүй', (tester) async {
      final http = FakeHttp()..json('GET', '/book-payments/dashboard', {'books': <Object?>[], 'collectors': <Object?>[]});
      await pumpInternal(tester, http: http, location: '/app/book-money');
      expect(find.text('Номын чек нээгдээгүй байна'), findsOneWidget);
    });
  });

  group('сурагчийн «Ном» таб', () {
    testWidgets('шууд товч: санал болгох үнээр «өгсөн», үнэгүй бол дэлгэрэнгүй нээгдэнэ', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/book-payments/students/s1', _studentBooks())
        ..json('GET', '/book-payments/collectors', _collectors())
        ..json('PUT', '/book-payments/students/s1/books/SHEET1', {..._paid(), 'bookKey': 'SHEET1', 'amount': 3000});
      await pumpInternal(
        tester,
        http: http,
        home: const StudentBooksTab(studentId: 's1'),
      );
      expect(find.text('Ном, шалгалтын хуудас'), findsOneWidget);
      expect(find.text('Өгөөгүй'), findsNWidgets(3));

      await tester.tap(find.byKey(const Key('book-quick-SHEET1')));
      await settle(tester);
      expect(_body(http, 'PUT', '/book-payments/students/s1/books/SHEET1'), {'status': 'PAID', 'amount': 3000});

      // Үнэгүй ном — дэлгэрэнгүй хуудас
      await tester.tap(find.byKey(const Key('book-quick-E2')));
      await settle(tester);
      expect(find.text('Мөнгийг авсан багш'), findsOneWidget);
      expect(find.text('Т. Ану'), findsOneWidget);
    });

    testWidgets('дэлгэрэнгүй: багш, дүн, анги сонгоод «Батлах»', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/book-payments/students/s1', _studentBooks())
        ..json('GET', '/book-payments/collectors', _collectors())
        ..json('PUT', '/book-payments/students/s1/books/E1', _paid());
      await pumpInternal(
        tester,
        http: http,
        home: const StudentBooksTab(studentId: 's1'),
      );
      await tester.tap(find.byTooltip('E-1, дэлгэрэнгүй: авсан багш, дүн'));
      await settle(tester);
      expect(tester.widget<TextField>(find.byKey(const Key('book-amount'))).controller!.text, '40,000');
      await tester.tap(find.text('Сараа+'));
      await tester.enterText(find.byKey(const Key('book-amount')), '35000');
      await tester.enterText(find.byKey(const Key('book-note')), '  хоёр   хувааж ');
      await tester.tap(find.byKey(const Key('book-confirm')));
      await settle(tester);
      expect(_body(http, 'PUT', '/book-payments/students/s1/books/E1'), {
        'status': 'PAID',
        'amount': 35000,
        'collectedById': 't2',
        'classroomId': 'c1',
        'note': 'хоёр хувааж',
      });
      expect(find.text('Мөнгийг авсан багш'), findsNothing);
    });

    testWidgets('тэмдэглэгдсэн ном: «Арилгах», серверийн алдаа хуудсан дотор', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/book-payments/students/s1', _studentBooks(e1Payment: _paid()))
        ..json('GET', '/book-payments/collectors', _collectors())
        ..error('PUT', '/book-payments/students/s1/books/E1', 400, 'Мөнгө авсан багшийг зөв сонгоно уу');
      await pumpInternal(
        tester,
        http: http,
        home: const StudentBooksTab(studentId: 's1'),
      );
      expect(find.text('Түүх'), findsOneWidget);
      await tester.tap(find.byKey(const Key('book-quick-E1')));
      await settle(tester);
      await tester.tap(find.text('Арилгах'));
      await settle(tester);
      expect(_body(http, 'PUT', '/book-payments/students/s1/books/E1'), {'status': 'NONE'});
      expect(find.text('Мөнгө авсан багшийг зөв сонгоно уу'), findsOneWidget);
    });

    testWidgets('өөр ангид төлсөн (ангийн чекээс): засахгүй, сурагчийн хуудас руу', (tester) async {
      final http = FakeHttp()..json('GET', '/book-payments/collectors', _collectors());
      await pumpInternal(
        tester,
        http: http,
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () => showBookMarkSheet(
              context,
              target: BookSheetTarget(
                studentId: 's1',
                studentName: 'Д. Болд',
                bookTitle: 'E-1',
                price: 40000,
                status: BookStatus.paid,
                amount: 40000,
                collectedBy: BookPerson.fromJson(_person('t2', 'Сараа', role: 'TEACHER_PLUS')),
                lockedClassName: '11-2',
              ),
              onSave: (_) async {},
            ),
            child: const Text('нээх'),
          ),
        ),
      );
      await tester.tap(find.text('нээх'));
      await settle(tester);
      expect(find.textContaining('11-2 ангид байхдаа төлсөн'), findsOneWidget);
      expect(find.text('Батлах'), findsNothing);
      await tester.tap(find.text('Сурагчийн хуудаснаас засах'));
      await settle(tester);
      expect(find.text('ROUTE:/app/students/s1'), findsOneWidget);
    });
  });

  group('ангийн номын чек нээх', () {
    testWidgets('нээсэн ном идэвхгүй, үнэгүй бол алдаа, хуудасны төрөл серверт', (tester) async {
      Object? created;
      final http = FakeHttp()
        ..json('POST', '/classrooms/c1/checks', {'id': 'k2', 'title': 'Нэгдсэн шалгалт 2', 'bookKey': 'SHEET2'});
      await pumpInternal(
        tester,
        http: http,
        role: UserRole.teacher,
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () async =>
                created = await showNewBookCheckSheet(context, classroomId: 'c1', usedBookKeys: {'E1'}),
            child: const Text('нээх'),
          ),
        ),
      );
      await tester.tap(find.text('нээх'));
      await settle(tester);
      final e1 = tester.widget<ChoiceChip>(find.byKey(const Key('book-kind-E1')));
      expect(e1.onSelected, isNull);
      await tester.tap(find.byKey(const Key('book-kind-SHEET')));
      await settle(tester);
      await tester.tap(find.byKey(const Key('book-check-open')));
      await settle(tester);
      expect(find.text('Үнээ оруулна уу'), findsOneWidget);
      expect(http.count('POST', '/classrooms/c1/checks'), 0);
      await tester.enterText(find.byKey(const Key('book-check-price')), '3000');
      await tester.tap(find.byKey(const Key('book-check-open')));
      await settle(tester);
      expect(_body(http, 'POST', '/classrooms/c1/checks'), {'bookKey': 'SHEET', 'amount': 3000});
      expect((created as Map)['id'], 'k2');
    });
  });
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/book_money/book_money.dart';
import 'package:piemath_app/features/paper_exams/paper_exams.dart';
import 'package:piemath_app/features/teacher/ui/student_screen.dart';

import '../../helpers/fake_http.dart';
import 'teacher_harness.dart';

// Давалгаа 6-ийн залгаас: сурагчийн хуудасны «Ном» таб (вэбийн `StudentProgress.tsx`-ийн `books`, бүх
// ажилтан). Нэгдсэн шалгалтын дүн ажилтны хуудсанд байхгүй (вэбд ч байхгүй). Зохиомол өгөгдөл.

Map<String, Object?> _books() => {
  'student': {'id': 's1', 'firstName': 'Болд', 'lastName': 'Дорж'},
  'classrooms': [
    {'id': 'c1', 'name': '12-5', 'current': true},
  ],
  'books': [
    {'key': 'E1', 'title': 'E-1', 'suggestedAmount': 40000, 'payment': null},
  ],
  'history': <Object?>[],
};

List<String> _tabLabels(WidgetTester tester) => [
  for (final t in tester.widgetList<Tab>(find.byType(Tab))) t.text ?? '',
];

void main() {
  testWidgets('«Ном» таб «Сэдэв хөтөлбөр»-ийн дараа, Багшид ч харагдана, өөрөө ачаална', (tester) async {
    final http = FakeHttp()..json('GET', '/book-payments/students/s1', _books());
    await pumpTeacher(
      tester,
      const StudentScreen(studentId: 's1', name: 'Д. Болд'),
      http: http,
    );
    final labels = _tabLabels(tester);
    expect(labels.indexOf('Ном'), labels.indexOf('Сэдэв хөтөлбөр') + 1);
    expect(labels.last, 'Мэдээлэл');
    expect(labels, isNot(contains('Нэгдсэн шалгалт')));
    await tester.ensureVisible(find.text('Ном'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ном'));
    await settle(tester, frames: 20);
    expect(find.byType(StudentBooksTab), findsOneWidget);
    expect(find.byType(StudentPaperExams), findsNothing);
    expect(http.count('GET', '/book-payments/students/s1'), 1);
    expect(find.text('E-1'), findsWidgets);
  });

  testWidgets('удирдлагын нэмэлт таб «Мэдээлэл»-ийн өмнө, «Гарсан тооцоо» сүүлээсээ 2 дахь хэвээр', (tester) async {
    await pumpTeacher(
      tester,
      const StudentScreen(
        studentId: 's1',
        extraTabs: [StudentExtraTab('Төлбөр', SizedBox()), StudentExtraTab('Гарсан тооцоо', SizedBox())],
      ),
      http: FakeHttp(),
      session: teacherSession(role: 'ADMIN'),
    );
    final labels = _tabLabels(tester);
    expect(labels.where((l) => l == 'Ном'), hasLength(1));
    expect(labels.sublist(labels.length - 3), ['Төлбөр', 'Гарсан тооцоо', 'Мэдээлэл']);
  });
}

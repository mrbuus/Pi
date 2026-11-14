// Зохиомол өгөгдөл (жинхэнэ сурагч, ажилтан биш). Дүн нь серверийн хариу — тест юу ч тооцохгүй.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/tuition/application/tuition_providers.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';

final tuitionExtra = <Override>[tuitionTodayProvider.overrideWithValue(UbDateTime(2026, 11, 3))];

/// `finance.manage` бүх ангид (Багш+-ын байнгын эрх).
const capsWithFinance = {
  'administrator': false,
  'grants': [
    {'id': 'implicit:finance.manage', 'capability': 'finance.manage', 'scopeKey': '', 'expiresAt': null},
  ],
};

const capsWithoutFinance = {
  'administrator': false,
  'grants': [
    {'id': 'g1', 'capability': 'payroll.view', 'scopeKey': '', 'expiresAt': null},
  ],
};

const previewExplanation = [
  'Сарын төлбөр 350,000₮, сард 16 хичээл, 1 хичээл 21,875₮',
  'Бүтэн сар: 2 × 350,000₮',
  'Гарсан сар: 2 хичээлээс 1 тоологдсон → 21,875₮',
  'Суусан: 721,875₮',
  'Төлсөн: 1,050,000₮',
  'Буцаах: 328,125₮',
];

Map<String, Object?> previewJson({List<String> warnings = const [], Map<String, Object?>? plan}) => {
  'student': {'id': 's1', 'firstName': 'Болд', 'lastName': 'Тестийн'},
  'classroom': {'id': 'c1', 'name': '12Б'},
  'joinedOn': '2026-09-01',
  'leftOn': '2026-11-03',
  'plan': plan ?? {'kind': 'MONTHLY', 'autoFull': false, 'settled': false, 'price': 350000},
  'calculation': {
    'totalLessonDays': 2,
    'attendedLessonDays': 1,
    'dailyRate': 21875,
    'owed': 721875,
    'totalPaid': 1050000,
    'refundAmount': 328125,
    'shortfall': 0,
    'warnings': warnings,
  },
  'explanation': previewExplanation,
};

Map<String, Object?> refundJson({
  String id = 'r1',
  String status = 'DRAFT',
  String firstName = 'Болд',
  Object? warnings,
  String? cancelReason,
  String? paymentMethod,
  bool detail = false,
}) => {
  'id': id,
  'studentId': 's1',
  'classroomId': 'c1',
  'leftOn': '2026-11-03T00:00:00.000Z',
  'totalLessonDays': 2,
  'attendedLessonDays': 1,
  'dailyRate': 21875,
  'owed': 721875,
  'totalPaid': 1050000,
  'refundAmount': 328125,
  'shortfall': 0,
  'status': status,
  'warnings': warnings,
  'note': null,
  'paymentMethod': paymentMethod,
  'createdAt': '2026-11-03T04:00:00.000Z',
  'updatedAt': '2026-11-03T04:00:00.000Z',
  'approvedAt': status == 'APPROVED' || status == 'PAID' ? '2026-11-03T05:00:00.000Z' : null,
  'paidAt': status == 'PAID' ? '2026-11-03T06:00:00.000Z' : null,
  'cancelledAt': status == 'CANCELLED' ? '2026-11-03T06:00:00.000Z' : null,
  'cancelReason': cancelReason,
  'student': {'id': 's1', 'firstName': firstName, 'lastName': 'Тестийн'},
  'classroom': {'id': 'c1', 'name': '12Б'},
  if (detail) ...{
    'createdBy': {'id': 'u2', 'firstName': 'Сараа', 'lastName': 'Ажилтан', 'role': 'TEACHER_PLUS'},
    'approvedBy': null,
    'paidBy': null,
    'cancelledBy': null,
  },
};

/// Хүсэлтийн query-ийн утга.
String? queryOf(FakeHttp h, String path, String key) =>
    h.requests.lastWhere((r) => r.path == path).queryParameters[key]?.toString();

/// Тестийн дэлгэц (утас).
Future<void> pumpTuition(WidgetTester tester, Widget screen, {required FakeHttp http, required String role}) =>
    pumpM7(tester, screen, http: http, session: signedInAs(role), extra: tuitionExtra);

/// Товч (FilledButton.icon гэх мэт дэд төрлийг ч олно).
Finder buttonWith(String label) =>
    find.ancestor(of: find.text(label), matching: find.byWidgetPredicate((w) => w is ButtonStyleButton));

// Зохиомол өгөгдөл (жинхэнэ сурагч биш).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';

Map<String, Object?> passJson({
  String id = 'p1',
  String name = 'Сарын эрх',
  int days = 30,
  int? price = 50000,
  bool active = true,
  Object? scope,
  int holders = 2,
}) => {
  'id': id,
  'name': name,
  'durationDays': days,
  'price': price,
  'active': active,
  'scope': scope ?? {'all': true},
  'holdersCount': holders,
};

Map<String, Object?> holderJson({
  String id = 'up1',
  String firstName = 'Болд',
  bool active = true,
  String? code = 'B27120001',
}) => {
  'id': id,
  'startsAt': '2026-11-01T02:00:00.000Z',
  'expiresAt': '2026-12-01T02:00:00.000Z',
  'active': active,
  'user': {'id': 'u-$id', 'firstName': firstName, 'lastName': 'Тестийн', 'studentCode': code},
};

Future<void> pumpPasses(WidgetTester tester, Widget screen, {required FakeHttp http, String role = 'ADMIN'}) =>
    pumpM7(tester, screen, http: http, session: signedInAs(role));

Finder buttonWith(String label) =>
    find.ancestor(of: find.text(label), matching: find.byWidgetPredicate((w) => w is ButtonStyleButton));

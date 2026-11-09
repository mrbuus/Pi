import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/features/finance/finance_routes.dart';

void main() {
  test('маршрут: санхүү ба тулгалт бүрхүүл дотор', () {
    expect([for (final r in financeRoutes.shell) (r as GoRoute).path], ['/app/admin/finance', '/app/admin/reconcile']);
    expect(financeRoutes.public, isEmpty);
    expect(financeRoutes.fullscreen, isEmpty);
  });
}

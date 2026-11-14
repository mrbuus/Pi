import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/features/passes/passes_routes.dart';

void main() {
  test('маршрут: жагсаалт ба дэлгэрэнгүй бүрхүүл дотор', () {
    expect([for (final r in passesRoutes.shell) (r as GoRoute).path], ['/app/admin/passes', '/app/admin/passes/:id']);
    expect(passesRoutes.public, isEmpty);
    expect(passesRoutes.fullscreen, isEmpty);
  });
}

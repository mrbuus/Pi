import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/main.dart';

void main() {
  testWidgets('апп асна', (tester) async {
    await tester.pumpWidget(const PiemathApp());
    expect(find.text('Piemath'), findsOneWidget);
  });
}

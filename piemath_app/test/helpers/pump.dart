import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/theme.dart';

/// Widget-ийг апп-ын theme-тэй `MaterialApp` дотор зурна.
Future<void> pumpThemed(
  WidgetTester tester,
  Widget child, {
  bool dark = false,
  Size size = const Size(390, 844),
}) async {
  tester.view.physicalSize = size * 3;
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: dark ? ThemeMode.dark : ThemeMode.light,
      home: Scaffold(body: child),
    ),
  );
}

/// Golden-оос өмнө: `Image.asset` зэрэг асинхрон зургийг жинхэнээр ачаалж дуустал хүлээнэ.
Future<void> precacheImages(WidgetTester tester) async {
  await tester.runAsync(() async {
    for (final element in find.byType(Image).evaluate()) {
      final image = element.widget as Image;
      await precacheImage(image.image, element);
    }
  });
  await tester.pumpAndSettle();
}

import 'package:flutter/material.dart';

import 'core/ui/ui.dart';

void main() {
  runApp(const PiemathApp());
}

/// Түр бүрхүүл — M0.5-д router, shell орж ирнэ.
class PiemathApp extends StatelessWidget {
  const PiemathApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppStrings.appName,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      home: const Scaffold(body: Center(child: BrandMark())),
    );
  }
}

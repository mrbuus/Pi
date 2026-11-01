import 'package:flutter/material.dart';

void main() {
  runApp(const PiemathApp());
}

/// Түр бүрхүүл — M0.3-д дизайны систем, M0.5-д router орж ирнэ.
class PiemathApp extends StatelessWidget {
  const PiemathApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: 'Piemath',
      home: Scaffold(body: Center(child: Text('Piemath'))),
    );
  }
}

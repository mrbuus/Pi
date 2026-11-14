import 'package:flutter/material.dart';

import '../../core/ui/ui.dart';
import 'app_shell.dart';

/// Апп-д хараахан натив хийгдээгүй хэсэг (PARITY.md-д «—»).
/// Функц хасахгүй (RULES §7). Апп хэрэглэгчийг вэб рүү ХЭЗЭЭ Ч явуулахгүй (эзэн 2026-11-10) — зөвхөн тайлбар.
class PendingScreen extends StatelessWidget {
  const PendingScreen({super.key, required this.path, this.title});

  /// Вэбийн ижил зам (`/app/...`) — аль хэсэг болохыг тэмдэглэхэд.
  final String path;
  final String? title;

  static const pendingTitle = 'Энэ хэсэг удахгүй апп-д нэмэгдэнэ';
  static const pendingMessage = 'Аппын шинэчлэлт гармагц энд нээгдэнэ';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: Text(title ?? AppStrings.appName)),
      body: const EmptyState(icon: AppIcons.info, title: pendingTitle, message: pendingMessage),
    );
  }
}

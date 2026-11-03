import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/env.dart';
import '../../core/ui/ui.dart';
import 'app_shell.dart';

/// Апп-д хараахан натив хийгдээгүй хэсэг (PARITY.md-д «—» эсвэл «↗»).
/// Функц хасахгүй (RULES §7) — оронд нь тайлбар + вэбээр нээх.
class PendingScreen extends StatelessWidget {
  const PendingScreen({super.key, required this.path, this.title});

  /// Вэбийн ижил зам (`/app/...`).
  final String path;
  final String? title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: Text(title ?? AppStrings.appName)),
      body: EmptyState(
        icon: AppIcons.info,
        title: 'Энэ хэсэг удахгүй апп-д нэмэгдэнэ',
        message: 'Одоогоор вэб хуудсаар ашиглах боломжтой',
        // Худалдан авалтын хуудас руу (дэлгүүр, ном, эрх) хөтлөхгүй — Apple 3.1.1 / Google Play Payments.
        action: _isPurchasePath(path)
            ? null
            : OutlinedButton.icon(
                icon: const Icon(AppIcons.forward, size: 18),
                label: const Text('Вэбээр нээх'),
                onPressed: () => launchUrl(Uri.parse('${Env.webBaseUrl}$path'), mode: LaunchMode.externalApplication),
              ),
      ),
    );
  }
}

bool _isPurchasePath(String path) =>
    const ['/app/store', '/store', '/app/buyer', '/books', '/app/passes'].any(path.startsWith);

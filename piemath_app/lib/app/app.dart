import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/network/network_providers.dart';
import '../core/perf/perf_tier.dart';
import '../core/ui/ui.dart';
import 'router.dart';
import 'theme_mode.dart';

/// Апп-ын үндэс: сэдэв, монгол locale, router, офлайн тууз.
class PiemathApp extends ConsumerWidget {
  const PiemathApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: AppStrings.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ref.watch(themeModeProvider),
      // Сул төхөөрөмжид цагаан/хар горим солиход ThemeData-г кадр бүрт lerp хийхгүй.
      themeAnimationDuration: ref.watch(perfTierProvider).isLow ? Duration.zero : kThemeAnimationDuration,
      locale: const Locale('mn'),
      supportedLocales: const [Locale('mn')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      routerConfig: ref.watch(routerProvider),
      builder: (context, child) => _OfflineFrame(child: child ?? const SizedBox.shrink()),
    );
  }
}

/// Сүлжээ тасарвал доод талд тууз. Тууз харагдах үед доорх агуулгын доод safe-area-г тууз эзэлнэ.
class _OfflineFrame extends ConsumerWidget {
  const _OfflineFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offline = !ref.watch(reachabilityProvider);
    // AppBar-гүй дэлгэцэд ч (нэвтрэх, splash) системийн мөр тунгалаг, дүрс нь сэдвийн өнгөөр.
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: AppTheme.systemBars(Theme.of(context).brightness),
      child: ColoredBox(
        color: context.colors.bg,
        child: Column(
          children: [
            Expanded(
              child: MediaQuery.removePadding(context: context, removeBottom: offline, child: child),
            ),
            ConnectionBanner(offline: offline),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'icons.dart';
import 'page_transitions.dart';
import 'tokens.dart';

/// Апп-ын `ThemeData` — цагаан ба хар горим. Өнгө бүгд [AppColors]-оос.
abstract final class AppTheme {
  static const bodyFont = 'Onest';

  /// Том тоо, гарчиг. Unbounded-д Ө ө Ү ү глиф байхгүй тул Onest руу fallback.
  static const displayFont = 'Unbounded';
  /// ₮ зэрэг Onest/Unbounded-д байхгүй тэмдэгт (системийн фонтоор холилдохгүй).
  static const symbolsFont = 'PiemathSymbols';
  static const _displayFallback = <String>[bodyFont, symbolsFont];

  static ThemeData light() => _build(AppColors.light, Brightness.light);

  static ThemeData dark() => _build(AppColors.dark, Brightness.dark);

  static ThemeData _build(AppColors c, Brightness brightness) {
    final scheme = ColorScheme(
      brightness: brightness,
      primary: c.brand,
      onPrimary: c.onBrand,
      primaryContainer: c.brandTint,
      onPrimaryContainer: c.brandSoft,
      secondary: c.brandBright,
      onSecondary: c.onBrand,
      error: c.error,
      onError: c.onStatus,
      surface: c.surface,
      onSurface: c.ink,
      onSurfaceVariant: c.inkDim,
      surfaceContainerLowest: c.surface,
      surfaceContainerLow: c.surface,
      surfaceContainer: c.surface,
      surfaceContainerHigh: c.surface,
      surfaceContainerHighest: c.surfaceSunken,
      outline: c.line,
      outlineVariant: c.line,
      shadow: Colors.transparent,
      scrim: AppColors.scrim,
      inverseSurface: c.ink,
      onInverseSurface: c.surface,
      inversePrimary: c.brandBright,
      surfaceTint: Colors.transparent,
    );

    final text = _textTheme(c);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      fontFamily: bodyFont,
      fontFamilyFallback: const [symbolsFont],
      textTheme: text,
      scaffoldBackgroundColor: c.bg,
      canvasColor: c.bg,
      dividerColor: c.line,
      splashFactory: InkRipple.splashFactory,
      materialTapTargetSize: MaterialTapTargetSize.padded,
      visualDensity: VisualDensity.standard,
      extensions: <ThemeExtension<dynamic>>[c],
      // Хуудасны шилжилт төхөөрөмжийн түвшнээр (shared-axis / гулсах, predictive back).
      pageTransitionsTheme: AppPageTransitions.theme(),
      // Автомат «буцах» товч Lucide дүрстэй (Material сум биш).
      actionIconTheme: ActionIconThemeData(backButtonIconBuilder: (_) => const Icon(AppIcons.back)),
      appBarTheme: AppBarTheme(
        backgroundColor: c.bg,
        foregroundColor: c.ink,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: text.titleLarge?.copyWith(fontSize: 20, fontWeight: FontWeight.w700),
        systemOverlayStyle: systemBars(brightness),
      ),
      dividerTheme: DividerThemeData(color: c.line, thickness: 1, space: 1),
      cardTheme: CardThemeData(
        color: c.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.xl),
          side: BorderSide(color: c.line, width: 1.5),
        ),
      ),
      // Шүүлтүүр, сонголтын chip: сонгогдсон нь цайвар хөх + хөх бичвэр (дүүрэн хөх биш), бусад нь хүрээтэй цагаан.
      chipTheme: ChipThemeData(
        backgroundColor: c.surface,
        selectedColor: c.brandTint,
        disabledColor: c.surfaceSunken,
        checkmarkColor: c.brand,
        side: WidgetStateBorderSide.resolveWith(
          (s) => BorderSide(color: s.contains(WidgetState.selected) ? c.brand : c.line, width: 1.5),
        ),
        labelStyle: text.labelLarge?.copyWith(color: c.ink),
        secondaryLabelStyle: text.labelLarge?.copyWith(color: c.brand),
        iconTheme: IconThemeData(color: c.inkDim, size: 16),
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: 6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.pill)),
        showCheckmark: true,
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.brandTint : c.surface),
          foregroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.brand : c.ink),
          side: WidgetStatePropertyAll(BorderSide(color: c.line, width: 1.5)),
          textStyle: WidgetStatePropertyAll(text.labelLarge),
          minimumSize: const WidgetStatePropertyAll(Size(AppSizes.minTap, AppSizes.minTap)),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: c.brand,
          foregroundColor: c.onBrand,
          disabledBackgroundColor: c.line,
          disabledForegroundColor: c.inkDim,
          minimumSize: const Size(AppSizes.minTap, 48),
          padding: const EdgeInsets.symmetric(horizontal: 20),
          textStyle: text.labelLarge,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: c.ink,
          side: BorderSide(color: c.line, width: 1.5),
          minimumSize: const Size(AppSizes.minTap, 48),
          padding: const EdgeInsets.symmetric(horizontal: 20),
          textStyle: text.labelLarge,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: c.brand,
          minimumSize: const Size(AppSizes.minTap, AppSizes.minTap),
          textStyle: text.labelLarge,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(foregroundColor: c.ink, minimumSize: const Size(AppSizes.minTap, AppSizes.minTap)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.surface,
        isDense: false,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        labelStyle: text.bodyMedium?.copyWith(color: c.inkDim),
        floatingLabelStyle: text.bodyMedium?.copyWith(color: c.brand),
        hintStyle: text.bodyMedium?.copyWith(color: c.inkDim),
        errorStyle: text.bodySmall?.copyWith(color: c.error),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: c.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: c.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: c.brand, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: c.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: c.error, width: 2),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: c.brandTint,
        elevation: 0,
        height: 64,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        iconTheme: WidgetStateProperty.resolveWith(
          (s) => IconThemeData(size: 22, color: s.contains(WidgetState.selected) ? c.brand : c.inkDim),
        ),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (s) => text.labelSmall?.copyWith(
            color: s.contains(WidgetState.selected) ? c.brand : c.inkDim,
            fontWeight: s.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: c.surface,
        indicatorColor: c.brandTint,
        selectedIconTheme: IconThemeData(color: c.brand, size: 22),
        unselectedIconTheme: IconThemeData(color: c.inkDim, size: 22),
        selectedLabelTextStyle: text.labelMedium?.copyWith(color: c.brand, fontWeight: FontWeight.w600),
        unselectedLabelTextStyle: text.labelMedium?.copyWith(color: c.inkDim),
        labelType: NavigationRailLabelType.all,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: c.ink,
        contentTextStyle: text.bodyMedium?.copyWith(color: c.surface),
        actionTextColor: c.brandBright,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        dragHandleColor: c.line,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: text.titleLarge,
        contentTextStyle: text.bodyMedium,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: c.brand,
        linearTrackColor: c.line,
        circularTrackColor: c.line,
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? c.brand : Colors.transparent,
        ),
        checkColor: WidgetStatePropertyAll(c.onBrand),
        side: BorderSide(color: c.inkDim, width: 1.5),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.onBrand : c.inkDim),
        trackColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? c.brand : c.surfaceSunken,
        ),
        trackOutlineColor: WidgetStatePropertyAll(c.line),
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(color: c.ink, borderRadius: BorderRadius.circular(AppRadius.sm)),
        textStyle: text.bodySmall?.copyWith(color: c.surface),
      ),
      listTileTheme: ListTileThemeData(
        iconColor: c.inkDim,
        textColor: c.ink,
        minVerticalPadding: 10,
        contentPadding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
      ),
    );
  }

  /// Edge-to-edge (Android 15+ заавал, доод хувилбарт ч ижил): тунгалаг статус, навигацийн мөр,
  /// дүрсний өнгө сэдвээр. Агуулга safe-area-г `SafeArea`/`AppBar`/`NavigationBar`-аар тойрно.
  static SystemUiOverlayStyle systemBars(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    return SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarDividerColor: Colors.transparent,
      systemNavigationBarContrastEnforced: false,
      statusBarIconBrightness: dark ? Brightness.light : Brightness.dark,
      statusBarBrightness: brightness,
      systemNavigationBarIconBrightness: dark ? Brightness.light : Brightness.dark,
    );
  }

  static TextTheme _textTheme(AppColors c) {
    TextStyle body(double size, FontWeight w, {double height = 1.5}) =>
        TextStyle(
          fontFamily: bodyFont,
          fontFamilyFallback: const [symbolsFont],
          fontSize: size,
          fontWeight: w,
          height: height,
          color: c.ink,
          letterSpacing: 0,
        );
    TextStyle display(double size) => TextStyle(
      fontFamily: displayFont,
      fontFamilyFallback: _displayFallback,
      fontSize: size,
      fontWeight: FontWeight.w600,
      height: 1.2,
      color: c.ink,
      letterSpacing: 0,
    );
    return TextTheme(
      // Том тоо, оноо, нүүрний гарчиг — Unbounded.
      displayLarge: display(40),
      displayMedium: display(32),
      displaySmall: display(26),
      // Хуудас, хэсгийн гарчиг — Onest (кирилл гарчиг Unbounded-д өргөн, 375px-д багтахгүй).
      headlineLarge: body(26, FontWeight.w700, height: 1.25),
      headlineMedium: body(22, FontWeight.w700, height: 1.3),
      headlineSmall: body(20, FontWeight.w700, height: 1.3),
      titleLarge: body(18, FontWeight.w600, height: 1.35),
      titleMedium: body(16, FontWeight.w600, height: 1.4),
      titleSmall: body(14, FontWeight.w600, height: 1.4),
      // Бичвэр 16-аас багагүй (вэбийн --text-base).
      bodyLarge: body(16, FontWeight.w400),
      bodyMedium: body(15, FontWeight.w400),
      bodySmall: body(13, FontWeight.w400, height: 1.45).copyWith(color: c.inkDim),
      labelLarge: body(15, FontWeight.w600, height: 1.2),
      labelMedium: body(13, FontWeight.w500, height: 1.2),
      labelSmall: body(12, FontWeight.w500, height: 1.2),
    );
  }
}

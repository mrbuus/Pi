import 'package:flutter/material.dart';

/// Дизайны токенууд — апп-д өнгийг ЗӨВХӨН эндээс авна (RULES.md §3).
///
/// Нэрс нь вэбийн `globals.css`-ийн токентой ижил утгатай (`bg`, `surface`, `line`, `ink`,
/// `inkDim`, `brand` …) тул хоёр кодын санг харьцуулахад төөрөхгүй.
///
/// Апп-ын өнгө логоны хар хөх `#273F74`-оос гаргасан (эзэн 2026-11-01):
/// үндсэн хөх + цагаан, зөөлөн цэнхэр `#AFC4EF`, тодотгол `#76B6F7`.
/// **Шар/алтан өнгө ХОРИОТОЙ.** Өнгөт дэвсгэртэй карт ХОРИОТОЙ — карт саарал/цагаан,
/// өнгө зөвхөн төлөвийн дүрс, жижиг тэмдэгт.
///
/// Контраст `surface` дээр (WCAG AA 4.5:1-ээс багагүй, `test/core/ui/tokens_test.dart` шалгана):
/// цагаан горим — ink 18.0, inkDim 7.4, brand 10.2, success 5.4, warning 5.5, error 6.5, info 6.5;
/// хар горим — ink 13.9, inkDim 7.9, brand 9.5, success 8.7, warning 7.9, error 7.0, info 8.9.
@immutable
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.bg,
    required this.surface,
    required this.surfaceSunken,
    required this.line,
    required this.ink,
    required this.inkDim,
    required this.brand,
    required this.brandBright,
    required this.brandSoft,
    required this.brandTint,
    required this.onBrand,
    required this.logo,
    required this.success,
    required this.warning,
    required this.error,
    required this.info,
    required this.onStatus,
    required this.skeleton,
    required this.focus,
  });

  /// Хуудасны дэвсгэр.
  final Color bg;

  /// Карт, самбар (цагаан / хар горимд бараан саарал).
  final Color surface;

  /// Картын доторх бүлэглэл, оролтын талбарын дэвсгэр (маш бага ялгаатай саарал).
  final Color surfaceSunken;

  /// Хүрээ, хуваагч зураас.
  final Color line;

  /// Үндсэн бичвэр.
  final Color ink;

  /// Туслах бичвэр (огноо, мета).
  final Color inkDim;

  /// Брэндийн үндсэн хөх — товч, идэвхтэй таб, холбоос.
  final Color brand;

  /// Тодотгол — фокус, сонгогдсон төлөвийн зураас.
  final Color brandBright;

  /// Брэндийн зөөлөн өнгө — бичвэрт (гарчгийн тодотгол).
  final Color brandSoft;

  /// Маш цайвар хөх — сонгогдсон навигацийн «pill», жижиг тэмдэг. Картын дэвсгэр БИШ.
  final Color brandTint;

  /// Брэндийн өнгөт дэвсгэр дээрх бичвэр/дүрс.
  final Color onBrand;

  /// Логоны өнгө (танхимын дүрс, тэмдэг).
  final Color logo;

  final Color success;
  final Color warning;
  final Color error;
  final Color info;

  /// success/warning/error/info дэвсгэр дээрх бичвэр.
  final Color onStatus;

  /// Ачаалж буй (skeleton) хайрцгийн өнгө.
  final Color skeleton;

  /// Гарнаас удирдах үеийн фокусын хүрээ.
  final Color focus;

  static const light = AppColors(
    // Саарал нь брэндийн өнгөний тойрог (OKLCH h≈264) руу бага зэрэг хазайсан —
    // «хар-цагаан» биш тайван хүйтэн саарал (UX-RESEARCH §2).
    bg: Color(0xFFF5F7FB),
    surface: Color(0xFFFFFFFF),
    surfaceSunken: Color(0xFFEBEFF5),
    line: Color(0xFFD7DBE3),
    ink: Color(0xFF181E2A),
    inkDim: Color(0xFF4E5564),
    brand: Color(0xFF273F74),
    brandBright: Color(0xFF3D6BC4),
    brandSoft: Color(0xFF1E3366),
    brandTint: Color(0xFFE3EBFA),
    onBrand: Color(0xFFFFFFFF),
    logo: Color(0xFF273F74),
    success: Color(0xFF1E7A35),
    warning: Color(0xFFB04A0C),
    error: Color(0xFFB3261E),
    info: Color(0xFF0B5FA8),
    onStatus: Color(0xFFFFFFFF),
    skeleton: Color(0xFFE6E9EE),
    focus: Color(0xFF76B6F7),
  );

  static const dark = AppColors(
    bg: Color(0xFF0F1319),
    surface: Color(0xFF1A1E26),
    surfaceSunken: Color(0xFF15181F),
    line: Color(0xFF383D48),
    ink: Color(0xFFE3E6ED),
    inkDim: Color(0xFFB2B8C3),
    brand: Color(0xFFAFC4EF),
    brandBright: Color(0xFF76B6F7),
    brandSoft: Color(0xFFC9D7F5),
    brandTint: Color(0xFF1E2B47),
    onBrand: Color(0xFF0F1D3A),
    logo: Color(0xFF9AB7F2),
    success: Color(0xFF6FCF8F),
    warning: Color(0xFFF2A066),
    error: Color(0xFFF28B82),
    info: Color(0xFF7FC4FF),
    onStatus: Color(0xFF111317),
    skeleton: Color(0xFF262A31),
    focus: Color(0xFF76B6F7),
  );

  /// Логоны дугуй дэвсгэр (хоёр горимд ижил — лого өөрөө).
  static const logoNavy = Color(0xFF273F74);

  /// Модал, sheet-ийн ард бүдгэрүүлэх давхарга.
  static const scrim = Color(0x99000000);

  @override
  AppColors copyWith({
    Color? bg,
    Color? surface,
    Color? surfaceSunken,
    Color? line,
    Color? ink,
    Color? inkDim,
    Color? brand,
    Color? brandBright,
    Color? brandSoft,
    Color? brandTint,
    Color? onBrand,
    Color? logo,
    Color? success,
    Color? warning,
    Color? error,
    Color? info,
    Color? onStatus,
    Color? skeleton,
    Color? focus,
  }) {
    return AppColors(
      bg: bg ?? this.bg,
      surface: surface ?? this.surface,
      surfaceSunken: surfaceSunken ?? this.surfaceSunken,
      line: line ?? this.line,
      ink: ink ?? this.ink,
      inkDim: inkDim ?? this.inkDim,
      brand: brand ?? this.brand,
      brandBright: brandBright ?? this.brandBright,
      brandSoft: brandSoft ?? this.brandSoft,
      brandTint: brandTint ?? this.brandTint,
      onBrand: onBrand ?? this.onBrand,
      logo: logo ?? this.logo,
      success: success ?? this.success,
      warning: warning ?? this.warning,
      error: error ?? this.error,
      info: info ?? this.info,
      onStatus: onStatus ?? this.onStatus,
      skeleton: skeleton ?? this.skeleton,
      focus: focus ?? this.focus,
    );
  }

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return AppColors(
      bg: l(bg, other.bg),
      surface: l(surface, other.surface),
      surfaceSunken: l(surfaceSunken, other.surfaceSunken),
      line: l(line, other.line),
      ink: l(ink, other.ink),
      inkDim: l(inkDim, other.inkDim),
      brand: l(brand, other.brand),
      brandBright: l(brandBright, other.brandBright),
      brandSoft: l(brandSoft, other.brandSoft),
      brandTint: l(brandTint, other.brandTint),
      onBrand: l(onBrand, other.onBrand),
      logo: l(logo, other.logo),
      success: l(success, other.success),
      warning: l(warning, other.warning),
      error: l(error, other.error),
      info: l(info, other.info),
      onStatus: l(onStatus, other.onStatus),
      skeleton: l(skeleton, other.skeleton),
      focus: l(focus, other.focus),
    );
  }
}

/// Зай (4dp сүлжээ).
abstract final class AppSpace {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;

  /// Утасны хажуугийн зай (вэбийн 375px дээрх 16px-тэй ижил).
  static const double gutter = 16;
}

/// Булангийн радиус.
abstract final class AppRadius {
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double pill = 999;
}

/// Хэмнэл — вэбийн `--dur-micro/base/enter`.
abstract final class AppMotion {
  static const micro = Duration(milliseconds: 120);
  static const base = Duration(milliseconds: 180);
  static const enter = Duration(milliseconds: 260);

  /// Хөдөлгөөн багасгах тохиргоо: Android «Remove animations» (`disableAnimations`)
  /// эсвэл iOS «Reduce Motion» (`accessibilityFeatures.reduceMotion`).
  static bool reduced(BuildContext context) =>
      (MediaQuery.maybeDisableAnimationsOf(context) ?? false) ||
      WidgetsBinding.instance.platformDispatcher.accessibilityFeatures.reduceMotion;

  /// Хөдөлгөөн багасгах үед анимацгүй.
  static Duration of(BuildContext context, Duration d) => reduced(context) ? Duration.zero : d;
}

/// Хэмжээний хязгаар.
abstract final class AppSizes {
  /// Хүрэх талбайн доод хэмжээ — Material 48dp (хүүхэд гараа илүү алддаг, UX-RESEARCH §2).
  static const double minTap = 48;

  /// Таблетын хил: үүнээс өргөн бол зүүн rail цэс.
  static const double tabletBreakpoint = 768;

  /// Унших бичвэрийн дээд өргөн (вэбийн `--measure` ~68ch).
  static const double readableWidth = 720;
}

extension AppThemeX on BuildContext {
  /// `context.colors.ink` гэх мэт.
  AppColors get colors => Theme.of(this).extension<AppColors>()!;

  TextTheme get text => Theme.of(this).textTheme;
}
